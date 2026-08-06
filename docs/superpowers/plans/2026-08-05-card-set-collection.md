# 카드 세트 컬렉션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카드 24종을 6개 세트로 묶고, 세트 진행·완성 보상·오늘의 집중 세트·홈/도감 표시·완성 연출을 기존 카드팩 시스템 안에 추가한다.

**Architecture:** 세트 정의와 진행 계산은 순수 함수 모듈로 분리하고, 완성 여부는 `ownedCards`에서 계산한다. 중복 보상 방지는 `rewardedSetIds`를 단일 기준으로 삼으며, 특별상자는 기존 `GrantedPack`과 개봉 화면을 재사용한다. 오늘의 세트는 로컬 날짜 기반 순수 함수로 계산해 저장하지 않는다.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Testing Library, localStorage

## Global Constraints

- 카드 세트는 정확히 6개이며 각 세트는 정확히 4장의 카드 ID로 구성한다.
- 기존 24개 카드가 정확히 한 세트에만 포함되어야 한다.
- 새로운 재화와 새로운 상위 탭을 만들지 않는다.
- 세트 완성은 카드 보유 여부만 보며 중복 수·별 단계·희귀도는 무시한다.
- 특별상자 확률은 레어 70%, 슈퍼레어 25%, 레전더리 5%, 일반 0%다.
- 기존 일반상자의 확률·천장·중복 성장·별 단계·개봉 연출은 유지한다.
- 오늘의 세트는 로컬 날짜 `YYYY-MM-DD` 기반 결정적 함수로 계산하고 저장하지 않는다.
- 오늘의 세트 가중치는 기존 관련 카드 3 대비 5로 적용한다.
- 특별상자와 오늘의 보너스 가중치는 곱하지 않고 더 높은 가중치 하나만 적용한다.
- 사용자 직접 입력 운동은 세트 진행과 오늘의 보너스에 영향을 주지 않는다.
- PR #14 브랜치에서 작업하며 병합하지 않는다.

---

## File Structure

- Create: `src/data/cardSets.ts` — 6개 카드 세트 정의와 칭호·표시 이름을 관리한다.
- Create: `src/game/cardSetProgress.ts` — 세트 진행, 신규 완성 감지, 홈 추천 세트 계산을 담당한다.
- Create: `src/game/dailyFeaturedSet.ts` — 로컬 날짜 기반 오늘의 세트 계산을 담당한다.
- Create: `src/game/cardSetProgress.test.ts`
- Create: `src/game/dailyFeaturedSet.test.ts`
- Modify: `src/types/index.ts` — 세트 ID, 완료/보상 상태, 팩 출처를 정의한다.
- Modify: `src/store/storage.ts` — 새 상태 마이그레이션을 추가한다.
- Modify: `src/store/GameContext.tsx` — 카드 개봉 후 세트 완성 감지와 특별상자 지급을 원자적으로 처리한다.
- Modify: `src/game/cardDraw.ts` — 팩 출처별 등급 확률과 세트 가중치를 지원한다.
- Modify: `src/screens/HomeScreen.tsx`, `src/screens/HomeScreen.css` — 다음 완성 세트와 오늘의 집중 세트를 표시한다.
- Modify: `src/screens/CollectionScreen.tsx`, `src/screens/CollectionScreen.css` — 세트 필터·진행률·실루엣·완성 배지를 추가한다.
- Modify: `src/screens/PackOpeningScreen.tsx`, `src/screens/PackOpeningScreen.css` — 세트 완성 후 짧은 축하 연출을 추가한다.
- Modify: `src/game/characterDialogue.ts` — 최근 세트 완성 문맥 대사를 추가한다.
- Create/Modify tests beside each unit and screen.

---

### Task 1: 카드 세트 정의와 진행 계산

**Files:**
- Create: `src/data/cardSets.ts`
- Create: `src/game/cardSetProgress.ts`
- Create: `src/game/cardSetProgress.test.ts`

**Interfaces:**
- Produces: `CardSetId`
- Produces: `CardSetDefinition`
- Produces: `CARD_SETS: readonly CardSetDefinition[]`
- Produces: `getCardSetProgress(set, ownedCards): CardSetProgress`
- Produces: `findNewlyCompletedSets(beforeOwned, afterOwned, rewardedSetIds): CardSetDefinition[]`
- Produces: `selectHomeCardSet(ownedCards, featuredSetId): CardSetProgress`

- [ ] **Step 1: 카드 ID를 확인하고 6개 세트 테스트를 작성한다**

테스트는 다음을 반드시 검증한다.

```ts
expect(CARD_SETS).toHaveLength(6);
expect(CARD_SETS.every((set) => set.cardIds.length === 4)).toBe(true);
expect(new Set(CARD_SETS.flatMap((set) => set.cardIds)).size).toBe(24);
expect(CARD_SETS.flatMap((set) => set.cardIds).length).toBe(24);
```

세트 ID는 다음 고정값을 사용한다.

```ts
type CardSetId =
  | 'cardio-starter'
  | 'lower-body-machines'
  | 'chest-power'
  | 'back-pull'
  | 'free-weights'
  | 'full-body-balance';
```

- [ ] **Step 2: 진행 계산 실패 테스트를 작성한다**

다음 사례를 포함한다.

```ts
it('보유 카드 수와 누락 카드 ID를 계산한다');
it('별 단계와 중복 수는 완성 조건에 영향을 주지 않는다');
it('획득 전 미완성, 획득 후 완성된 세트만 반환한다');
it('rewardedSetIds에 있는 세트는 신규 완성으로 반환하지 않는다');
it('홈에서는 완성까지 가장 적게 남은 미완성 세트를 고른다');
it('동률이면 오늘의 세트를 우선한다');
```

- [ ] **Step 3: 테스트 실패를 확인한다**

Run: `npm test -- src/game/cardSetProgress.test.ts`

Expected: 모듈이 없어 FAIL.

- [ ] **Step 4: 최소 구현을 작성한다**

`CardSetDefinition`은 다음 필드를 가진다.

```ts
interface CardSetDefinition {
  id: CardSetId;
  name: string;
  shortLabel: string;
  title: string;
  cardIds: readonly [string, string, string, string];
}
```

`CardSetProgress`는 다음 필드를 가진다.

```ts
interface CardSetProgress {
  set: CardSetDefinition;
  obtainedCardIds: string[];
  missingCardIds: string[];
  obtainedCount: number;
  totalCount: 4;
  isComplete: boolean;
}
```

- [ ] **Step 5: 테스트와 빌드를 실행한다**

Run: `npm test -- src/game/cardSetProgress.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add src/data/cardSets.ts src/game/cardSetProgress.ts src/game/cardSetProgress.test.ts
git commit -m "feat: define card collection sets"
```

---

### Task 2: 저장 상태와 마이그레이션

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/storage.ts`
- Modify: `src/store/storage.test.ts`

**Interfaces:**
- Extends: `AppState.completedSetIds: CardSetId[]`
- Extends: `AppState.rewardedSetIds: CardSetId[]`
- Extends: `GrantedPack.source?: 'workout' | 'set-completion'`
- Extends: `GrantedPack.sourceSetId?: CardSetId`
- Extends: `GrantedPack.completionTriggeredAt?: string`

- [ ] **Step 1: 이전 데이터 마이그레이션 테스트를 작성한다**

```ts
it('초기 상태에 completedSetIds와 rewardedSetIds가 빈 배열로 존재한다');
it('이전 저장 데이터에 두 필드가 없으면 빈 배열을 채운다');
it('기존 팩에 source가 없어도 workout 팩으로 읽을 수 있다');
it('이미 저장된 customExercises와 카드 상태를 보존한다');
```

- [ ] **Step 2: 테스트 실패를 확인한다**

Run: `npm test -- src/store/storage.test.ts`

Expected: 새 필드가 없어 FAIL.

- [ ] **Step 3: 타입과 마이그레이션을 구현한다**

`migrateState`는 배열 여부를 검사하여 다음 기본값을 넣는다.

```ts
if (!Array.isArray(parsed.completedSetIds)) parsed.completedSetIds = [];
if (!Array.isArray(parsed.rewardedSetIds)) parsed.rewardedSetIds = [];
```

기존 팩 객체 자체를 전부 다시 쓰지 않고, `source`가 없으면 소비 시점에 `'workout'`으로 간주한다.

- [ ] **Step 4: 테스트와 빌드를 실행한다**

Run: `npm test -- src/store/storage.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add src/types/index.ts src/store/storage.ts src/store/storage.test.ts
git commit -m "feat: persist card set rewards"
```

---

### Task 3: 특별상자 등급 추첨과 세트 가중치

**Files:**
- Modify: `src/game/cardDraw.ts`
- Create or Modify: `src/game/cardDraw.test.ts`

**Interfaces:**
- Extend: `drawCard(relatedCategories, legendaryPityCounter, options?)`
- Produces: `DrawCardOptions`

```ts
interface DrawCardOptions {
  packSource?: 'workout' | 'set-completion';
  featuredSetId?: CardSetId;
  sourceSetId?: CardSetId;
  random?: () => number;
}
```

- [ ] **Step 1: 확률과 가중치 실패 테스트를 작성한다**

테스트 가능한 `random` 주입을 사용해 다음을 검증한다.

```ts
it('세트 특별상자는 일반 카드를 절대 뽑지 않는다');
it('특별상자 경계값은 레어 70%, 슈퍼레어 25%, 레전더리 5%다');
it('일반 운동팩의 기존 확률은 변경되지 않는다');
it('오늘의 세트 카드는 관련 카드 가중치 5를 받는다');
it('일반 관련 카드는 가중치 3을 받는다');
it('특별상자 sourceSetId 가중치와 featuredSetId를 중복 곱하지 않는다');
it('해당 등급 카드가 없으면 전체 카드 풀로 폴백한다');
```

- [ ] **Step 2: 테스트 실패를 확인한다**

Run: `npm test -- src/game/cardDraw.test.ts`

Expected: 옵션 미지원으로 FAIL.

- [ ] **Step 3: 추첨 로직을 최소 변경한다**

기존 일반 팩 경로는 기존 상수와 순서를 그대로 사용한다. 특별상자일 때만 별도 등급 테이블을 선택한다.

```ts
const SET_COMPLETION_RATES = {
  common: 0,
  rare: 0.7,
  'super-rare': 0.25,
  legendary: 0.05,
} as const;
```

카드 선택은 배열 복제 대신 `{ card, weight }` 누적 합 방식으로 바꿔 3과 5 가중치를 정확히 처리한다.

- [ ] **Step 4: 테스트와 빌드를 실행한다**

Run: `npm test -- src/game/cardDraw.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add src/game/cardDraw.ts src/game/cardDraw.test.ts
git commit -m "feat: add set completion reward packs"
```

---

### Task 4: 오늘의 집중 세트와 완성 보상 원자 처리

**Files:**
- Create: `src/game/dailyFeaturedSet.ts`
- Create: `src/game/dailyFeaturedSet.test.ts`
- Modify: `src/store/GameContext.tsx`
- Modify/Create: `src/store/GameContext.test.tsx`

**Interfaces:**
- Produces: `getLocalDateKey(date: Date): string`
- Produces: `getDailyFeaturedSet(date: Date): CardSetDefinition`
- `OPEN_PACK` 결과에 `completedSetIds`, `rewardedSetIds`, 특별상자 생성까지 한 번에 반영한다.

- [ ] **Step 1: 날짜 함수 테스트를 작성한다**

```ts
it('같은 로컬 날짜에는 같은 세트를 반환한다');
it('결과는 항상 CARD_SETS 중 하나다');
it('UTC 날짜가 아니라 로컬 연월일을 사용한다');
it('시간대가 다른 동일 UTC 시각도 각 로컬 날짜 키를 따른다');
```

해시는 문자열 문자 코드 기반의 간단한 결정적 함수로 고정한다.

- [ ] **Step 2: 완성 보상 상태 테스트를 작성한다**

Context harness로 다음을 검증한다.

```ts
it('마지막 카드를 처음 획득하면 특별상자 한 개와 세트 상태를 함께 저장한다');
it('이미 rewardedSetIds에 있는 세트는 다시 지급하지 않는다');
it('같은 OPEN_PACK 액션이 중복돼도 상자가 추가되지 않는다');
it('특별상자에 source와 sourceSetId가 기록된다');
it('완성되지 않은 카드 획득은 특별상자를 만들지 않는다');
it('한 카드 획득으로 최대 한 세트만 완료된다');
```

- [ ] **Step 3: 테스트 실패를 확인한다**

Run: `npm test -- src/game/dailyFeaturedSet.test.ts src/store/GameContext.test.tsx`

Expected: 기능이 없어 FAIL.

- [ ] **Step 4: reducer를 원자적으로 구현한다**

`OPEN_PACK` 안에서 다음 순서를 지킨다.

1. 기존 `ownedCards`로 `beforeOwned`를 보존한다.
2. 새 카드를 반영한 `afterOwned`를 만든다.
3. `findNewlyCompletedSets(beforeOwned, afterOwned, state.rewardedSetIds)`를 호출한다.
4. 첫 번째 신규 완성 세트에 대해 `set-completion` 팩을 하나 만든다.
5. `ownedCards`, `completedSetIds`, `rewardedSetIds`, `grantedPacks`를 하나의 반환 객체에서 갱신한다.

특별상자 `packDefId`는 기존 팩 화면과 자산을 재사용할 수 있는 명시적 값으로 정의하되, 실제 추첨 규칙은 `source`로 결정한다.

- [ ] **Step 5: 테스트와 빌드를 실행한다**

Run: `npm test -- src/game/dailyFeaturedSet.test.ts src/store/GameContext.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add src/game/dailyFeaturedSet.ts src/game/dailyFeaturedSet.test.ts src/store/GameContext.tsx src/store/GameContext.test.tsx
git commit -m "feat: grant rewards for completed card sets"
```

---

### Task 5: 홈과 도감 UI

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/HomeScreen.css`
- Modify: `src/screens/CollectionScreen.tsx`
- Modify: `src/screens/CollectionScreen.css`
- Create/Modify: corresponding screen tests

**Interfaces:**
- Home consumes: `selectHomeCardSet`, `getDailyFeaturedSet`, `state.grantedPacks`
- Collection consumes: `CARD_SETS`, `getCardSetProgress`
- Navigation passes optional collection set focus through existing screen state without adding a new top-level route.

- [ ] **Step 1: 홈 UI 실패 테스트를 작성한다**

```ts
it('완성에 가장 가까운 세트와 진행 수를 표시한다');
it('마지막 한 장이면 누락 카드 이름을 표시한다');
it('오늘의 집중 세트와 등장 확률 UP 문구를 표시한다');
it('미개봉 세트 특별상자가 있으면 특별상자 열기 상태를 우선 표시한다');
it('카드를 누르면 도감으로 이동한다');
```

- [ ] **Step 2: 도감 UI 실패 테스트를 작성한다**

```ts
it('전체와 6개 세트 필터를 표시한다');
it('세트 필터 선택 시 정확히 4장만 표시한다');
it('미획득 카드는 실루엣과 미획득 상태로 표시한다');
it('완성 세트에 완성 배지와 칭호를 표시한다');
it('진행률과 획득 수를 표시한다');
```

- [ ] **Step 3: 테스트 실패를 확인한다**

Run: `npm test -- src/screens/HomeScreen.test.tsx src/screens/CollectionScreen.test.tsx`

Expected: UI가 없어 FAIL.

- [ ] **Step 4: 홈의 작은 진행 카드를 구현한다**

기존 홈 정보 구조를 유지하고 대형 섹션을 추가하지 않는다. 표시 우선순위는 다음과 같다.

1. 미개봉 `set-completion` 팩
2. 완성까지 가장 가까운 미완성 세트
3. 모든 세트 완성 시 전체 완성 상태

- [ ] **Step 5: 도감 세트 필터와 상태를 구현한다**

기존 카드 컴포넌트와 그리드를 재사용한다. 미획득 카드는 이미지에 CSS `filter`, `opacity`를 적용하고 카드 이름은 유지하되 획득 정보는 숨긴다.

- [ ] **Step 6: 접근성과 모바일 상태를 확인한다**

- 필터는 `aria-pressed` 또는 탭 패턴을 사용한다.
- 진행률은 텍스트와 `aria-valuenow`를 함께 제공한다.
- 360px 폭에서 가로 스크롤 또는 버튼 겹침이 없어야 한다.

- [ ] **Step 7: 테스트와 빌드를 실행한다**

Run: `npm test -- src/screens/HomeScreen.test.tsx src/screens/CollectionScreen.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 8: 커밋한다**

```bash
git add src/screens/HomeScreen.tsx src/screens/HomeScreen.css src/screens/CollectionScreen.tsx src/screens/CollectionScreen.css src/screens/HomeScreen.test.tsx src/screens/CollectionScreen.test.tsx
git commit -m "feat: show card set progress on home and collection"
```

---

### Task 6: 개봉 완료 연출과 캐릭터 대사

**Files:**
- Modify: `src/screens/PackOpeningScreen.tsx`
- Modify: `src/screens/PackOpeningScreen.css`
- Modify: `src/game/characterDialogue.ts`
- Modify/Create corresponding tests

**Interfaces:**
- Pack screen determines completion from the opened pack result and `completionTriggeredAt` or newly completed set metadata.
- Dialogue context adds `recentCompletedSet?: CardSetDefinition` above ordinary progress contexts but below unopened reward urgency if the special pack is still unopened.

- [ ] **Step 1: 완성 연출 테스트를 작성한다**

```ts
it('세트 마지막 카드 개봉 후 기존 카드 결과 다음에 세트 완성 메시지를 표시한다');
it('세트 이름, 4장 요약, 특별상자 지급 문구를 표시한다');
it('건너뛰기 또는 확인으로 즉시 종료할 수 있다');
it('일반 카드 획득에는 완성 연출을 표시하지 않는다');
```

- [ ] **Step 2: 캐릭터 대사 테스트를 작성한다**

```ts
it('최근 완성 세트가 있으면 해당 세트 이름이 포함된 축하 대사를 후보에 넣는다');
it('특별상자가 미개봉이면 상자를 열자는 대사를 우선한다');
it('기존 대사 반복 방지 동작을 유지한다');
```

- [ ] **Step 3: 테스트 실패를 확인한다**

Run: `npm test -- src/screens/PackOpeningScreen.test.tsx src/game/characterDialogue.test.ts`

Expected: 기능이 없어 FAIL.

- [ ] **Step 4: 짧고 건너뛸 수 있는 연출을 구현한다**

기존 결과 화면을 먼저 그대로 보여주고, 확인 후 또는 짧은 지연 뒤 별도 오버레이를 표시한다. 자동 연출 총시간은 3초를 넘기지 않으며 `prefers-reduced-motion`에서는 즉시 정적 상태로 표시한다.

- [ ] **Step 5: 대사 문맥을 추가한다**

세트 이름을 안전하게 전달하고 다음 형태의 대사를 세트별로 생성한다.

```ts
`${set.name} 세트를 전부 모았어!`
'특별상자가 도착했어. 열어보자!'
```

- [ ] **Step 6: 테스트와 빌드를 실행한다**

Run: `npm test -- src/screens/PackOpeningScreen.test.tsx src/game/characterDialogue.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add src/screens/PackOpeningScreen.tsx src/screens/PackOpeningScreen.css src/game/characterDialogue.ts src/screens/PackOpeningScreen.test.tsx src/game/characterDialogue.test.ts
git commit -m "feat: celebrate completed card sets"
```

---

### Task 7: 전체 회귀와 PR 검증

**Files:**
- Modify tests only when a real regression requires a fixture update.
- Modify: PR description after verification.

- [ ] **Step 1: 전체 테스트를 실행한다**

Run: `npm test`

Expected: 모든 테스트 PASS.

- [ ] **Step 2: 정적 검증을 실행한다**

Run: `npm run lint && npm run build`

Expected: 두 명령 모두 성공.

- [ ] **Step 3: 핵심 수동 흐름을 확인한다**

1. 운동 기록 후 일반 팩 지급
2. 일반 팩에서 기존 확률·연출 유지
3. 마지막 세트 카드 획득
4. 완성 연출 표시
5. 특별상자 정확히 1개 지급
6. 새로고침 후 중복 지급 없음
7. 특별상자에서 레어 이상 획득
8. 홈에 오늘의 집중 세트 표시
9. 홈 진행 카드에서 도감 이동
10. 도감 필터·실루엣·완성 배지 표시
11. 사용자 직접 입력 운동 기록과 보상 정상 작동
12. 홈 캐릭터 클릭 상호작용 정상 작동

- [ ] **Step 4: 최종 diff를 검토한다**

세트 ID, 카드 ID 중복, 저장 마이그레이션, `OPEN_PACK` 원자성, 타이머 정리를 집중 확인한다.

- [ ] **Step 5: Vercel 상태를 확인한다**

빌드 제한으로 실행되지 않을 경우 코드 실패로 표현하지 않고 제한 상태를 PR에 기록한다. 배포가 실행되면 성공 상태와 Preview URL을 기록한다.

- [ ] **Step 6: PR 설명을 갱신한다**

추가된 세트 6개, 특별상자 확률, 오늘의 보너스, 홈·도감 UI, 테스트 명령과 결과를 명시한다. PR은 병합하지 않는다.

- [ ] **Step 7: 최종 커밋이 필요한 경우에만 커밋한다**

```bash
git add .
git commit -m "test: verify card set collection loop"
```
