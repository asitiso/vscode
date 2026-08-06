# 사용자 직접 입력 운동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기타 카테고리에서 사용자가 운동을 직접 생성·수정·삭제하고, 시간형 또는 무게·횟수·세트형으로 기록하며 기존 보상과 통계에 동일하게 반영되도록 한다.

**Architecture:** 기본 운동 정의는 `src/data/exercises.ts`에 그대로 두고, 사용자 운동은 `AppState.customExercises`에 별도 저장한다. 기록 화면에서는 기본 운동과 사용자 운동을 하나의 조회 계층으로 합쳐 표시하되, 사용자 운동 관리 로직은 별도 유틸과 컴포넌트로 분리한다. 과거 기록 표시를 보존하기 위해 `WorkoutSetEntry`에 기록 당시의 운동 이름과 기록 방식 스냅샷을 선택 필드로 저장한다.

**Tech Stack:** React 19, TypeScript 6, Vite 8, localStorage, Vitest, Testing Library

## Global Constraints

- 사용자 운동 이름은 공백 정리 후 최대 30자다.
- 사용자 운동 카테고리는 항상 `etc`다.
- 기록 방식은 `duration` 또는 `weight-reps-sets`만 허용한다.
- 사용자 운동은 기본 운동과 동일하게 오늘 활동, 주간 목표, 경험치, 보상상자 지급에 포함한다.
- 사용자 운동 전용 카드, 이미지, 카드 세트 항목은 만들지 않는다.
- 사용자 운동 삭제 시 과거 기록, 경험치, 주간 진행, 이미 지급된 보상은 유지한다.
- 기존 저장 데이터에 `customExercises`가 없으면 빈 배열로 마이그레이션한다.
- 카드 확률, 천장, 중복 성장, 별 단계, 카드팩 개봉 연출은 변경하지 않는다.

---

## File Structure

- Create: `src/game/customExercise.ts` — 이름 정규화, 중복 검사, 생성·수정 검증을 담당한다.
- Create: `src/game/customExercise.test.ts` — 사용자 운동 검증 규칙을 단위 테스트한다.
- Create: `src/screens/CustomExerciseEditor.tsx` — 생성·수정 폼과 오류 표시를 담당한다.
- Create: `src/screens/CustomExerciseEditor.css` — 모바일 폼, 관리 버튼, 확인 영역 스타일을 담당한다.
- Modify: `src/types/index.ts` — `CustomExercise`, `customExercises`, 기록 스냅샷 필드를 정의한다.
- Modify: `src/store/storage.ts` — 기존 저장 데이터 마이그레이션과 초기값을 추가한다.
- Modify: `src/store/GameContext.tsx` — 사용자 운동 생성·수정·삭제 액션과 공개 API를 추가한다.
- Modify: `src/screens/RecordScreen.tsx` — 기타 목록, 최근 운동, 기록 폼에서 사용자 운동을 통합한다.
- Modify: `src/screens/RecordScreen.css` — 사용자 운동 목록과 관리 버튼 배치를 추가한다.
- Modify: `src/game/cardDraw.ts` 또는 `src/game/packSelector.ts` — 사용자 운동 ID가 기본 운동 정의에 없어도 `etc` 카테고리로 안전하게 처리한다.
- Modify: `package.json` — 테스트 명령과 테스트 의존성을 추가한다.
- Create: `src/store/storage.test.ts` — 이전 저장 데이터 마이그레이션을 검증한다.
- Create: `src/store/GameContext.test.tsx` — 사용자 운동 CRUD와 기록·보상 연계를 검증한다.
- Create: `src/screens/RecordScreen.test.tsx` — 생성, 재사용, 수정, 삭제 UI 흐름을 검증한다.

---

### Task 1: 테스트 기반과 사용자 운동 검증 유틸

**Files:**
- Modify: `package.json`
- Create: `src/game/customExercise.ts`
- Create: `src/game/customExercise.test.ts`

**Interfaces:**
- Produces: `normalizeExerciseName(name: string): string`
- Produces: `validateCustomExerciseName(input: string, customExercises: CustomExercise[], baseExercises: Exercise[], editingId?: string): { normalizedName: string; error: CustomExerciseNameError | null }`
- Produces: `CustomExerciseNameError = 'required' | 'too-long' | 'duplicate-custom' | 'duplicate-base'`

- [ ] **Step 1: 테스트 도구를 추가한다**

`package.json`에 다음 스크립트와 개발 의존성을 추가한다.

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^26.1.0",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: 이름 검증 실패 테스트를 작성한다**

`src/game/customExercise.test.ts`에 다음 사례를 작성한다.

```ts
import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../data/exercises';
import type { CustomExercise } from '../types';
import { normalizeExerciseName, validateCustomExerciseName } from './customExercise';

const customExercises: CustomExercise[] = [
  {
    id: 'custom-1',
    name: '배드민턴',
    category: 'etc',
    logType: 'duration',
    createdAt: '2026-08-05T00:00:00.000Z',
    updatedAt: '2026-08-05T00:00:00.000Z',
  },
];

describe('normalizeExerciseName', () => {
  it('앞뒤 공백과 연속 공백을 정리한다', () => {
    expect(normalizeExerciseName('  랜드마인   프레스  ')).toBe('랜드마인 프레스');
  });
});

describe('validateCustomExerciseName', () => {
  it('빈 이름을 거부한다', () => {
    expect(validateCustomExerciseName('   ', customExercises, EXERCISES).error).toBe('required');
  });

  it('30자를 초과하는 이름을 거부한다', () => {
    expect(validateCustomExerciseName('가'.repeat(31), customExercises, EXERCISES).error).toBe('too-long');
  });

  it('사용자 운동 중복을 대소문자와 공백 차이 없이 거부한다', () => {
    expect(validateCustomExerciseName(' 배드민턴 ', customExercises, EXERCISES).error).toBe('duplicate-custom');
  });

  it('기본 운동 이름 중복을 거부한다', () => {
    expect(validateCustomExerciseName(EXERCISES[0].name, customExercises, EXERCISES).error).toBe('duplicate-base');
  });

  it('수정 중인 자기 자신은 중복에서 제외한다', () => {
    expect(validateCustomExerciseName('배드민턴', customExercises, EXERCISES, 'custom-1').error).toBeNull();
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인한다**

Run: `npm install && npm test -- src/game/customExercise.test.ts`

Expected: `CustomExercise` 타입과 검증 함수가 없어 FAIL.

- [ ] **Step 4: 최소 검증 구현을 작성한다**

`src/game/customExercise.ts`:

```ts
import type { CustomExercise, Exercise } from '../types';

export type CustomExerciseNameError =
  | 'required'
  | 'too-long'
  | 'duplicate-custom'
  | 'duplicate-base';

export function normalizeExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function comparableName(name: string): string {
  return normalizeExerciseName(name).toLocaleLowerCase('ko-KR');
}

export function validateCustomExerciseName(
  input: string,
  customExercises: CustomExercise[],
  baseExercises: Exercise[],
  editingId?: string,
): { normalizedName: string; error: CustomExerciseNameError | null } {
  const normalizedName = normalizeExerciseName(input);
  if (!normalizedName) return { normalizedName, error: 'required' };
  if (normalizedName.length > 30) return { normalizedName, error: 'too-long' };

  const key = comparableName(normalizedName);
  if (customExercises.some((item) => item.id !== editingId && comparableName(item.name) === key)) {
    return { normalizedName, error: 'duplicate-custom' };
  }
  if (baseExercises.some((item) => comparableName(item.name) === key)) {
    return { normalizedName, error: 'duplicate-base' };
  }
  return { normalizedName, error: null };
}
```

- [ ] **Step 5: 테스트와 빌드를 실행한다**

Run: `npm test -- src/game/customExercise.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add package.json package-lock.json src/game/customExercise.ts src/game/customExercise.test.ts
git commit -m "test: add custom exercise validation"
```

---

### Task 2: 타입, 기록 스냅샷, 저장 데이터 마이그레이션

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/storage.ts`
- Create: `src/store/storage.test.ts`

**Interfaces:**
- Produces: `CustomExercise`
- Produces: `AppState.customExercises: CustomExercise[]`
- Extends: `WorkoutSetEntry.exerciseName?: string`
- Extends: `WorkoutSetEntry.exerciseLogType?: ExerciseLogType`
- Produces: `migrateState(parsed: unknown): AppState`

- [ ] **Step 1: 저장 마이그레이션 실패 테스트를 작성한다**

`src/store/storage.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, loadState } from './storage';

describe('storage migration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('초기 상태에 빈 사용자 운동 목록을 포함한다', () => {
    expect(createInitialState().customExercises).toEqual([]);
  });

  it('이전 저장 데이터에 customExercises가 없으면 빈 배열을 채운다', () => {
    const oldState = createInitialState() as Record<string, unknown>;
    delete oldState.customExercises;
    localStorage.setItem('workout-card-game:v1', JSON.stringify(oldState));
    expect(loadState()?.customExercises).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- src/store/storage.test.ts`

Expected: `customExercises`가 없어 FAIL.

- [ ] **Step 3: 타입을 확장한다**

`src/types/index.ts`에 추가한다.

```ts
export interface CustomExercise {
  id: string;
  name: string;
  category: 'etc';
  logType: ExerciseLogType;
  createdAt: string;
  updatedAt: string;
}
```

`WorkoutSetEntry`에 추가한다.

```ts
exerciseName?: string;
exerciseLogType?: ExerciseLogType;
```

`AppState`에 추가한다.

```ts
customExercises: CustomExercise[];
```

- [ ] **Step 4: 마이그레이션을 구현한다**

`src/store/storage.ts`에서 JSON 결과를 즉시 `AppState`로 단정하지 말고 다음 보정을 적용한다.

```ts
function migrateState(parsed: AppState): AppState {
  if (!parsed.user.selectedCharacterId) parsed.user.selectedCharacterId = 'main-character';
  if (!Array.isArray(parsed.customExercises)) parsed.customExercises = [];
  return parsed;
}
```

초기 상태에는 다음을 추가한다.

```ts
customExercises: [],
```

- [ ] **Step 5: 테스트와 빌드를 실행한다**

Run: `npm test -- src/store/storage.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add src/types/index.ts src/store/storage.ts src/store/storage.test.ts
git commit -m "feat: persist custom exercises"
```

---

### Task 3: 사용자 운동 CRUD와 기록·보상 안전 처리

**Files:**
- Modify: `src/store/GameContext.tsx`
- Modify: `src/game/cardDraw.ts`
- Modify: `src/game/packSelector.ts`
- Create: `src/store/GameContext.test.tsx`

**Interfaces:**
- Produces: `createCustomExercise(input: { name: string; logType: ExerciseLogType }): CustomExercise`
- Produces: `updateCustomExercise(id: string, input: { name: string; logType: ExerciseLogType }): void`
- Produces: `deleteCustomExercise(id: string): void`
- `completeWorkout` receives entries that already contain `exerciseName` and `exerciseLogType` snapshots.

- [ ] **Step 1: reducer 공개 동작 테스트를 작성한다**

테스트에서는 `GameProvider`를 감싼 작은 harness로 context 함수를 호출하고 화면에 JSON 상태를 출력한다. 다음을 검증한다.

```ts
it('사용자 운동을 생성하고 수정하고 삭제한다', async () => {
  // createCustomExercise({ name: '배드민턴', logType: 'duration' })
  // state.customExercises[0] 이름과 타입 확인
  // updateCustomExercise(id, { name: '복식 배드민턴', logType: 'duration' })
  // 이름 변경 확인
  // deleteCustomExercise(id)
  // 목록에서 제거 확인
});

it('사용자 운동 기록도 보상팩을 한 개 지급한다', async () => {
  // 사용자 운동 생성
  // 운동명과 logType 스냅샷이 들어간 entry로 completeWorkout 호출
  // workoutLogs 1개, grantedPacks 1개 확인
  // 기록 entry의 exerciseName이 유지되는지 확인
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- src/store/GameContext.test.tsx`

Expected: context CRUD 함수가 없어 FAIL.

- [ ] **Step 3: reducer 액션과 context API를 구현한다**

`Action`에 추가한다.

```ts
| { type: 'CREATE_CUSTOM_EXERCISE'; exercise: CustomExercise }
| { type: 'UPDATE_CUSTOM_EXERCISE'; id: string; name: string; logType: ExerciseLogType; updatedAt: string }
| { type: 'DELETE_CUSTOM_EXERCISE'; id: string };
```

삭제 액션은 `customExercises`만 필터링하며 `workoutLogs`는 변경하지 않는다.

Context에는 다음 함수를 노출한다.

```ts
createCustomExercise: (input) => {
  const now = new Date().toISOString();
  const exercise = {
    id: uid('custom-exercise'),
    name: input.name,
    category: 'etc' as const,
    logType: input.logType,
    createdAt: now,
    updatedAt: now,
  };
  dispatch({ type: 'CREATE_CUSTOM_EXERCISE', exercise });
  return exercise;
};
```

- [ ] **Step 4: 카테고리 조회를 안전하게 만든다**

`categoriesFromEntries()`가 기본 운동을 찾지 못한 경우 `entry.exerciseName` 또는 `entry.exerciseLogType` 존재 여부와 관계없이 사용자 운동을 `etc`로 처리하도록 변경한다.

```ts
const exercise = EXERCISES_BY_ID[entry.exerciseId];
return exercise?.category ?? 'etc';
```

`selectPackForCategories()`는 기존 `etc` 처리 규칙을 유지하고, 비어 있는 경우에만 기본팩을 선택한다.

- [ ] **Step 5: 테스트와 빌드를 실행한다**

Run: `npm test -- src/store/GameContext.test.tsx && npm run build`

Expected: CRUD, 기록, 보상팩 지급 테스트 PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add src/store/GameContext.tsx src/store/GameContext.test.tsx src/game/cardDraw.ts src/game/packSelector.ts
git commit -m "feat: manage custom exercises"
```

---

### Task 4: 생성·수정 폼과 기타 운동 목록 UI

**Files:**
- Create: `src/screens/CustomExerciseEditor.tsx`
- Create: `src/screens/CustomExerciseEditor.css`
- Modify: `src/screens/RecordScreen.tsx`
- Modify: `src/screens/RecordScreen.css`
- Create: `src/screens/RecordScreen.test.tsx`

**Interfaces:**
- `CustomExerciseEditor` consumes `mode`, `initialExercise`, `customExercises`, `onSave`, `onCancel`.
- `onSave` receives `{ name: string; logType: ExerciseLogType }` only after validation succeeds.
- `RecordScreen` resolves an exercise by ID from `EXERCISES` first, then `state.customExercises`.

- [ ] **Step 1: UI 흐름 테스트를 작성한다**

다음 사용자 흐름을 Testing Library로 작성한다.

```ts
it('기타에서 시간형 사용자 운동을 만들고 즉시 선택한다', async () => {
  // 기타 카테고리 선택
  // 새 운동 직접 입력 클릭
  // 배드민턴 입력
  // 시간 기록 선택
  // 저장 클릭
  // 배드민턴 칩이 나타나고 aria-pressed=true 확인
  // 시간 입력 필드가 표시되는지 확인
});

it('사용자 운동 이름과 기록 방식을 수정한다', async () => {
  // 관리 버튼 → 수정
  // 이름을 복식 배드민턴으로 변경
  // 무게·횟수·세트로 변경
  // 저장 후 세 개 숫자 필드 확인
});

it('사용자 운동 삭제 시 확인 후 선택과 미완성 입력을 제거한다', async () => {
  // 사용자 운동 선택
  // 삭제 클릭
  // 확인 대화상자에서 삭제
  // 칩과 set-card가 사라지는지 확인
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- src/screens/RecordScreen.test.tsx`

Expected: 직접 입력 UI가 없어 FAIL.

- [ ] **Step 3: 편집 컴포넌트를 구현한다**

`CustomExerciseEditor.tsx`는 다음 상태를 가진다.

```ts
const [name, setName] = useState(initialExercise?.name ?? '');
const [logType, setLogType] = useState<ExerciseLogType>(initialExercise?.logType ?? 'duration');
const [error, setError] = useState<CustomExerciseNameError | null>(null);
```

오류 문구 매핑:

```ts
const ERROR_MESSAGES = {
  required: '이름을 입력해 주세요.',
  'too-long': '운동 이름은 30자 이하로 입력해 주세요.',
  'duplicate-custom': '이미 저장된 운동입니다.',
  'duplicate-base': '기본 운동 목록에 있는 운동입니다.',
};
```

저장 실패 시 `name`과 `logType` 상태를 유지한다.

- [ ] **Step 4: RecordScreen의 운동 조회를 통합한다**

다음 헬퍼를 화면 내부 또는 별도 작은 함수로 둔다.

```ts
function findExercise(exerciseId: string) {
  return EXERCISES.find((item) => item.id === exerciseId)
    ?? state.customExercises.find((item) => item.id === exerciseId)
    ?? null;
}
```

`recentExerciseIds`, `toggleExercise`, 기록 카드 렌더링 모두 이 조회 함수를 사용한다. 과거에 삭제된 사용자 운동은 `entry.exerciseName`과 `entry.exerciseLogType` 스냅샷을 사용해 표시한다.

새로 선택한 사용자 운동 entry에는 다음을 포함한다.

```ts
{
  exerciseId: exercise.id,
  exerciseName: exercise.name,
  exerciseLogType: exercise.logType,
  durationMinutes: 20,
}
```

기본 운동도 새 기록부터 이름과 타입 스냅샷을 함께 저장해 표시 로직을 일관되게 한다.

- [ ] **Step 5: 기타 카테고리 관리 UI를 연결한다**

`category === 'etc'`일 때만 다음을 표시한다.

- 기본 기타 운동 칩
- 사용자 운동 칩
- 사용자 운동별 `수정`, `삭제` 버튼
- `새 운동 직접 입력` 버튼
- 생성 또는 수정 중인 `CustomExerciseEditor`

삭제 확인은 모바일에서 안정적으로 동작하는 인라인 확인 영역을 사용한다.

```tsx
<p role="alert">{exercise.name}을(를) 목록에서 삭제할까요?</p>
<button type="button" onClick={confirmDelete}>삭제</button>
<button type="button" onClick={cancelDelete}>취소</button>
```

- [ ] **Step 6: 모바일 스타일을 추가한다**

`CustomExerciseEditor.css`와 `RecordScreen.css`에 다음 기준을 적용한다.

- 입력 높이 최소 44px
- 기록 방식 버튼 두 개, 375px 이하에서는 세로 배치
- 사용자 운동 이름과 관리 버튼이 긴 이름에서도 줄바꿈
- 삭제 확인 버튼이 하단 내비게이션과 겹치지 않음
- 관리 버튼의 터치 영역 최소 40px

- [ ] **Step 7: 테스트, 린트, 빌드를 실행한다**

Run: `npm test -- src/screens/RecordScreen.test.tsx && npm run lint && npm run build`

Expected: PASS.

- [ ] **Step 8: 커밋한다**

```bash
git add src/screens/CustomExerciseEditor.tsx src/screens/CustomExerciseEditor.css src/screens/RecordScreen.tsx src/screens/RecordScreen.css src/screens/RecordScreen.test.tsx
git commit -m "feat: add custom exercise editor"
```

---

### Task 5: 통계·경험치·보상 회귀 검증과 PR 정리

**Files:**
- Modify as needed: `src/screens/RewardsScreen.tsx`
- Modify as needed: `src/game/experience.ts`
- Modify as needed: `src/game/weeklyGoal.ts`
- Modify: `docs/superpowers/specs/2026-08-05-custom-exercise-input-design.md` only if implementation reveals a contradiction

**Interfaces:**
- Existing consumers continue using `WorkoutLog.entries` without requiring a base exercise definition.
- Deleted user exercises remain readable through entry snapshots.

- [ ] **Step 1: 전체 회귀 테스트를 추가한다**

다음 조건을 기존 또는 새 테스트에 추가한다.

```ts
it('사용자 운동 기록은 오늘 활동 통계에 포함된다', () => {
  // durationMinutes 또는 reps/sets 합계가 기존 집계 함수에 포함되는지 검증
});

it('사용자 운동 기록은 주간 세션과 경험치에 포함된다', () => {
  // WorkoutLog 단위 계산이므로 기본 운동 정의 없이 동일한 값이 나오는지 검증
});

it('삭제된 사용자 운동의 과거 기록 이름을 유지한다', () => {
  // customExercises는 빈 배열, entry.exerciseName은 존재하는 상태로 화면 렌더링
});
```

- [ ] **Step 2: 전체 테스트를 실행한다**

Run: `npm test`

Expected: 모든 테스트 PASS.

- [ ] **Step 3: 정적 검증을 실행한다**

Run: `npm run lint && npm run build`

Expected: lint와 TypeScript/Vite 빌드 PASS.

- [ ] **Step 4: 수동 확인을 수행한다**

Run: `npm run dev`

확인 순서:

1. 기타 → 새 운동 직접 입력 → 시간형 저장
2. 새 운동이 즉시 선택되고 시간 입력이 표시됨
3. 운동 기록 완료 후 보상상자 지급
4. 새로고침 후 기타 목록에 유지
5. 이름과 기록 방식 수정
6. 수정 후 새 기록에만 새 방식 적용
7. 삭제 취소와 삭제 확인 동작
8. 삭제 후 과거 오늘 활동 기록 이름 유지
9. 기본 운동 기록, 카드팩 개봉, 경험치 팝업, 캐릭터 움직임 정상

- [ ] **Step 5: 최종 커밋을 만든다**

```bash
git add src package.json package-lock.json docs/superpowers/specs/2026-08-05-custom-exercise-input-design.md
git commit -m "test: verify custom exercise workflow"
```

- [ ] **Step 6: PR #14 설명을 갱신한다**

PR 설명에 다음을 추가한다.

```md
## 사용자 직접 입력 운동
- 기타 카테고리에서 시간형 또는 세트형 운동 생성
- 저장된 운동 재사용, 이름·기록 방식 수정, 삭제 지원
- 삭제 후에도 과거 기록 유지
- 일반 운동과 동일한 주간 목표·경험치·보상상자 처리
```

- [ ] **Step 7: Vercel 상태를 확인한다**

최종 커밋의 Vercel 상태가 `success`인지 확인하고, 실패 시 배포 로그에서 첫 오류를 기준으로 수정한다.
