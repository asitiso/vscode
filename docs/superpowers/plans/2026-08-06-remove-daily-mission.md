# 오늘의 미션 완전 제거 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 오늘의 미션 UI, 상태, 선택 흐름, 추가 보상을 완전히 제거하고 사용자가 홈 또는 하단 내비게이션에서 즉시 운동 기록 화면으로 이동하도록 한다.

**Architecture:** 미션 제거를 상태 계층부터 수행해 `AppState`와 `GameContext`가 더 이상 미션 데이터를 생성하거나 평가하지 않도록 만든다. 이후 앱 내비게이션과 홈 화면에서 미션 분기와 UI를 제거하고, 마지막으로 저장 데이터 마이그레이션·보상·회귀 테스트를 정리한다. 기존 저장 데이터의 미션 필드는 구조 분해를 통해 버리고 다른 사용자 데이터는 그대로 유지한다.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Testing Library, localStorage

## Global Constraints

- 오늘의 미션 UI, 선택 화면, 상태, 액션, 평가 로직, 추가 보상을 완전히 제거한다.
- 하단 내비게이션과 홈 CTA의 `기록` 진입은 항상 즉시 `record` 화면으로 이동해야 한다.
- 일반 운동 완료 보상, 카드팩, 업적, 도감, 카드 세트 완성, 리포트, 운동별 상세 분석은 유지한다.
- 미션 제거를 이유로 일반 보상량을 늘리거나 대체 보상을 추가하지 않는다.
- 기존 저장 데이터에 `dailyMissions` 또는 미션 출처 팩이 있어도 앱이 오류 없이 로드돼야 한다.
- 기존 사용자의 운동 기록, 카드, 팩, 커스텀 운동, 세트 진행, 설정 데이터는 유지한다.
- 홈 화면에 새 기능을 추가하지 않고 기존 요소 간격만 조정한다.
- PR #14는 사용자의 명시적 요청 전까지 병합하지 않는다.

---

## File Structure

- Modify: `src/types.ts` — 미션 타입, `AppState.dailyMissions`, 미션 전용 팩 메타데이터 제거 또는 레거시 호환 타입 분리.
- Modify: `src/store/storage.ts` — 저장 데이터에서 미션 필드를 버리고 나머지 상태만 복구하는 마이그레이션.
- Modify: `src/store/storage.test.ts` — 과거 미션 데이터 로드와 비미션 데이터 보존 테스트.
- Modify: `src/store/GameContext.tsx` — 미션 액션, 선택자, 평가, 추가 팩 지급 제거.
- Modify: `src/store/GameContext.test.tsx` 또는 관련 리듀서 테스트 — 운동 완료 기본 팩만 지급되는지 검증.
- Modify: `src/App.tsx` — 기록 탭 차단 분기 제거.
- Modify/Create: `src/App.test.tsx` — 기록 탭 즉시 진입 테스트.
- Modify: `src/screens/HomeScreen.tsx` — 미션 카드, 바텀시트, 선택 핸들러, 미션 배지 제거.
- Modify: `src/screens/HomeScreen.css` — 미션 공간 제거 후 기존 요소 간격 재조정.
- Modify: `src/screens/HomeScreen.test.tsx` — 미션 문구 미노출과 CTA 직접 진입 테스트.
- Delete: `src/screens/DailyMissionSheet.tsx`
- Delete: `src/screens/DailyMissionSheet.css`
- Delete: `src/game/dailyMission.ts`
- Delete or modify: `src/game/dailyMission.test.ts`
- Modify: `src/game/cardDraw.ts` 및 관련 테스트 — `missionPack` 분기 제거.
- Modify: `src/data/packs.ts` — 미션 전용 팩 정의가 다른 기능에서 쓰이지 않으면 제거.
- Modify: 미션 문자열·타입·상수·fixture를 참조하는 모든 파일.

---

### Task 1: 미션 상태 타입과 저장 데이터 마이그레이션 정리

**Files:**
- Modify: `src/types.ts`
- Modify: `src/store/storage.ts`
- Modify: `src/store/storage.test.ts`

**Interfaces:**
- Produces: 미션 필드가 없는 `AppState`.
- Produces: `migrateState(parsed: unknown): AppState` 또는 현재 프로젝트 패턴과 동일한 안전한 마이그레이션 함수.
- Guarantees: 입력에 `dailyMissions`가 있어도 반환 상태에는 포함되지 않고 다른 필드는 유지된다.

- [ ] **Step 1: 과거 저장 데이터 마이그레이션 실패 테스트를 작성한다**

`src/store/storage.test.ts`에 미션 필드가 포함된 과거 상태를 넣고 다음을 검증한다.

```ts
const migrated = migrateState({
  ...legacyState,
  dailyMissions: {
    '2026-08-06': {
      date: '2026-08-06',
      selectedMissionId: 'mission-1',
      completedAt: '2026-08-06T01:00:00.000Z',
    },
  },
});

expect('dailyMissions' in migrated).toBe(false);
expect(migrated.workoutLogs).toEqual(legacyState.workoutLogs);
expect(migrated.ownedCards).toEqual(legacyState.ownedCards);
expect(migrated.grantedPacks).toEqual(expect.any(Array));
```

미션 출처의 과거 팩은 삭제하지 않고 기존 팩으로 보존하되, 앱이 더 이상 새 미션 팩을 생성하지 않는 계약도 명시한다.

- [ ] **Step 2: 테스트 실패를 확인한다**

Run: `npm test -- src/store/storage.test.ts`

Expected: 현재 `AppState`와 마이그레이션이 `dailyMissions`를 유지해 FAIL.

- [ ] **Step 3: 미션 전용 타입과 상태 필드를 제거한다**

`src/types.ts`에서 다음을 정리한다.

- `DailyMission*` 타입 제거.
- `AppState.dailyMissions` 제거.
- 새 팩이 `source: 'daily-mission'`을 생성하지 않도록 신규 상태 타입을 좁힌다.
- 과거 저장 데이터의 미션 팩을 읽기 위해 필요한 경우 저장 입력 전용 레거시 타입을 `storage.ts` 내부에만 둔다.

- [ ] **Step 4: 저장 마이그레이션을 구현한다**

`migrateState`는 입력 객체에서 `dailyMissions`를 구조 분해로 버리고, 현재 `AppState`에 필요한 필드만 명시적으로 반환한다. 기존 `user`, `workoutLogs`, `ownedCards`, `grantedPacks`, `customExercises`, `completedSetIds`, `rewardedSetIds`, `recentCompletedSetId`는 유지한다.

- [ ] **Step 5: 초기 상태에서 미션 필드를 제거한다**

`createInitialState()`가 미션 필드 없이 현재 `AppState`를 반환하도록 수정한다.

- [ ] **Step 6: 단위 테스트를 실행한다**

Run: `npm test -- src/store/storage.test.ts`

Expected: PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add src/types.ts src/store/storage.ts src/store/storage.test.ts
git commit -m "refactor: remove daily mission state"
```

---

### Task 2: GameContext의 미션 선택·평가·추가 보상 제거

**Files:**
- Modify: `src/store/GameContext.tsx`
- Modify: 관련 `GameContext` 또는 운동 완료 테스트 파일
- Delete: `src/game/dailyMission.ts`
- Delete: `src/game/dailyMission.test.ts` 또는 미션 전용 테스트 파일

**Interfaces:**
- Removes: `selectDailyMission`, `todayMissionState`, `todayMissionProgress`, `canSelectDailyMission`.
- Preserves: `completeWorkout`, `openPack`, 커스텀 운동 액션, 세트 보상, 주간 진행도.
- Guarantees: 한 번의 운동 완료는 기존 일반 운동 팩 한 개만 생성한다.

- [ ] **Step 1: 운동 완료 기본 보상 회귀 테스트를 작성한다**

운동을 한 번 완료한 뒤 다음을 검증한다.

```ts
expect(result.workoutLogs).toHaveLength(previousLogs + 1);
expect(result.grantedPacks.slice(previousPacks)).toHaveLength(1);
expect(result.grantedPacks.at(-1)?.source).toBe('workout');
```

미션 상태가 포함된 레거시 저장 데이터를 로드한 경우에도 동일한 결과를 기대한다.

- [ ] **Step 2: 테스트 실패를 확인한다**

Run: `npm test -- <GameContext 관련 테스트 경로>`

Expected: 현재 미션 선택 상태에서는 추가 미션 팩이 생성돼 FAIL.

- [ ] **Step 3: 미션 액션과 리듀서 분기를 제거한다**

`Action`에서 `SELECT_DAILY_MISSION`을 제거하고 리듀서의 해당 case를 삭제한다.

- [ ] **Step 4: 운동 완료의 미션 평가와 추가 팩 생성을 제거한다**

`COMPLETE_WORKOUT`에서 다음을 제거한다.

- `evaluateDailyMission` 호출.
- `selectedMission` 탐색.
- `missionPack` 생성.
- `dailyMissions` 업데이트.

반환 상태는 `workoutLogs`와 일반 `grantedPack`만 추가한다.

- [ ] **Step 5: Context 공개 인터페이스에서 미션 필드를 제거한다**

`GameContextValue`, `value`, import, memo 계산에서 미션 관련 필드를 모두 삭제한다.

- [ ] **Step 6: 미션 생성·평가 모듈과 전용 테스트를 삭제한다**

다른 참조가 없는 것을 검색으로 확인한 뒤 `src/game/dailyMission.ts`와 전용 테스트를 삭제한다.

- [ ] **Step 7: 관련 테스트를 실행한다**

Run: `npm test -- <GameContext 관련 테스트 경로> src/store/storage.test.ts`

Expected: PASS.

- [ ] **Step 8: 커밋한다**

```bash
git add src/store/GameContext.tsx src/game src/store
git commit -m "refactor: remove daily mission rewards"
```

---

### Task 3: 앱 내비게이션과 홈 화면에서 미션 흐름 제거

**Files:**
- Modify: `src/App.tsx`
- Modify/Create: `src/App.test.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/HomeScreen.css`
- Modify: `src/screens/HomeScreen.test.tsx`
- Delete: `src/screens/DailyMissionSheet.tsx`
- Delete: `src/screens/DailyMissionSheet.css`

**Interfaces:**
- Produces: 하단 내비게이션의 `record` 선택 시 항상 `navigate('record')`.
- Produces: 홈 CTA 클릭 시 항상 `onNavigate('record')`.
- Removes: 미션 카드, 미션 바텀시트, 미션 선택 상태와 핸들러.

- [ ] **Step 1: 기록 탭 즉시 진입 실패 테스트를 작성한다**

`App.test.tsx`에서 하단 내비게이션의 `기록`을 누른 뒤 `오늘 운동 기록` 화면이 표시되는지 검증한다.

```tsx
await user.click(screen.getByRole('button', { name: /기록/ }));
expect(screen.getByRole('heading', { name: '오늘 운동 기록' })).toBeTruthy();
```

- [ ] **Step 2: 홈 미션 미노출 테스트를 작성한다**

`HomeScreen.test.tsx`에서 다음을 검증한다.

```tsx
expect(screen.queryByText('오늘의 미션')).toBeNull();
expect(screen.queryByText(/보너스팩/)).toBeNull();
```

홈 CTA 클릭 시 `onNavigate('record')`가 한 번 호출되는 테스트도 추가한다.

- [ ] **Step 3: 테스트 실패를 확인한다**

Run: `npm test -- src/App.test.tsx src/screens/HomeScreen.test.tsx`

Expected: 현재 내비게이션 차단과 미션 UI 때문에 FAIL.

- [ ] **Step 4: App의 기록 탭 차단 분기를 제거한다**

- `useGame()`의 `canSelectDailyMission` 사용을 제거한다.
- `navigateFromBottomNav`에서 현재 탭 중복 방지만 유지한다.
- `record` 선택은 다른 탭과 동일하게 `navigate(next)`를 호출한다.

- [ ] **Step 5: HomeScreen의 미션 관련 코드와 UI를 제거한다**

다음을 삭제한다.

- `DailyMissionSheet` import.
- 미션 상태·진행도·선택 함수 destructuring.
- `showMissionSheet` 상태.
- `selectedMission`, 진행률 계산.
- `handleRecordStart`의 미션 분기.
- `handleMissionSelect`.
- 미션 카드 JSX.
- 미션 시트 JSX.
- 카드팩 배지의 `MISSION` 분기.

홈 CTA는 `onClick={() => onNavigate('record')}`로 단순화한다.

- [ ] **Step 6: 홈 레이아웃 간격을 재조정한다**

미션 카드 공간을 새 기능으로 채우지 않는다. `.home-screen__cta`, 캐릭터, 카드팩의 위치만 현재 화면 안정화 규칙 안에서 자연스럽게 당긴다. 320×568과 390×844에서 겹침이 없어야 한다.

- [ ] **Step 7: 미션 시트 파일을 삭제한다**

참조가 모두 제거된 후 `DailyMissionSheet.tsx`와 CSS를 삭제한다.

- [ ] **Step 8: 화면 테스트를 실행한다**

Run: `npm test -- src/App.test.tsx src/screens/HomeScreen.test.tsx`

Expected: PASS.

- [ ] **Step 9: 커밋한다**

```bash
git add src/App.tsx src/App.test.tsx src/screens
git commit -m "refactor: remove daily mission flow"
```

---

### Task 4: 카드 팩과 미션 전용 잔여 분기 정리

**Files:**
- Modify: `src/game/cardDraw.ts`
- Modify: `src/game/cardDraw.test.ts`
- Modify: `src/data/packs.ts`
- Modify: 미션 출처 문자열을 참조하는 파일

**Interfaces:**
- Removes: 신규 카드 뽑기의 `missionPack` 옵션과 미션 전용 확률 분기.
- Preserves: 일반 운동 팩과 세트 완성 팩의 카드 뽑기 동작.
- Preserves: 레거시 미션 팩을 열 때 앱이 중단되지 않는 안전한 기본 동작.

- [ ] **Step 1: 일반·세트 완성 팩 회귀 테스트를 작성한다**

`drawCard`가 일반 운동 팩과 세트 완성 팩 옵션에서 기존 결과 계약을 유지하는지 검증한다. 미션 전용 옵션은 타입과 테스트에서 제거한다.

- [ ] **Step 2: 레거시 미션 팩 개봉 안전성 테스트를 작성한다**

과거 저장 데이터의 `source: 'daily-mission'` 팩을 열 때 미션 전용 보너스 없이 일반 팩 규칙으로 처리되고 오류가 나지 않는지 검증한다.

- [ ] **Step 3: 카드 뽑기 미션 분기를 제거한다**

`drawCard` 옵션에서 `missionPack`을 제거하고, `GameContext`에서 미션 출처를 전달하지 않도록 한다. 레거시 팩은 일반 카테고리 없는 팩으로 처리한다.

- [ ] **Step 4: 미션 전용 팩 정의를 제거한다**

`src/data/packs.ts`에서 미션만 사용하던 팩 정의가 다른 곳에서 참조되지 않으면 삭제한다. 공유되는 이미지·일반 팩 정의는 유지한다.

- [ ] **Step 5: 전체 미션 문자열 검색을 수행한다**

Run:

```bash
rg -n "DailyMission|dailyMission|dailyMissions|오늘의 미션|daily-mission|MISSION|보너스팩" src
```

Expected: 레거시 마이그레이션 테스트와 명시적 호환 처리 외 제품 코드 참조 0건.

- [ ] **Step 6: 관련 테스트를 실행한다**

Run: `npm test -- src/game/cardDraw.test.ts`

Expected: PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add src/game/cardDraw.ts src/game/cardDraw.test.ts src/data/packs.ts src
git commit -m "refactor: remove daily mission pack branches"
```

---

### Task 5: 전체 회귀 검증과 Vercel Preview 확인

**Files:**
- Modify: PR #14 설명
- No product code changes unless verification exposes a defect.

**Interfaces:**
- Verifies: 미션 UI·상태·추가 보상 제거.
- Verifies: 기록 직접 진입, 기본 운동 보상, 저장 데이터 호환.
- Verifies: 카드팩·업적·도감·세트·리포트·분석 회귀 없음.

- [ ] **Step 1: 전체 테스트를 실행한다**

Run: `npm test`

Expected: 모든 테스트 PASS, 실패 0건.

- [ ] **Step 2: 프로덕션 빌드를 실행한다**

Run: `npm run build`

Expected: TypeScript와 Vite 빌드가 exit code 0으로 완료.

- [ ] **Step 3: 미션 잔여 참조를 다시 검색한다**

Run:

```bash
rg -n "DailyMission|dailyMission|dailyMissions|오늘의 미션|daily-mission|MISSION|보너스팩" src
```

Expected: 저장 마이그레이션·레거시 호환 테스트 외 사용자 노출 및 활성 로직 0건.

- [ ] **Step 4: 수동 화면 검증을 수행한다**

확인 항목:

- 홈에 미션 카드와 미션 문구가 없음.
- 홈 CTA가 즉시 기록 화면으로 이동.
- 하단 `기록` 탭이 즉시 기록 화면으로 이동.
- 320×568, 360×640, 390×844, 412×915에서 홈 요소가 겹치지 않음.
- 운동 완료 후 일반 운동 팩 한 개가 지급됨.
- 과거 미션 상태가 포함된 저장 데이터를 로드해도 앱이 정상 동작.
- 레거시 미션 팩을 열어도 오류가 없음.

- [ ] **Step 5: Vercel Preview 배포 상태를 확인한다**

최신 커밋의 Preview가 `READY`인지 확인하고 배포 URL에서 홈과 기록 진입을 확인한다. 실패하면 Vercel 빌드 로그의 실제 오류를 수정한 뒤 다시 검증한다.

- [ ] **Step 6: PR #14 설명을 갱신한다**

오늘의 미션 완전 제거, 기록 즉시 진입, 기본 보상 유지, 저장 데이터 호환, 테스트·빌드·Preview 결과를 기록한다. 병합은 수행하지 않는다.

- [ ] **Step 7: 최종 커밋이 필요한 경우 커밋한다**

```bash
git add -A
git commit -m "test: verify daily mission removal"
```
