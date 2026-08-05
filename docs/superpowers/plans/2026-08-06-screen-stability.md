# 화면 안정화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 디자인과 기능을 유지하면서 320px 이상 모바일 세로 화면, 짧은 가로 화면, 소프트 키보드, 모달·바텀시트 상황에서 겹침·잘림·가로 스크롤이 발생하지 않도록 앱 전체 화면을 안정화한다.

**Architecture:** 기존 `installViewportHeightSync`를 확장해 실제 표시 높이, 레이아웃 뷰포트 높이, 키보드 높이와 열림 상태를 하나의 공통 계층에서 계산하고 CSS 변수와 앱 상태로 제공한다. 앱 셸은 이 상태로 하단 내비게이션 표시와 공통 화면 여백을 제어하며, 모달·바텀시트는 공통 스크롤 잠금 훅과 패널 구조를 사용한다. 화면별 CSS는 공통 규칙으로 해결되지 않는 320px·짧은 높이 예외만 최소 수정한다.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Testing Library, CSS custom properties, Visual Viewport API

## Global Constraints

- 기존 색상, 캐릭터, 카드 모양, 아이콘과 주요 화면 배치를 유지한다.
- 새 기능을 추가하지 않는다.
- 모바일 세로 화면은 320×568, 360×640, 390×844, 412×915를 지원한다.
- 가로 화면은 전용 재설계하지 않고 잘림·겹침 없이 스크롤 가능해야 한다.
- 키보드가 열리면 입력 영역과 저장 버튼이 보여야 하며 하단 내비게이션은 숨긴다.
- 키보드 닫힘 후 하단 내비게이션과 화면 높이는 원상 복구되어야 한다.
- `visualViewport` 미지원 환경은 `window.innerHeight`로 대체한다.
- 키보드 열림 판단은 단순 주소창 변화와 혼동하지 않도록 최소 높이 임계값을 사용한다.
- 모든 주요 버튼과 닫기 버튼은 최소 44×44px 터치 영역을 확보한다.
- 모달과 바텀시트는 실제 화면 높이 안에 머물고, 헤더는 유지하며 내용만 내부 스크롤한다.
- 모달이 열릴 때 배경 스크롤을 잠그고 닫힐 때 기존 스크롤 위치를 복원한다.
- 긴 운동명, 메모, 카드명과 큰 숫자는 가로 레이아웃을 밀어내지 않아야 한다.
- 총볼륨, 목표, 업적, 새 화면, 라우터 전환은 이번 범위에서 제외한다.
- PR #14는 사용자의 명시적 요청 전까지 병합하지 않는다.

---

## File Structure

- Modify: `src/utils/viewport.ts` — 실제 화면 높이, 키보드 높이·열림 판정, CSS 변수 동기화.
- Modify: `src/utils/viewport.test.ts` — Visual Viewport 미지원, 주소창 변화, 키보드 열림·닫힘, 리스너 정리 테스트.
- Create: `src/hooks/useViewportState.ts` — 앱 컴포넌트가 사용할 반응형 뷰포트·키보드 상태 훅.
- Create: `src/hooks/useViewportState.test.tsx` — 훅 상태 변경과 정리 테스트.
- Create: `src/hooks/useBodyScrollLock.ts` — 중첩 가능한 body 스크롤 잠금과 위치 복원.
- Create: `src/hooks/useBodyScrollLock.test.tsx` — 잠금·중첩·복원 테스트.
- Modify: `src/App.tsx` — 키보드 상태에 따른 하단 내비게이션 표시와 앱 셸 data 속성.
- Modify: `src/App.css` — 앱 셸 높이·공통 스크롤 영역·하단 여백.
- Modify: `src/MobileViewport.css` — safe-area, 공통 오버플로 보호, 320px·짧은 높이·가로 화면 규칙.
- Modify: `src/components/BottomNav.tsx` — 접근성·중복 탭 방지에 필요한 최소 상태 처리.
- Modify: `src/components/BottomNav.css` — 44px 터치 영역, safe-area 높이, 숨김 상태 안정화.
- Modify: `src/screens/RecordScreen.tsx` — 포커스된 입력과 저장 버튼 노출을 위한 스크롤 처리.
- Modify: `src/screens/RecordScreen.css` — 320px 입력 행, 긴 운동명, 키보드 상태 레이아웃.
- Modify: `src/screens/HomeScreen.css` — 작은 폭·짧은 높이에서 카드와 핵심 행동 우선순위.
- Modify: `src/screens/CollectionScreen.css` — 반응형 카드 그리드, 고정 이미지 비율, 긴 카드명.
- Modify: `src/screens/RewardsScreen.css` — 공통 화면 스크롤과 긴 텍스트 대응.
- Modify: `src/screens/RewardsReport.css` — 작은 폭 탭·통계·운동명 버튼 안정화.
- Modify: `src/screens/WorkoutReportPanel.css` — 기간 선택·캘린더·통계 그리드 320px 대응.
- Modify: `src/screens/ExerciseAnalysisScreen.css` — 큰 숫자, SVG, 기록 목록 320px 대응.
- Modify: `src/screens/WorkoutDayDetailSheet.tsx` — 공통 body 스크롤 잠금 적용.
- Modify: `src/screens/WorkoutDayDetailSheet.css` — 고정 헤더와 내부 스크롤 패널.
- Modify: `src/screens/CardSetCompletionModal.tsx` — 공통 body 스크롤 잠금 적용.
- Modify: `src/screens/CardSetCompletionModal.css` — 실제 화면 높이 기반 내부 스크롤.
- Modify: `src/screens/ComboPackOpeningScreen.css` — 짧은 화면과 가로 화면에서 결과·버튼 접근 가능.
- Test: `src/screens/RecordScreen.test.tsx`
- Test: `src/screens/WorkoutDayDetailSheet.test.tsx`
- Test: `src/screens/CardSetCompletionModal.test.tsx`
- Create: `src/screens/ScreenStability.test.tsx` — 320px, 긴 텍스트, 하단 내비게이션·상세 상태 회귀 테스트.

---

### Task 1: 뷰포트와 키보드 상태 계산

**Files:**
- Modify: `src/utils/viewport.ts`
- Modify: `src/utils/viewport.test.ts`
- Create: `src/hooks/useViewportState.ts`
- Create: `src/hooks/useViewportState.test.tsx`

**Interfaces:**
- Produces: `ViewportState`
- Produces: `measureViewport(windowLike): ViewportState`
- Produces: `syncViewportCssVariables(state, target): void`
- Produces: `installViewportHeightSync(root?, onChange?): () => void`
- Produces: `useViewportState(): ViewportState`

- [ ] **Step 1: 뷰포트 판정 실패 테스트를 작성한다**

`src/utils/viewport.test.ts`에 다음 핵심 사례를 추가한다.

```ts
import { describe, expect, it, vi } from 'vitest';
import { measureViewport, syncViewportCssVariables } from './viewport';

describe('measureViewport', () => {
  it('visualViewport가 없으면 innerHeight를 사용한다', () => {
    expect(measureViewport({ innerHeight: 800 })).toMatchObject({
      layoutHeight: 800,
      visibleHeight: 800,
      keyboardHeight: 0,
      isKeyboardOpen: false,
    });
  });

  it('차이가 임계값 이상이면 키보드가 열린 것으로 판단한다', () => {
    expect(measureViewport({ innerHeight: 800, visualViewportHeight: 470 })).toMatchObject({
      visibleHeight: 470,
      keyboardHeight: 330,
      isKeyboardOpen: true,
    });
  });

  it('주소창 수준의 작은 높이 변화는 키보드로 판단하지 않는다', () => {
    expect(measureViewport({ innerHeight: 800, visualViewportHeight: 720 }).isKeyboardOpen).toBe(false);
  });
});

it('공통 CSS 변수를 동기화한다', () => {
  const setProperty = vi.fn();
  syncViewportCssVariables({
    layoutHeight: 800,
    visibleHeight: 470,
    keyboardHeight: 330,
    isKeyboardOpen: true,
  }, { setProperty });
  expect(setProperty).toHaveBeenCalledWith('--app-viewport-height', '470px');
  expect(setProperty).toHaveBeenCalledWith('--keyboard-height', '330px');
  expect(setProperty).toHaveBeenCalledWith('--keyboard-open', '1');
});
```

- [ ] **Step 2: 테스트 실패를 확인한다**

Run: `npm test -- src/utils/viewport.test.ts`

Expected: `measureViewport`와 새 타입이 없어 FAIL.

- [ ] **Step 3: 순수 계산과 CSS 변수 동기화를 구현한다**

`src/utils/viewport.ts`에 아래 계약을 구현한다.

```ts
export const KEYBOARD_OPEN_THRESHOLD_PX = 160;

export interface ViewportMeasurement {
  innerHeight: number;
  visualViewportHeight?: number;
  visualViewportOffsetTop?: number;
}

export interface ViewportState {
  layoutHeight: number;
  visibleHeight: number;
  keyboardHeight: number;
  isKeyboardOpen: boolean;
}

export function measureViewport(measurement: ViewportMeasurement): ViewportState;
export function syncViewportCssVariables(state: ViewportState, target: CssVariableTarget): void;
```

계산 규칙:

- `layoutHeight = Math.max(0, Math.round(innerHeight))`
- `visibleHeight = Math.max(0, Math.round(visualViewportHeight ?? innerHeight))`
- `rawDifference = Math.max(0, layoutHeight - visibleHeight - Math.max(0, visualViewportOffsetTop ?? 0))`
- `isKeyboardOpen = rawDifference >= 160`
- 키보드가 아니면 `keyboardHeight = 0`
- CSS 변수는 `--app-layout-height`, `--app-viewport-height`, `--keyboard-height`, `--keyboard-open`을 설정한다.

- [ ] **Step 4: 설치 함수의 변경 통지와 이벤트 정리를 구현한다**

```ts
export function installViewportHeightSync(
  root: HTMLElement = document.documentElement,
  onChange?: (state: ViewportState) => void,
): () => void;
```

`resize`, `orientationchange`, `visualViewport.resize`, `visualViewport.scroll`에서 한 프레임에 한 번만 갱신하도록 `requestAnimationFrame`을 사용하고 cleanup에서 예약 프레임과 리스너를 모두 제거한다.

- [ ] **Step 5: React 훅 실패 테스트와 구현을 추가한다**

`useViewportState`는 초기 렌더에서 `measureViewport` 결과를 반환하고 `installViewportHeightSync`의 `onChange`로 상태를 갱신한다. 언마운트 시 cleanup을 호출하는 테스트를 작성한 뒤 구현한다.

- [ ] **Step 6: 단위 테스트를 실행한다**

Run: `npm test -- src/utils/viewport.test.ts src/hooks/useViewportState.test.tsx`

Expected: PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add src/utils/viewport.ts src/utils/viewport.test.ts src/hooks/useViewportState.ts src/hooks/useViewportState.test.tsx
git commit -m "fix: stabilize viewport and keyboard detection"
```

---

### Task 2: 앱 셸과 하단 내비게이션 안정화

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `src/MobileViewport.css`
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/components/BottomNav.css`
- Create: `src/App.test.tsx`

**Interfaces:**
- Consumes: `useViewportState(): ViewportState`
- Produces: `.app-shell[data-keyboard-open="true|false"]`
- Produces: 하단 내비게이션 표시 조건 `screen !== 'pack-opening' && !isKeyboardOpen`

- [ ] **Step 1: 키보드 중 하단 내비게이션 숨김 테스트를 작성한다**

`useViewportState`를 mock해 `isKeyboardOpen: true`일 때 BottomNav가 렌더링되지 않고, false일 때 렌더링되는 테스트를 작성한다.

```tsx
expect(screen.queryByRole('navigation', { name: '주요 메뉴' })).not.toBeInTheDocument();
```

- [ ] **Step 2: 테스트 실패를 확인한다**

Run: `npm test -- src/App.test.tsx`

Expected: 현재 App이 키보드 상태를 사용하지 않아 FAIL.

- [ ] **Step 3: AppShell에 뷰포트 상태를 연결한다**

- 기존 `useEffect(() => installViewportHeightSync(), [])`를 제거한다.
- `const viewport = useViewportState()`를 사용한다.
- `.app-shell`에 `data-keyboard-open={viewport.isKeyboardOpen}`를 추가한다.
- `showBottomNav`를 `screen !== 'pack-opening' && !viewport.isKeyboardOpen`으로 계산한다.
- 화면 전환 함수에는 새 기능을 추가하지 않는다.

- [ ] **Step 4: 공통 화면 높이와 여백 CSS를 구현한다**

```css
:root {
  --bottom-nav-height: 72px;
  --app-layout-height: 100dvh;
  --app-viewport-height: 100dvh;
  --keyboard-height: 0px;
}

.app-shell {
  width: 100%;
  height: var(--app-viewport-height);
  min-height: 0;
  overflow: hidden;
}

.app-shell__screen {
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.app-shell:not([data-keyboard-open='true']) .app-shell__screen {
  padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom));
}
```

기존 화면별 하단 여백과 중복되지 않게 실제 CSS를 검토해 하나의 계층만 책임지도록 정리한다.

- [ ] **Step 5: BottomNav 터치 영역과 중복 탭 방지를 적용한다**

- `<nav aria-label="주요 메뉴">`를 보장한다.
- 모든 버튼은 최소 44×44px.
- safe-area는 nav 패딩에만 한 번 적용한다.
- 이미 활성 탭을 다시 눌렀을 때 화면 상태를 초기화하지 않도록 `if (item.id !== active) onSelect(item.id)` 형태로 처리한다.

- [ ] **Step 6: 테스트와 빌드를 실행한다**

Run: `npm test -- src/App.test.tsx src/utils/viewport.test.ts src/hooks/useViewportState.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add src/App.tsx src/App.css src/MobileViewport.css src/components/BottomNav.tsx src/components/BottomNav.css src/App.test.tsx
git commit -m "fix: stabilize app shell and bottom navigation"
```

---

### Task 3: 공통 body 스크롤 잠금과 오버레이 구조

**Files:**
- Create: `src/hooks/useBodyScrollLock.ts`
- Create: `src/hooks/useBodyScrollLock.test.tsx`
- Modify: `src/screens/WorkoutDayDetailSheet.tsx`
- Modify: `src/screens/WorkoutDayDetailSheet.css`
- Modify: `src/screens/CardSetCompletionModal.tsx`
- Modify: `src/screens/CardSetCompletionModal.css`
- Modify: `src/screens/ComboPackOpeningScreen.css`

**Interfaces:**
- Produces: `useBodyScrollLock(locked: boolean): void`
- Uses module-level lock count so nested overlays restore body only after the last overlay closes.

- [ ] **Step 1: 중첩 잠금 실패 테스트를 작성한다**

테스트 구성:

1. `window.scrollY = 240`을 mock한다.
2. 첫 훅이 활성화되면 body에 `position: fixed`, `top: -240px`, `width: 100%`, `overflow: hidden`이 적용되는지 확인한다.
3. 두 번째 훅이 활성화된 뒤 첫 번째가 해제되어도 잠금이 유지되는지 확인한다.
4. 마지막 훅이 해제되면 원래 style과 `window.scrollTo(0, 240)`가 복원되는지 확인한다.

- [ ] **Step 2: 테스트 실패를 확인한다**

Run: `npm test -- src/hooks/useBodyScrollLock.test.tsx`

Expected: 모듈이 없어 FAIL.

- [ ] **Step 3: 중첩 가능한 훅을 구현한다**

모듈 수준 변수 `lockCount`, `savedScrollY`, `savedBodyStyles`를 사용하고, cleanup은 같은 인스턴스에서 한 번만 감소하도록 구현한다. SSR 테스트 환경에서는 `typeof document === 'undefined'`면 아무 작업도 하지 않는다.

- [ ] **Step 4: 날짜 상세와 카드 세트 모달에 잠금을 적용한다**

각 컴포넌트에서 열림 여부를 `useBodyScrollLock(Boolean(report))`, `useBodyScrollLock(isOpen)`으로 전달한다. 기존 Escape·배경 클릭 닫기 동작은 유지한다.

- [ ] **Step 5: 오버레이 CSS를 내부 스크롤 구조로 통일한다**

패널 공통 원칙:

```css
.overlay-panel {
  max-height: calc(var(--app-viewport-height) - max(16px, env(safe-area-inset-top)) - 8px);
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.overlay-panel__header {
  flex: 0 0 auto;
}

.overlay-panel__content {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
```

현재 클래스명에 맞게 적용하고, 닫기 버튼 44×44px, 가로 화면에서 상단 여백 8px 이상을 유지한다.

- [ ] **Step 6: 오버레이 테스트와 빌드를 실행한다**

Run: `npm test -- src/hooks/useBodyScrollLock.test.tsx src/screens/WorkoutDayDetailSheet.test.tsx src/screens/CardSetCompletionModal.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add src/hooks/useBodyScrollLock.ts src/hooks/useBodyScrollLock.test.tsx src/screens/WorkoutDayDetailSheet.tsx src/screens/WorkoutDayDetailSheet.css src/screens/CardSetCompletionModal.tsx src/screens/CardSetCompletionModal.css src/screens/ComboPackOpeningScreen.css
git commit -m "fix: contain modal and sheet scrolling"
```

---

### Task 4: 운동 기록 화면 키보드·320px 대응

**Files:**
- Modify: `src/screens/RecordScreen.tsx`
- Modify: `src/screens/RecordScreen.css`
- Modify: `src/screens/RecordScreen.test.tsx`

**Interfaces:**
- Consumes: `.app-shell[data-keyboard-open='true']`
- Produces: `data-record-field` 입력 그룹 식별자와 포커스 스크롤 처리.

- [ ] **Step 1: 포커스 입력과 저장 버튼 노출 테스트를 작성한다**

- 입력 요소에 focus 이벤트를 발생시킨다.
- `scrollIntoView({ block: 'center', behavior: 'smooth' })`가 해당 입력 그룹에 호출되는지 확인한다.
- 저장 버튼은 DOM 흐름 안에 유지되고 키보드 상태에서도 렌더링되는지 확인한다.

- [ ] **Step 2: 테스트 실패를 확인한다**

Run: `npm test -- src/screens/RecordScreen.test.tsx`

Expected: 포커스 스크롤 처리가 없어 FAIL.

- [ ] **Step 3: 포커스 스크롤을 구현한다**

- RecordScreen의 스크롤 컨테이너 ref를 만든다.
- `onFocusCapture`에서 가장 가까운 `[data-record-field]`를 찾는다.
- `requestAnimationFrame` 두 번 뒤 `scrollIntoView({ block: 'center', behavior: 'smooth' })`를 호출해 키보드 전환 후 위치를 맞춘다.
- timeout이나 전역 리스너를 남기지 않는다.
- 저장 후 기존 완료 동작은 변경하지 않는다.

- [ ] **Step 4: 320px CSS를 구현한다**

- 모든 flex/grid 자식에 필요한 `min-width: 0` 적용.
- 운동명 영역은 `overflow-wrap: anywhere`, 최대 2줄.
- 중량·반복·세트 입력은 `grid-template-columns: repeat(3, minmax(0, 1fr))`로 유지하며 gap을 320px에서 축소.
- number input은 `width: 100%; min-width: 0`.
- 저장 버튼은 sticky/fixed가 아니라 문서 흐름에 두고 최소 44px.
- 키보드 상태에서는 화면 아래 패딩을 `max(16px, env(safe-area-inset-bottom))`로 축소한다.

- [ ] **Step 5: 테스트와 빌드를 실행한다**

Run: `npm test -- src/screens/RecordScreen.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add src/screens/RecordScreen.tsx src/screens/RecordScreen.css src/screens/RecordScreen.test.tsx
git commit -m "fix: keep workout inputs visible above keyboard"
```

---

### Task 5: 홈·도감·보상·리포트 화면 반응형 보강

**Files:**
- Modify: `src/screens/HomeScreen.css`
- Modify: `src/screens/CollectionScreen.css`
- Modify: `src/screens/RewardsScreen.css`
- Modify: `src/screens/RewardsReport.css`
- Modify: `src/screens/WorkoutReportPanel.css`
- Modify: `src/screens/ExerciseAnalysisScreen.css`
- Create: `src/screens/ScreenStability.test.tsx`

**Interfaces:**
- Consumes: 공통 CSS 변수 `--app-viewport-height`, `--bottom-nav-height`.
- Produces: 320px에서 가로 overflow 없이 렌더링되는 주요 화면 CSS 계약.

- [ ] **Step 1: 긴 텍스트와 좁은 화면 회귀 테스트를 작성한다**

Testing Library와 `window.innerWidth = 320` mock을 사용해 다음을 렌더링한다.

- 매우 긴 사용자 운동명
- 6자리 이상 통계 숫자
- 긴 메모
- 도감 카드명

각 주요 텍스트 요소가 렌더링되고 화면 전환·상세 진입 버튼이 접근 가능한지 확인한다. JSDOM이 실제 레이아웃을 계산하지 않으므로 CSS 수치 자체가 아니라 필요한 class/data 속성, 버튼 존재, SVG `viewBox`, 텍스트 컨테이너 구조를 계약으로 검사한다.

- [ ] **Step 2: 테스트 실패를 확인한다**

Run: `npm test -- src/screens/ScreenStability.test.tsx`

Expected: 일부 구조·접근성 계약이 없어 FAIL.

- [ ] **Step 3: 홈 화면을 보강한다**

- 카드와 캐릭터 래퍼에 `min-width: 0`.
- 제목은 2줄까지, 배지는 `flex-shrink: 0`.
- `@media (max-height: 650px)`에서 장식 여백을 축소하되 사진 촬영/기록 핵심 버튼은 숨기지 않는다.
- 마지막 콘텐츠의 별도 과대 padding-bottom은 앱 셸과 중복되지 않게 제거한다.

- [ ] **Step 4: 도감 화면을 보강한다**

```css
.collection-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(138px, 42vw), 1fr));
}

.collection-card__image {
  aspect-ratio: 3 / 4;
  overflow: hidden;
}
```

- 카드 이미지와 fallback 모두 동일한 aspect-ratio 유지.
- 카드명은 2줄 제한, 희귀도 배지는 이미지 영역 밖으로 밀리지 않음.
- 320px에서는 최소 2열을 강제하지 말고 실제 minmax 결과를 따른다.

- [ ] **Step 5: 보상·리포트·분석 화면을 보강한다**

- 3개 상단 탭은 한 줄 유지, 각 버튼 `min-width: 0`, 글자 크기 `clamp`.
- 통계 그리드는 320px에서 2열 또는 해당 화면의 최소 안정 열 수로 전환.
- 숫자는 `font-size: clamp(...)`, `overflow-wrap: anywhere`, 단위는 축소.
- 기간 이동 버튼은 44×44px.
- 캘린더 셀은 `min-width: 0`, 긴 월 라벨은 한 줄 축소.
- SVG는 `width: 100%; height: auto; max-width: 100%`와 고정 `viewBox` 사용.
- 운동명·메모·기록 텍스트는 `overflow-wrap: anywhere`.
- 분석 화면은 기존 리포트를 DOM에서 유지하므로 뒤로가기 상태 보존 구조를 변경하지 않는다.

- [ ] **Step 6: 짧은 가로 화면 규칙을 추가한다**

`@media (orientation: landscape) and (max-height: 500px)`에서:

- 화면 전체는 세로 스크롤 가능.
- 상단 장식 여백 축소.
- 모달 패널 top/bottom gap 최소 8px.
- 닫기·뒤로가기 버튼은 숨기지 않음.
- 카드팩 결과 버튼이 콘텐츠 뒤에 가려지지 않음.

- [ ] **Step 7: 테스트와 빌드를 실행한다**

Run: `npm test -- src/screens/ScreenStability.test.tsx src/screens/ExerciseTrendChart.test.tsx src/screens/WorkoutDayDetailSheet.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 8: 커밋한다**

```bash
git add src/screens/HomeScreen.css src/screens/CollectionScreen.css src/screens/RewardsScreen.css src/screens/RewardsReport.css src/screens/WorkoutReportPanel.css src/screens/ExerciseAnalysisScreen.css src/screens/ScreenStability.test.tsx
git commit -m "fix: harden screens for narrow mobile viewports"
```

---

### Task 6: 최종 회귀 검증과 PR 갱신

**Files:**
- Modify only if failures require focused fixes in files already listed.
- Modify: PR #14 title/body through GitHub API.

**Interfaces:**
- Produces: 검증 결과와 알려진 제한이 반영된 PR 설명.

- [ ] **Step 1: 전체 자동 테스트를 실행한다**

Run: `npm test`

Expected: 모든 테스트 PASS.

- [ ] **Step 2: 프로덕션 빌드를 실행한다**

Run: `npm run build`

Expected: TypeScript와 Vite 빌드 PASS.

- [ ] **Step 3: 수동 화면 점검을 수행한다**

브라우저 개발자 도구에서 다음 크기를 각각 확인한다.

```text
320 × 568
360 × 640
390 × 844
412 × 915
844 × 390 landscape
640 × 360 landscape
```

각 크기에서 체크:

- 홈·기록·도감·보상 탭에 가로 스크롤 없음
- 콘텐츠가 하단 내비게이션에 가려지지 않음
- 키보드가 열리면 nav가 숨고 입력·저장 버튼 접근 가능
- 키보드를 닫으면 nav와 화면 높이 복원
- 카드 상세·세트 완료·날짜 상세 패널이 화면 안에 존재
- 패널 헤더와 닫기 버튼 고정, 내용만 스크롤
- 긴 운동명·메모·큰 숫자 겹침 없음
- 리포트 → 운동 분석 → 뒤로가기 후 기간·탭 상태 유지
- 가로 회전 후 닫기 버튼 접근 가능

- [ ] **Step 4: 실패가 있으면 해당 작업 범위 안에서 최소 수정한다**

수정 후 관련 단일 테스트와 `npm run build`를 다시 실행하고, 전체 테스트를 마지막에 다시 실행한다. 새 기능이나 디자인 재구성은 하지 않는다.

- [ ] **Step 5: 최종 커밋 SHA와 CI 상태를 확인한다**

```bash
git status --short
git log -1 --oneline
```

GitHub에서 head SHA의 Vercel 상태를 확인한다. 빌드 횟수 제한이면 코드 실패와 구분해 PR 설명에 명시한다.

- [ ] **Step 6: PR 설명을 갱신한다**

PR #14에 다음 내용을 추가한다.

```markdown
## 화면 안정화
- 320px 이상 모바일 세로 화면 대응
- Visual Viewport 기반 실제 화면 높이·키보드 감지
- 키보드 중 하단 내비게이션 숨김과 입력 영역 자동 노출
- safe-area와 하단 여백 공통화
- 모달·바텀시트 내부 스크롤과 배경 스크롤 잠금
- 홈·기록·도감·보상·리포트·분석 화면 긴 텍스트·큰 숫자 보호
- 짧은 가로 화면에서 잘림 없이 스크롤 가능

## 검증
- `npm test`: [실제 결과]
- `npm run build`: [실제 결과]
- 수동 확인: 320×568, 360×640, 390×844, 412×915, 짧은 가로 화면
```

실행하지 못한 검증은 PASS로 쓰지 않고 이유를 그대로 기록한다.

- [ ] **Step 7: 완료 상태를 보고한다**

변경 파일, 최종 SHA, 테스트·빌드 결과, Vercel 상태, 남은 수동 확인 항목을 사용자에게 알려준다. PR은 병합하지 않는다.
