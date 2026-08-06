# 오늘의 카드 미션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 홈에서 매일 쉬움·보통·어려움 미션 3개 중 하나를 선택하고, 당일 누적 운동 기록으로 자동 완료해 미션 보너스팩을 받도록 한다.

**Architecture:** 미션 생성과 완료 판정은 `src/game/dailyMission.ts`의 순수 함수로 분리한다. 선택·완료·보상 지급 상태는 `AppState.dailyMissions`에 저장하고, `GameContext` reducer가 운동 기록 저장 직후 완료 여부를 재계산해 보너스팩을 한 번만 지급한다. 홈에서는 별도 탭 없이 바텀시트로 선택하고 선택 후에는 진행 카드 하나만 보여준다.

**Tech Stack:** React 19, TypeScript 6, Vite 8, localStorage, Vitest, Testing Library

## Global Constraints

- 하루 기준은 사용자의 로컬 날짜 `YYYY-MM-DD`다.
- 매일 쉬움·보통·어려움 미션을 각각 1개씩 생성한다.
- 최근 14일 운동 기록을 사용하되 기록이 2회 미만이면 기본 미션 구성을 사용한다.
- 쉬움은 익숙한 카테고리 1종, 보통은 다른 익숙한 카테고리 2종, 어려움은 오늘의 집중 세트 운동 2종이다.
- 사용자 운동은 `기타` 카테고리 미션에서만 카테고리 미션에 포함한다.
- 사용자는 첫 운동 기록을 시작하기 전에 미션 하나를 선택해야 한다.
- 선택한 미션은 당일 변경·취소할 수 없다.
- 당일 여러 운동 기록을 합산해 서로 다른 운동 ID 수로 완료 여부를 계산한다.
- 완료 즉시 미션 보너스팩 1개를 자동 지급한다.
- 동일 날짜·동일 미션의 보상은 한 번만 지급한다.
- 미션 보너스팩 확률은 일반 50%, 레어 35%, 슈퍼레어 13%, 레전더리 2%다.
- 일반 운동팩과 세트 완성 특별상자의 확률·천장·중복 성장 규칙은 변경하지 않는다.
- 새로운 재화와 새로운 탭을 만들지 않는다.

---

## File Structure

- Create: `src/game/dailyMission.ts` — 날짜, 최근 기록 분석, 미션 생성, 누적 진행과 완료 판정 순수 함수.
- Create: `src/game/dailyMission.test.ts` — 생성 규칙, 기본 폴백, 중복 방지, 완료 판정 테스트.
- Modify: `src/types/index.ts` — 미션 정의·일일 상태·팩 출처 타입 확장.
- Modify: `src/store/storage.ts` — `dailyMissions` 초기값과 기존 저장 데이터 마이그레이션.
- Modify: `src/store/storage.test.ts` — 미션 상태 마이그레이션 회귀 테스트.
- Modify: `src/store/GameContext.tsx` — 미션 선택, 운동 기록 후 누적 판정, 자동 보너스팩 지급.
- Create: `src/store/GameContext.dailyMission.test.tsx` — 선택 잠금, 누적 완료, 중복 보상 방지 통합 테스트.
- Modify: `src/game/cardDraw.ts` — 미션 보너스팩 전용 확률 프로필 지원.
- Modify: `src/data/packs.ts` — `pack-daily-mission` 정의 추가.
- Create: `src/screens/DailyMissionSheet.tsx` — 3개 미션 선택 바텀시트.
- Create: `src/screens/DailyMissionSheet.css` — 모바일 바텀시트와 미션 카드 스타일.
- Modify: `src/screens/HomeScreen.tsx` — 기록 버튼 진입 차단, 바텀시트, 선택 미션 진행 카드.
- Modify: `src/screens/HomeScreen.css` — 미션 진행 카드와 바텀시트 진입 스타일.
- Modify: `src/screens/PackOpeningScreen.tsx` 또는 `src/screens/ComboPackOpeningScreen.tsx` — 미션 보너스팩 출처 문구 표시.

---

### Task 1: 미션 타입과 생성·완료 순수 로직

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/game/dailyMission.ts`
- Create: `src/game/dailyMission.test.ts`

**Interfaces:**
- Produces: `DailyMissionDifficulty = 'easy' | 'normal' | 'hard'`
- Produces: `DailyMissionKind = 'category-one' | 'category-two' | 'any-two' | 'focus-set-two'`
- Produces: `DailyMissionDefinition`
- Produces: `DailyMissionDayState`
- Produces: `generateDailyMissions(date: string, workoutLogs: WorkoutLog[], focusSetId: string): DailyMissionDefinition[]`
- Produces: `evaluateDailyMission(mission: DailyMissionDefinition, date: string, workoutLogs: WorkoutLog[]): { current: number; target: number; completed: boolean }`

- [ ] **Step 1: 타입 실패 테스트를 작성한다**

`src/game/dailyMission.test.ts`에 다음 사례를 작성한다.

```ts
import { describe, expect, it } from 'vitest';
import type { WorkoutLog } from '../types';
import { evaluateDailyMission, generateDailyMissions } from './dailyMission';

const log = (date: string, exerciseIds: string[]): WorkoutLog => ({
  id: `log-${date}-${exerciseIds.join('-')}`,
  date,
  entries: exerciseIds.map((exerciseId) => ({ exerciseId })),
  feeling: 'easy',
  grantedPackIds: [],
  createdAt: `${date}T09:00:00.000Z`,
});

describe('generateDailyMissions', () => {
  it('항상 쉬움·보통·어려움 3개를 만든다', () => {
    const missions = generateDailyMissions('2026-08-05', [], 'lower-body');
    expect(missions.map((mission) => mission.difficulty)).toEqual(['easy', 'normal', 'hard']);
  });

  it('최근 기록이 2회 미만이면 기본 미션을 사용한다', () => {
    const missions = generateDailyMissions('2026-08-05', [log('2026-08-04', ['treadmill'])], 'lower-body');
    expect(missions[0]).toMatchObject({ kind: 'category-one', category: 'cardio', targetCount: 1 });
    expect(missions[1]).toMatchObject({ kind: 'any-two', targetCount: 2 });
    expect(missions[2]).toMatchObject({ kind: 'focus-set-two', focusSetId: 'lower-body', targetCount: 2 });
  });

  it('최근 14일 빈도 상위 두 카테고리를 쉬움과 보통에 사용한다', () => {
    const logs = [
      log('2026-08-04', ['leg-press', 'leg-curl']),
      log('2026-08-03', ['leg-extension']),
      log('2026-08-02', ['treadmill']),
      log('2026-08-01', ['stationary-bike']),
    ];
    const missions = generateDailyMissions('2026-08-05', logs, 'back-pull');
    expect(missions[0].category).toBe('legs');
    expect(missions[1].category).toBe('cardio');
  });
});

describe('evaluateDailyMission', () => {
  it('당일 여러 기록의 서로 다른 운동 ID를 합산한다', () => {
    const mission = {
      id: '2026-08-05-normal-legs',
      date: '2026-08-05',
      difficulty: 'normal',
      kind: 'category-two',
      title: '하체 운동 2종 기록',
      description: '서로 다른 하체 운동을 2종 기록하세요.',
      rewardPackDefId: 'pack-daily-mission',
      targetCount: 2,
      category: 'legs',
    } as const;
    const result = evaluateDailyMission(mission, '2026-08-05', [
      log('2026-08-05', ['leg-press']),
      log('2026-08-05', ['leg-curl']),
    ]);
    expect(result).toEqual({ current: 2, target: 2, completed: true });
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/game/dailyMission.test.ts`

Expected: 미션 타입과 함수가 없어 FAIL.

- [ ] **Step 3: 타입을 추가한다**

`src/types/index.ts`에 다음을 추가한다.

```ts
export type DailyMissionDifficulty = 'easy' | 'normal' | 'hard';
export type DailyMissionKind = 'category-one' | 'category-two' | 'any-two' | 'focus-set-two';

export interface DailyMissionDefinition {
  id: string;
  date: string;
  difficulty: DailyMissionDifficulty;
  kind: DailyMissionKind;
  title: string;
  description: string;
  rewardPackDefId: 'pack-daily-mission';
  targetCount: number;
  category?: ExerciseCategory;
  focusSetId?: string;
}

export interface DailyMissionDayState {
  date: string;
  missions: DailyMissionDefinition[];
  selectedMissionId?: string;
  selectedAt?: string;
  completedAt?: string;
  rewardPackId?: string;
}
```

- [ ] **Step 4: 최소 순수 로직을 구현한다**

`src/game/dailyMission.ts`는 `EXERCISES_BY_ID`, `CARD_SETS_BY_ID`, 로컬 날짜 문자열을 사용해 다음 규칙을 구현한다.

```ts
export function generateDailyMissions(
  date: string,
  workoutLogs: WorkoutLog[],
  focusSetId: string,
): DailyMissionDefinition[];

export function evaluateDailyMission(
  mission: DailyMissionDefinition,
  date: string,
  workoutLogs: WorkoutLog[],
): { current: number; target: number; completed: boolean };
```

구현 세부 규칙:

```ts
const recentStart = new Date(`${date}T00:00:00`);
recentStart.setDate(recentStart.getDate() - 13);
```

- 최근 14일은 기준일 포함 14일이다.
- 카테고리 빈도는 기록 항목 수가 아니라 해당 카테고리가 등장한 기록 횟수로 계산한다.
- 한 기록에 같은 카테고리 운동이 여러 개 있어도 그 카테고리 빈도는 1만 증가한다.
- 기본 미션은 `cardio 1종`, `전체 2종`, `오늘의 집중 세트 2종`이다.
- 최근 기록 2회 이상이면 빈도 1위 카테고리 1종, 빈도 2위 카테고리 2종을 사용한다.
- 2위가 없으면 `cardio`, `legs`, `back`, `chest`, `shoulders`, `stretching`, `etc` 순서로 1위와 다른 카테고리를 선택한다.
- 어려움 미션은 `CARD_SETS_BY_ID[focusSetId].cardIds`를 운동 ID로 변환해 서로 다른 운동 2개를 요구한다.
- `category-one`, `category-two`, `any-two`, `focus-set-two`는 모두 당일 서로 다른 운동 ID 수로 판정한다.

- [ ] **Step 5: 테스트와 빌드를 실행한다**

Run: `npm test -- src/game/dailyMission.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add src/types/index.ts src/game/dailyMission.ts src/game/dailyMission.test.ts
git commit -m "feat: add daily mission generation rules"
```

---

### Task 2: 저장 상태와 마이그레이션

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/storage.ts`
- Modify: `src/store/storage.test.ts`

**Interfaces:**
- Consumes: `DailyMissionDayState`
- Produces: `AppState.dailyMissions: Record<string, DailyMissionDayState>`

- [ ] **Step 1: 마이그레이션 실패 테스트를 추가한다**

`src/store/storage.test.ts`에 다음을 추가한다.

```ts
it('초기 상태에 빈 일일 미션 맵을 포함한다', () => {
  expect(createInitialState().dailyMissions).toEqual({});
});

it('이전 저장 데이터에 dailyMissions가 없으면 빈 객체를 채운다', () => {
  const oldState = createInitialState() as Record<string, unknown>;
  delete oldState.dailyMissions;
  localStorage.setItem('workout-card-game:v1', JSON.stringify(oldState));
  expect(loadState()?.dailyMissions).toEqual({});
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/store/storage.test.ts`

Expected: `dailyMissions`가 없어 FAIL.

- [ ] **Step 3: 상태와 마이그레이션을 구현한다**

`AppState`에 추가한다.

```ts
dailyMissions: Record<string, DailyMissionDayState>;
```

`migrateState`에 추가한다.

```ts
if (!parsed.dailyMissions || typeof parsed.dailyMissions !== 'object') {
  parsed.dailyMissions = {};
}
```

`createInitialState`에 추가한다.

```ts
dailyMissions: {},
```

- [ ] **Step 4: 테스트와 빌드를 실행한다**

Run: `npm test -- src/store/storage.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add src/types/index.ts src/store/storage.ts src/store/storage.test.ts
git commit -m "feat: persist daily mission state"
```

---

### Task 3: 미션 선택, 누적 완료, 자동 보상 reducer

**Files:**
- Modify: `src/store/GameContext.tsx`
- Create: `src/store/GameContext.dailyMission.test.tsx`

**Interfaces:**
- Consumes: `generateDailyMissions`, `evaluateDailyMission`, `getDailyFocusSet`
- Produces: `selectDailyMission(missionId: string): void`
- Produces: `todayMissionState: DailyMissionDayState`
- Produces: `selectedDailyMission: DailyMissionDefinition | null`
- Produces: `dailyMissionProgress: { current: number; target: number; completed: boolean } | null`

- [ ] **Step 1: Context 통합 실패 테스트를 작성한다**

테스트 harness로 다음을 검증한다.

```ts
it('오늘 미션을 한 번 선택하면 다른 미션으로 변경할 수 없다', async () => {
  // todayMissionState.missions[0] 선택
  // 다른 mission id로 selectDailyMission 호출
  // selectedMissionId가 첫 번째 id로 유지되는지 확인
});

it('당일 여러 기록을 합산해 완료 즉시 미션 보너스팩을 한 번 지급한다', async () => {
  // 하체 2종 미션 선택
  // 첫 기록 leg-press 완료: 미완료, 보너스팩 없음
  // 둘째 기록 leg-curl 완료: completedAt 존재, source mission 팩 1개
  // 셋째 기록 추가: source mission 팩 여전히 1개
});

it('이미 오늘 운동 기록이 있는데 미션 선택이 없으면 당일 선택을 막는다', async () => {
  // 미션 선택 없이 기존 오늘 log가 들어 있는 초기 상태 사용
  // selectDailyMission 호출
  // selectedMissionId가 비어 있는지 확인
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/store/GameContext.dailyMission.test.tsx`

Expected: Context API와 reducer 동작이 없어 FAIL.

- [ ] **Step 3: Context 초기 파생 상태를 구현한다**

`GameProvider`에서 로컬 날짜를 구하고 해당 날짜 미션이 없으면 `generateDailyMissions` 결과로 화면용 `todayMissionState`를 만든다. 선택 시 reducer에 전체 당일 상태를 저장한다.

```ts
type Action =
  | { type: 'SELECT_DAILY_MISSION'; day: DailyMissionDayState; missionId: string; selectedAt: string }
  | 기존 액션;
```

선택 reducer 규칙:

```ts
const existing = state.dailyMissions[action.day.date];
if (existing?.selectedMissionId) return state;
if (state.workoutLogs.some((log) => log.date === action.day.date)) return state;
if (!action.day.missions.some((mission) => mission.id === action.missionId)) return state;
```

- [ ] **Step 4: 운동 완료 후 미션 판정과 보상 지급을 구현한다**

`COMPLETE_WORKOUT` reducer에서 새 로그까지 포함한 `nextWorkoutLogs`를 만든 뒤 선택 미션을 평가한다.

완료 전환 조건:

```ts
const shouldReward =
  selectedMission &&
  !dayState.completedAt &&
  !dayState.rewardPackId &&
  progress.completed;
```

보너스팩 생성:

```ts
const missionPack: GrantedPack = {
  id: uid('pack'),
  packDefId: 'pack-daily-mission',
  grantedAt: now.toISOString(),
  source: 'daily-mission',
  sourceMissionId: selectedMission.id,
};
```

`DailyMissionDayState`에 `completedAt`과 `rewardPackId`를 동시에 저장한다. 이후 기록에서는 기존 값을 유지한다.

- [ ] **Step 5: 파생 API를 Context에 공개한다**

```ts
selectDailyMission: (missionId: string) => void;
todayMissionState: DailyMissionDayState;
selectedDailyMission: DailyMissionDefinition | null;
dailyMissionProgress: { current: number; target: number; completed: boolean } | null;
canSelectDailyMission: boolean;
```

`canSelectDailyMission`은 오늘 선택 없음 AND 오늘 운동 기록 없음일 때만 `true`다.

- [ ] **Step 6: 테스트와 빌드를 실행한다**

Run: `npm test -- src/store/GameContext.dailyMission.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add src/store/GameContext.tsx src/store/GameContext.dailyMission.test.tsx
git commit -m "feat: complete and reward daily missions"
```

---

### Task 4: 미션 보너스팩 확률과 출처

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/data/packs.ts`
- Modify: `src/game/cardDraw.ts`
- Modify: `src/game/cardDraw.test.ts` 또는 Create: `src/game/dailyMissionPack.test.ts`

**Interfaces:**
- Extends: `PackSource` with `'daily-mission'`
- Extends: `GrantedPack.sourceMissionId?: string`
- Produces: `drawMissionBonusCard(legendaryPityCounter: number): DrawResult`

- [ ] **Step 1: 확률 프로필 실패 테스트를 작성한다**

랜덤 값을 stub해 경계값을 검증한다.

```ts
it('미션 보너스팩은 일반 50%, 레어 35%, 슈퍼레어 13%, 레전더리 2% 경계를 사용한다', () => {
  vi.spyOn(Math, 'random').mockReturnValueOnce(0.49).mockReturnValueOnce(0);
  expect(drawMissionBonusCard(0).card.rarity).toBe('common');

  vi.spyOn(Math, 'random').mockReturnValueOnce(0.50).mockReturnValueOnce(0);
  expect(drawMissionBonusCard(0).card.rarity).toBe('rare');

  vi.spyOn(Math, 'random').mockReturnValueOnce(0.85).mockReturnValueOnce(0);
  expect(drawMissionBonusCard(0).card.rarity).toBe('super-rare');

  vi.spyOn(Math, 'random').mockReturnValueOnce(0.98).mockReturnValueOnce(0);
  expect(drawMissionBonusCard(0).card.rarity).toBe('legendary');
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/game/dailyMissionPack.test.ts`

Expected: 함수와 팩 정의가 없어 FAIL.

- [ ] **Step 3: 팩 정의와 타입을 추가한다**

`PACKS`에 추가한다.

```ts
{
  id: 'pack-daily-mission',
  type: 'special-challenge',
  name: '오늘의 미션 보너스팩',
  packAsset: 'pack-special-challenge',
  favoredCategories: [],
}
```

`PackSource`에 `'daily-mission'`을 추가하고 `GrantedPack`에 다음을 추가한다.

```ts
sourceMissionId?: string;
```

- [ ] **Step 4: 전용 추첨 함수를 구현한다**

`cardDraw.ts`에 정확한 누적 확률을 사용한다.

```ts
const DAILY_MISSION_RATES: Record<CardRarity, number> = {
  common: 0.5,
  rare: 0.35,
  'super-rare': 0.13,
  legendary: 0.02,
};

export function drawMissionBonusCard(legendaryPityCounter: number): DrawResult;
```

천장 발동 시 기존 천장 로직을 우선하고, 카드 풀 선택은 해당 등급 전체 풀에서 균등하게 한다.

- [ ] **Step 5: OPEN_PACK 분기를 연결한다**

`GameContext`의 `OPEN_PACK`에서 다음 분기를 사용한다.

```ts
const result = pack.source === 'daily-mission'
  ? drawMissionBonusCard(state.user.legendaryPityCounter)
  : 기존 일반 또는 세트 완성 추첨;
```

- [ ] **Step 6: 테스트와 빌드를 실행한다**

Run: `npm test -- src/game/dailyMissionPack.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add src/types/index.ts src/data/packs.ts src/game/cardDraw.ts src/game/dailyMissionPack.test.ts src/store/GameContext.tsx
git commit -m "feat: add daily mission bonus pack"
```

---

### Task 5: 홈 미션 선택 바텀시트와 진행 카드

**Files:**
- Create: `src/screens/DailyMissionSheet.tsx`
- Create: `src/screens/DailyMissionSheet.css`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/HomeScreen.css`
- Test: `src/screens/HomeScreen.dailyMission.test.tsx`

**Interfaces:**
- Consumes: `todayMissionState`, `selectedDailyMission`, `dailyMissionProgress`, `canSelectDailyMission`, `selectDailyMission`
- Produces: `DailyMissionSheet`

- [ ] **Step 1: UI 실패 테스트를 작성한다**

다음 흐름을 검증한다.

```ts
it('미션 미선택 상태에서 기록 버튼을 누르면 바텀시트를 연다', async () => {
  // 기록 화면 이동 callback은 호출되지 않음
  // "오늘의 미션을 선택하세요"가 표시됨
});

it('미션을 선택하면 바텀시트가 닫히고 기록 화면으로 이동한다', async () => {
  // 쉬움 카드 선택
  // selectDailyMission 호출
  // onNavigate('record') 호출
});

it('선택 후 홈에는 선택한 미션 하나와 진행률만 표시한다', () => {
  // title, current / target, 완료 여부 표시
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/screens/HomeScreen.dailyMission.test.tsx`

Expected: 바텀시트와 미션 카드가 없어 FAIL.

- [ ] **Step 3: DailyMissionSheet를 구현한다**

Props:

```ts
interface DailyMissionSheetProps {
  missions: DailyMissionDefinition[];
  onSelect: (missionId: string) => void;
  onClose: () => void;
}
```

표시 요소:

- 제목 `오늘의 미션을 선택하세요`
- 설명 `선택 후 오늘은 변경할 수 없어요`
- 난이도 라벨 `쉬움`, `보통`, `어려움`
- 미션 제목과 설명
- 모든 카드에 `보너스팩 1개`
- 배경 클릭과 닫기 버튼은 시트를 닫되 기록 화면으로 이동하지 않는다.

접근성:

- 컨테이너 `role="dialog"`, `aria-modal="true"`
- 제목과 `aria-labelledby` 연결
- 열릴 때 첫 미션 버튼에 포커스
- Escape로 닫기

- [ ] **Step 4: HomeScreen 진입 흐름을 변경한다**

기록 버튼 처리:

```ts
function handleRecordClick() {
  if (selectedDailyMission || !canSelectDailyMission) {
    onNavigate('record');
    return;
  }
  setMissionSheetOpen(true);
}
```

미션 선택 처리:

```ts
function handleMissionSelect(missionId: string) {
  selectDailyMission(missionId);
  setMissionSheetOpen(false);
  onNavigate('record');
}
```

예외 상태인 `!canSelectDailyMission && !selectedDailyMission`에서는 기존 기록이 이미 있으므로 바로 기록 화면으로 이동한다.

- [ ] **Step 5: 홈 진행 카드를 추가한다**

기존 홈 정보량을 늘리지 않도록 주간 정보 패널 아래에 작은 카드 하나만 배치한다.

미선택 상태:

```text
오늘의 미션을 선택하고 운동을 시작해요
```

선택 상태:

```text
오늘의 미션 · 보통
하체 운동 2종 기록
1 / 2
```

완료 상태:

```text
오늘의 미션 완료!
보너스팩이 도착했어요
```

- [ ] **Step 6: 테스트와 빌드를 실행한다**

Run: `npm test -- src/screens/HomeScreen.dailyMission.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add src/screens/DailyMissionSheet.tsx src/screens/DailyMissionSheet.css src/screens/HomeScreen.tsx src/screens/HomeScreen.css src/screens/HomeScreen.dailyMission.test.tsx
git commit -m "feat: add daily mission selection sheet"
```

---

### Task 6: 팩 개봉 문구와 전체 회귀 검증

**Files:**
- Modify: `src/screens/PackOpeningScreen.tsx` 또는 `src/screens/ComboPackOpeningScreen.tsx`
- Modify: 관련 CSS 파일
- Modify: `docs/superpowers/plans/2026-08-05-daily-card-mission.md` 체크박스는 실행 중 갱신하지 않는다.

**Interfaces:**
- Consumes: `GrantedPack.source === 'daily-mission'`

- [ ] **Step 1: 미션 팩 출처 문구를 추가한다**

미션 보너스팩 개봉 화면에 다음 문구를 표시한다.

```text
오늘의 미션 완료 보상
일반 운동팩보다 높은 등급 확률이 적용돼요
```

세트 완성 특별상자와 일반 운동팩 문구는 유지한다.

- [ ] **Step 2: 전체 테스트를 실행한다**

Run: `npm test`

Expected: 전체 PASS.

- [ ] **Step 3: 정적 검증을 실행한다**

Run: `npm run build && npm run lint`

Expected: PASS.

- [ ] **Step 4: 모바일 수동 흐름을 확인한다**

확인 시나리오:

1. 미션 미선택 홈에서 기록 버튼 클릭.
2. 바텀시트에 3개 미션과 보상이 보임.
3. 미션 하나 선택 후 기록 화면 이동.
4. 홈 복귀 시 선택 미션 1개만 표시.
5. 조건을 두 번의 운동 기록으로 나눠 달성.
6. 완료 직후 보너스팩이 한 개만 생성.
7. 앱 새로고침 후 선택·완료·보상 상태 유지.
8. 날짜를 다음 날로 바꾸면 새로운 미션 3개 생성.

- [ ] **Step 5: Vercel 상태를 확인한다**

최종 커밋에 대해 GitHub combined status를 확인한다. 빌드 횟수 제한이면 코드 실패로 기록하지 말고 정확히 `Vercel build-rate-limit`로 기록한다.

- [ ] **Step 6: PR 설명을 갱신한다**

PR #14에 다음을 추가한다.

```markdown
## 오늘의 카드 미션
- 최근 14일 기록 기반 쉬움·보통 미션과 오늘의 집중 세트 어려움 미션
- 홈 바텀시트에서 3개 중 1개 선택
- 선택 후 당일 변경 불가
- 당일 여러 운동 기록 누적 판정
- 완료 즉시 미션 보너스팩 자동 지급
- 보너스팩 확률: 일반 50%, 레어 35%, 슈퍼레어 13%, 레전더리 2%
- 기존 저장 데이터 자동 마이그레이션
```

- [ ] **Step 7: 최종 커밋한다**

```bash
git add src/screens/PackOpeningScreen.tsx src/screens/ComboPackOpeningScreen.tsx src/screens/*.css
git commit -m "feat: finish daily card mission flow"
```
