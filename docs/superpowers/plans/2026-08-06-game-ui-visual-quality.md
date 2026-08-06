# Game UI Visual Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 기능·이미지·정보 구조를 유지하면서 전 화면의 레이아웃, 패널, 버튼, 진행도, 희귀도 표현을 일본 캐주얼 수집형 게임 UI로 개선한다.

**Architecture:** 기능 컴포넌트와 상태 로직은 유지하고, 공통 CSS 토큰과 재사용 가능한 시각 클래스부터 만든 뒤 화면별 CSS와 최소한의 마크업만 조정한다. 각 화면 작업은 독립적으로 완료·검증할 수 있게 나누며, 기존 모바일 viewport·safe-area·키보드 안정화 규칙을 덮어쓰지 않는다.

**Tech Stack:** React, TypeScript, Vite, CSS, Vitest, Testing Library, Vercel Preview

## Global Constraints

- 일본 캐주얼 수집형 게임 스타일을 사용한다.
- 기존 기능, 상태 구조, 데이터 흐름, 이미지 파일은 변경하지 않는다.
- 현재 정보 순서와 주요 화면 흐름을 유지한다.
- 신규 외부 UI 라이브러리와 애니메이션 라이브러리를 추가하지 않는다.
- 320px 너비부터 레이아웃이 깨지지 않아야 한다.
- 기존 `MobileViewport.css`, `ScreenStability.css`, safe-area, 키보드 대응을 유지한다.
- 애니메이션은 `prefers-reduced-motion`에서 비활성화하거나 단순 페이드로 대체한다.
- 장식보다 가독성, 터치 영역, 모바일 성능을 우선한다.
- 각 작업 후 관련 테스트와 `npm run build`를 실행한다.
- PR #14 브랜치에서 작업하며 병합하지 않는다.

---

## File Structure

### Create

- `src/styles/GameUiTokens.css`: 색상, 그림자, 반경, 테두리, 광택, 애니메이션 시간 등 공통 디자인 토큰
- `src/styles/GameUiPrimitives.css`: 게임 패널, 제목 배지, 게이지, 버튼, 상태 배지 등 재사용 시각 클래스
- `src/styles/GameUiTokens.test.ts`: 핵심 CSS 변수와 reduced-motion 규칙 존재 여부 검증

### Modify

- `src/App.tsx`: 공통 게임 UI 스타일 import
- `src/App.css`: 앱 배경과 공통 화면 컨테이너를 토큰 기반으로 정리
- `src/components/BottomNav.tsx`
- `src/components/BottomNav.css`
- `src/screens/HomeScreen.tsx`
- `src/screens/HomeScreen.css`
- `src/screens/HomeLevelXp.css`
- `src/screens/HomeCharacterInteraction.css`
- `src/screens/RecordScreen.tsx`
- `src/screens/RecordScreen.css`
- `src/screens/CustomExerciseEditor.css`
- `src/screens/CollectionScreen.tsx`
- `src/screens/CollectionScreen.css`
- `src/screens/CardSetProgress.css`
- `src/screens/ComboPackOpeningScreen.tsx`
- `src/screens/ComboPackOpeningScreen.css` 또는 해당 화면의 기존 스타일 파일
- `src/screens/RewardsScreen.tsx`
- `src/screens/RewardsScreen.css`
- `src/screens/WorkoutReportScreen.tsx`
- `src/screens/WorkoutReportScreen.css`
- `src/screens/ExerciseAnalysisScreen.tsx`
- `src/screens/ExerciseAnalysisScreen.css`
- `src/screens/WorkoutDayDetailSheet.css`
- `src/screens/SettingsScreen.tsx`
- `src/screens/SettingsScreen.css`
- `src/screens/CardSetCompletionModal.css`
- `src/MobileViewport.css`: 충돌하는 최소 규칙만 조정
- `src/ScreenStability.css`: 새 패널 높이·오버플로에 필요한 최소 보완

### Tests

- 기존 화면 테스트 파일을 유지하며 역할·텍스트·내비게이션 회귀를 검증
- 시각 클래스가 중요한 화면에는 클래스 기반 구조 테스트를 추가
- CSS 자체의 시각 결과는 Vercel Preview 수동 검증 체크리스트로 보완

---

### Task 1: 공통 게임 UI 토큰과 프리미티브 구축

**Files:**
- Create: `src/styles/GameUiTokens.css`
- Create: `src/styles/GameUiPrimitives.css`
- Create: `src/styles/GameUiTokens.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: 기존 앱 전역 CSS와 화면별 클래스
- Produces: `--game-*` CSS 변수와 `.game-panel`, `.game-button`, `.game-gauge`, `.game-badge`, `.game-section-title` 공통 클래스

- [ ] **Step 1: CSS 토큰 존재 여부를 검증하는 실패 테스트 작성**

```ts
import { describe, expect, it } from 'vitest';
import tokens from './GameUiTokens.css?raw';
import primitives from './GameUiPrimitives.css?raw';

describe('game UI styles', () => {
  it('공통 게임 UI 토큰을 제공한다', () => {
    expect(tokens).toContain('--game-panel-radius');
    expect(tokens).toContain('--game-shadow-raised');
    expect(tokens).toContain('--game-accent-primary');
  });

  it('공통 패널과 버튼 프리미티브를 제공한다', () => {
    expect(primitives).toContain('.game-panel');
    expect(primitives).toContain('.game-button');
    expect(primitives).toContain('.game-gauge');
  });

  it('모션 감소 환경을 지원한다', () => {
    expect(primitives).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/styles/GameUiTokens.test.ts`

Expected: FAIL because the CSS files do not exist.

- [ ] **Step 3: 공통 토큰 작성**

`GameUiTokens.css`에 아래 범주의 변수를 정의한다.

```css
:root {
  --game-bg-top: #f7fbff;
  --game-bg-bottom: #edf3ff;
  --game-panel: rgba(255, 255, 255, 0.94);
  --game-panel-border: rgba(104, 130, 184, 0.2);
  --game-accent-primary: #6f73f6;
  --game-accent-primary-dark: #565bd4;
  --game-accent-secondary: #56c8b5;
  --game-text-main: #27304a;
  --game-text-muted: #707b98;
  --game-panel-radius: 22px;
  --game-control-radius: 16px;
  --game-shadow-raised: 0 12px 28px rgba(61, 78, 128, 0.16);
  --game-shadow-pressed: 0 4px 10px rgba(61, 78, 128, 0.14);
  --game-inner-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.9);
  --game-transition-fast: 140ms;
  --game-transition-normal: 220ms;
}
```

- [ ] **Step 4: 공통 프리미티브 작성**

패널, 버튼, 게이지, 제목, 상태 배지를 구현한다. 버튼은 `transform: translateY(1px)` 눌림 상태를 제공하고 포커스 표시를 제거하지 않는다.

- [ ] **Step 5: App에서 공통 CSS import 및 배경 적용**

`App.tsx`에서 두 CSS 파일을 `App.css`보다 먼저 import한다.

```ts
import './styles/GameUiTokens.css';
import './styles/GameUiPrimitives.css';
```

`App.css`는 앱 루트 배경, 최대 폭, 화면 패딩만 토큰 기반으로 변경한다.

- [ ] **Step 6: 테스트와 빌드 실행**

Run:

```bash
npm test -- src/styles/GameUiTokens.test.ts
npm run build
```

Expected: PASS and successful production build.

- [ ] **Step 7: 커밋**

```bash
git add src/styles src/App.tsx src/App.css
git commit -m "style: add shared game UI design system"
```

---

### Task 2: 하단 내비게이션을 게임 메뉴형으로 개선

**Files:**
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/components/BottomNav.css`
- Test: existing BottomNav test or create `src/components/BottomNav.test.tsx`

**Interfaces:**
- Consumes: `active`, `onSelect`, 기존 ScreenId
- Produces: 기존 동작을 유지하는 `.bottom-nav__item--active` 게임형 탭 구조

- [ ] **Step 1: 활성 탭 구조 테스트 작성**

활성 탭에 `aria-current="page"`와 활성 클래스가 있고 클릭 시 기존 screen id가 전달되는지 검증한다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/components/BottomNav.test.tsx`

Expected: FAIL if `aria-current` or active visual class is missing.

- [ ] **Step 3: 마크업 최소 조정**

각 버튼 내부를 아이콘 플레이트와 라벨로 분리한다.

```tsx
<span className="bottom-nav__icon-plate" aria-hidden="true">
  <span className="bottom-nav__icon">{item.icon}</span>
</span>
<span className="bottom-nav__label">{item.label}</span>
```

활성 버튼에 `aria-current="page"`를 부여한다.

- [ ] **Step 4: CSS 적용**

- 반투명 상단 광택
- 활성 탭 아이콘 3px 상승
- 활성 배경 플레이트
- 44px 이상 터치 영역
- safe-area 하단 패딩 유지
- 키보드 열림 시 숨김 규칙 유지

- [ ] **Step 5: 테스트와 빌드 실행**

Run:

```bash
npm test -- src/components/BottomNav.test.tsx
npm run build
```

- [ ] **Step 6: 커밋**

```bash
git add src/components/BottomNav.tsx src/components/BottomNav.css src/components/BottomNav.test.tsx
git commit -m "style: upgrade bottom navigation game menu"
```

---

### Task 3: 홈 화면을 게임 로비형으로 개선

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/HomeScreen.css`
- Modify: `src/screens/HomeLevelXp.css`
- Modify: `src/screens/HomeCharacterInteraction.css`
- Test: existing `HomeScreen` tests or create `src/screens/HomeScreen.test.tsx`

**Interfaces:**
- Consumes: 기존 `useGame()` 값, `onNavigate`
- Produces: 기존 홈 동작을 유지하는 HUD, 주간 게이지, 수집 배너, 캐릭터 무대, 메인 CTA

- [ ] **Step 1: 핵심 홈 액션 회귀 테스트 작성**

검증 항목:

```ts
expect(screen.getByRole('button', { name: /오늘 운동 기록하기|오늘 운동 추가 기록하기/ })).toBeInTheDocument();
expect(screen.getByText(/이번 주 운동/)).toBeInTheDocument();
expect(screen.getByRole('button', { name: /세트|카드/ })).toBeInTheDocument();
```

기록 버튼 클릭 시 `onNavigate('record')`, 세트 배너 클릭 시 `onNavigate('collection')`이 호출돼야 한다.

- [ ] **Step 2: 테스트 실패 또는 기존 통과 상태 확인**

Run: `npm test -- src/screens/HomeScreen.test.tsx`

Expected: current behavior captured; any missing accessible name should fail first.

- [ ] **Step 3: 의미 있는 시각 래퍼 추가**

- HUD 배지에 `.game-badge`
- 주간 목표에 `.game-panel home-screen__weekly-panel`
- 세트 배너에 `.game-panel home-screen__collection-banner`
- 메인 CTA에 `.game-button home-screen__cta`
- 캐릭터 영역에 `.home-screen__character-stage`

기존 데이터와 이벤트 핸들러는 변경하지 않는다.

- [ ] **Step 4: 홈 CSS 개선**

- 상단 HUD를 게임 상태판처럼 표현
- 주간 목표를 경험치 게이지 스타일로 변경
- 세트 배너에 완성 임박 상태 강조
- 캐릭터 하단에 원형 무대·그림자·은은한 후광
- 메인 CTA를 가장 강한 시각 요소로 유지
- 미개봉 팩의 NEW 배지와 약한 후광
- 320px에서 모든 HUD가 줄바꿈 또는 축소되도록 처리

- [ ] **Step 5: 레벨 팝오버와 대화 말풍선 개선**

팝오버는 고정 폭을 쓰지 않고 `min()` 또는 `clamp()`로 화면에 맞춘다. 대화 말풍선은 캐릭터를 가리지 않도록 최대 너비와 꼬리 위치를 조정한다.

- [ ] **Step 6: 테스트와 빌드 실행**

Run:

```bash
npm test -- src/screens/HomeScreen.test.tsx
npm run build
```

- [ ] **Step 7: 모바일 수동 검증**

Vercel Preview에서 320px, 360px, 390px, 430px 폭으로 확인한다.

체크:
- HUD 겹침 없음
- CTA가 하단 내비게이션과 겹치지 않음
- 캐릭터와 카드팩이 잘리지 않음
- 긴 사용자 이름이 레이아웃을 밀지 않음

- [ ] **Step 8: 커밋**

```bash
git add src/screens/HomeScreen* src/screens/HomeLevelXp.css src/screens/HomeCharacterInteraction.css
git commit -m "style: transform home into game lobby"
```

---

### Task 4: 운동 기록 화면을 훈련 설정형으로 개선

**Files:**
- Modify: `src/screens/RecordScreen.tsx`
- Modify: `src/screens/RecordScreen.css`
- Modify: `src/screens/CustomExerciseEditor.css`
- Test: existing RecordScreen tests

**Interfaces:**
- Consumes: 기존 운동 선택, 입력, 저장 로직
- Produces: 카테고리 탭, 운동 훈련 카드, 능력치 입력창, 고정 완료 버튼

- [ ] **Step 1: 기록 흐름 회귀 테스트 보강**

검증 항목:
- 카테고리 선택 가능
- 운동 선택 가능
- 중량·횟수·세트 또는 시간 입력 가능
- 완료 시 기존 `completeWorkout` 호출
- 커스텀 운동 편집 진입 가능

- [ ] **Step 2: 테스트 실행으로 기준선 확인**

Run: `npm test -- src/screens/RecordScreen.test.tsx`

- [ ] **Step 3: 마크업에 시각 역할 클래스 추가**

- 헤더: `.record-screen__mission-header`가 아니라 미션 없는 `.record-screen__training-header`
- 카테고리: `.record-screen__category-tabs`
- 운동 카드: `.record-screen__exercise-card game-panel`
- 수치 입력: `.record-screen__stat-control`
- 완료 버튼: `.game-button record-screen__complete-button`

기능 이름과 화면 텍스트는 현재 제품 용어를 유지한다.

- [ ] **Step 4: CSS 개선**

- 카테고리 탭을 게임 메뉴 탭으로 표현
- 선택 운동은 체크 배지와 활성 테두리 적용
- 입력 컨트롤은 숫자가 가장 크게 보이도록 구성
- 증감 버튼의 터치 영역 44px 이상
- 오류 메시지는 경고 배너 스타일
- 완료 버튼은 키보드가 닫힌 상태에서 하단 고정, 열린 상태에서는 기존 viewport 규칙에 따라 정상 위치

- [ ] **Step 5: 커스텀 운동 편집기 스타일 정리**

입력, 선택, 저장 버튼에 공통 게임 프리미티브를 적용하되 편집 기능과 데이터는 변경하지 않는다.

- [ ] **Step 6: 테스트와 빌드 실행**

Run:

```bash
npm test -- src/screens/RecordScreen.test.tsx
npm run build
```

- [ ] **Step 7: 모바일 키보드 수동 검증**

확인 항목:
- 숫자 키보드가 열려도 현재 입력칸이 보임
- 완료 버튼이 입력칸을 덮지 않음
- 바텀시트와 키보드가 중첩되지 않음

- [ ] **Step 8: 커밋**

```bash
git add src/screens/RecordScreen.tsx src/screens/RecordScreen.css src/screens/CustomExerciseEditor.css
git commit -m "style: upgrade workout recording layout"
```

---

### Task 5: 도감과 세트 진행 화면을 수집 앨범형으로 개선

**Files:**
- Modify: `src/screens/CollectionScreen.tsx`
- Modify: `src/screens/CollectionScreen.css`
- Modify: `src/screens/CardSetProgress.css`
- Test: existing CollectionScreen and card set tests

**Interfaces:**
- Consumes: 카드 소유 상태, 희귀도, 세트 진행 데이터
- Produces: 수집률 HUD, 게임형 필터, 희귀도 프레임, 잠금 상태, 중복 수량 배지

- [ ] **Step 1: 도감 상태 테스트 보강**

최소 검증:

```ts
expect(screen.getByText(/도감|수집/)).toBeInTheDocument();
expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
```

획득 카드, 미획득 카드, 중복 수량, 세트 필터가 렌더링되는 fixture를 각각 검증한다.

- [ ] **Step 2: 테스트 기준선 실행**

Run: `npm test -- src/screens/CollectionScreen.test.tsx src/game/cardSets.test.ts`

- [ ] **Step 3: 카드 구조에 상태 데이터 속성 추가**

```tsx
<article
  className="collection-card"
  data-rarity={card.rarity}
  data-owned={owned ? 'true' : 'false'}
  data-star-level={owned?.starLevel ?? 0}
>
```

CSS 선택을 위한 속성만 추가하고 카드 데이터는 변경하지 않는다.

- [ ] **Step 4: 수집 앨범 CSS 적용**

- 전체 수집률을 게이지로 표현
- 필터 탭을 공통 게임 탭으로 변경
- 희귀도별 테두리와 광택 차등
- 미획득 카드는 실루엣과 잠금 아이콘
- 중복 수량은 원형 배지
- 4성은 절제된 반짝임
- 카드 제목 영역 고정 높이로 긴 한글 대응
- 320px에서 최소 2열을 유지하되 카드 내용이 잘리지 않도록 `minmax()` 사용

- [ ] **Step 5: 세트 진행 패널 개선**

완성 여부와 남은 장수를 제목, 게이지, 보조 문구로 분리한다. 완성 세트에는 리본 또는 완료 도장을 CSS로 표현한다.

- [ ] **Step 6: 테스트와 빌드 실행**

Run:

```bash
npm test -- src/screens/CollectionScreen.test.tsx src/game/cardSets.test.ts
npm run build
```

- [ ] **Step 7: 커밋**

```bash
git add src/screens/CollectionScreen.tsx src/screens/CollectionScreen.css src/screens/CardSetProgress.css
git commit -m "style: turn collection into game album"
```

---

### Task 6: 카드팩 개봉과 세트 완성 연출 개선

**Files:**
- Modify: `src/screens/ComboPackOpeningScreen.tsx`
- Modify: corresponding pack-opening CSS file
- Modify: `src/screens/CardSetCompletionModal.css`
- Test: existing pack opening tests

**Interfaces:**
- Consumes: 기존 팩 개봉 상태, 카드 결과, 신규·중복·희귀도 정보
- Produces: 개봉 전·진행·결과 단계별 시각 상태와 reduced-motion 대체

- [ ] **Step 1: 개봉 단계 회귀 테스트 작성**

검증:
- 개봉 버튼 존재
- 개봉 후 카드 결과 표시
- 완료 버튼으로 홈 복귀
- 신규·중복 정보가 기존 로직대로 표현

- [ ] **Step 2: 테스트 실행**

Run: `npm test -- src/screens/ComboPackOpeningScreen.test.tsx`

- [ ] **Step 3: 단계별 클래스 또는 data-state 추가**

```tsx
<div className="pack-opening" data-phase={phase} data-rarity={result?.rarity ?? 'none'}>
```

기존 상태 머신을 변경하지 않고 CSS가 읽을 수 있는 속성만 노출한다.

- [ ] **Step 4: 개봉 연출 CSS 구현**

- 중앙 광원과 약한 입자
- 개봉 전 팩 부유 효과
- 결과 카드 희귀도별 배경·테두리
- NEW 배지와 중복 강화 진행도 시각 차등
- GPU 비용이 큰 필터와 과도한 blur 금지
- reduced-motion에서는 transform 반복 애니메이션 제거

- [ ] **Step 5: 세트 완성 모달 개선**

모달을 보상 상자 결과창처럼 구성하되 닫기 동작, 포커스, 오버레이는 유지한다.

- [ ] **Step 6: 테스트와 빌드 실행**

Run:

```bash
npm test -- src/screens/ComboPackOpeningScreen.test.tsx
npm run build
```

- [ ] **Step 7: 커밋**

```bash
git add src/screens/ComboPackOpeningScreen* src/screens/CardSetCompletionModal.css
git commit -m "style: enhance pack opening reward presentation"
```

---

### Task 7: 보상과 업적 화면을 보상 보관함형으로 개선

**Files:**
- Modify: `src/screens/RewardsScreen.tsx`
- Modify: `src/screens/RewardsScreen.css`
- Test: existing RewardsScreen tests

**Interfaces:**
- Consumes: 업적·보상 진행 상태
- Produces: 진행 중, 완료, 잠김 상태가 명확한 게임형 보상 카드

- [ ] **Step 1: 상태별 렌더링 테스트 작성**

fixture로 완료, 진행 중, 잠김 항목을 각각 렌더링하고 상태 라벨과 진행 수치를 검증한다.

- [ ] **Step 2: 테스트 실패 또는 기준선 확인**

Run: `npm test -- src/screens/RewardsScreen.test.tsx`

- [ ] **Step 3: 상태 속성 추가**

```tsx
<article className="reward-card game-panel" data-status={status}>
```

- [ ] **Step 4: CSS 개선**

- 완료: 메달·리본·완료 도장
- 진행 중: 경험치 게이지
- 잠김: 대비를 낮추고 잠금 표시
- 획득 가능: 짧고 약한 강조 애니메이션
- 제목, 조건, 보상을 고정된 시각 계층으로 구분

- [ ] **Step 5: 테스트와 빌드 실행**

Run:

```bash
npm test -- src/screens/RewardsScreen.test.tsx
npm run build
```

- [ ] **Step 6: 커밋**

```bash
git add src/screens/RewardsScreen.tsx src/screens/RewardsScreen.css
git commit -m "style: redesign rewards as achievement vault"
```

---

### Task 8: 운동 리포트와 상세 분석을 플레이 기록형으로 개선

**Files:**
- Modify: `src/screens/WorkoutReportScreen.tsx`
- Modify: `src/screens/WorkoutReportScreen.css`
- Modify: `src/screens/ExerciseAnalysisScreen.tsx`
- Modify: `src/screens/ExerciseAnalysisScreen.css`
- Modify: `src/screens/ExerciseTrendChart.tsx`
- Modify: `src/screens/WorkoutDayDetailSheet.css`
- Test: existing report, analysis, trend chart, detail sheet tests

**Interfaces:**
- Consumes: 기존 리포트·분석 계산 결과
- Produces: 숫자 HUD, 출석판형 달력, 게임 기록형 차트와 상세 시트

- [ ] **Step 1: 리포트 핵심 수치 회귀 테스트 작성**

운동 횟수, 세트 수, 시간, 연속 기록, 달력 날짜, 상세 진입을 검증한다.

- [ ] **Step 2: 분석 화면 회귀 테스트 작성**

최고 기록, 기간별 변화, 추세 차트, 운동 이력 목록이 기존 계산 결과를 그대로 표시하는지 검증한다.

- [ ] **Step 3: 테스트 기준선 실행**

Run:

```bash
npm test -- src/screens/WorkoutReportScreen.test.tsx src/screens/ExerciseAnalysisScreen.test.tsx src/screens/ExerciseTrendChart.test.tsx src/screens/WorkoutDayDetailSheet.test.tsx
```

- [ ] **Step 4: 통계 카드와 달력 스타일 개선**

- 숫자를 가장 크게 표시
- 아이콘은 장식 프레임 안에 배치
- 운동일은 스탬프 또는 체크 상태
- 현재 선택일과 오늘을 서로 다른 상태로 표현
- 데이터가 없는 경우 빈 상태를 게임 안내판처럼 표현

- [ ] **Step 5: 차트 시각 품질 개선**

SVG 또는 기존 차트 구조를 유지하며 선 두께, 포인트, 라벨 대비, 여백만 조정한다. 데이터 계산과 스케일 로직은 변경하지 않는다.

- [ ] **Step 6: 상세 바텀시트 개선**

헤더, 요약, 운동 목록을 게임 기록창 계층으로 정리하고 기존 스크롤·닫기·safe-area를 유지한다.

- [ ] **Step 7: 테스트와 빌드 실행**

Run:

```bash
npm test -- src/screens/WorkoutReportScreen.test.tsx src/screens/ExerciseAnalysisScreen.test.tsx src/screens/ExerciseTrendChart.test.tsx src/screens/WorkoutDayDetailSheet.test.tsx
npm run build
```

- [ ] **Step 8: 커밋**

```bash
git add src/screens/WorkoutReportScreen* src/screens/ExerciseAnalysisScreen* src/screens/ExerciseTrendChart.tsx src/screens/WorkoutDayDetailSheet.css
git commit -m "style: upgrade workout reports and analysis"
```

---

### Task 9: 설정 화면을 게임 메뉴형으로 개선

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/screens/SettingsScreen.css`
- Test: existing SettingsScreen tests

**Interfaces:**
- Consumes: 이름, 주간 목표, 캐릭터 설정 액션
- Produces: 섹션형 게임 메뉴 UI, 활성 선택 프레임, 명확한 저장 피드백

- [ ] **Step 1: 설정 동작 회귀 테스트 작성**

- 사용자 이름 변경
- 주간 목표 변경
- 캐릭터 선택
- 저장 후 기존 상태 액션 호출

- [ ] **Step 2: 테스트 기준선 실행**

Run: `npm test -- src/screens/SettingsScreen.test.tsx`

- [ ] **Step 3: 섹션 패널 구조 적용**

각 설정 묶음을 `.game-panel settings-section`으로 표시하고 선택 항목에는 `aria-pressed` 또는 기존 접근성 상태를 유지한다.

- [ ] **Step 4: CSS 개선**

- 입력창, 선택 카드, 저장 버튼에 공통 토큰 적용
- 활성 선택 테두리와 체크 표시
- 파괴적 동작이 있다면 일반 저장 버튼과 색상 분리
- 장식은 최소화해 설정 가독성 유지

- [ ] **Step 5: 테스트와 빌드 실행**

Run:

```bash
npm test -- src/screens/SettingsScreen.test.tsx
npm run build
```

- [ ] **Step 6: 커밋**

```bash
git add src/screens/SettingsScreen.tsx src/screens/SettingsScreen.css
git commit -m "style: polish settings as game menu"
```

---

### Task 10: 모바일 안정성, 접근성, 전체 통합 검증

**Files:**
- Modify only if needed: `src/MobileViewport.css`
- Modify only if needed: `src/ScreenStability.css`
- Modify affected screen CSS files
- Test: full test suite

**Interfaces:**
- Consumes: Tasks 1-9의 모든 시각 변경
- Produces: 320px 이상 모바일, 키보드, safe-area, reduced-motion에서 안정적인 통합 결과

- [ ] **Step 1: 전체 테스트 실행**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 2: 프로덕션 빌드 실행**

Run: `npm run build`

Expected: TypeScript and Vite build PASS with no lint or type errors.

- [ ] **Step 3: 잔여 하드코딩 색상과 중복 규칙 검색**

Run:

```bash
grep -R "#[0-9a-fA-F]\{6\}" src/screens src/components | head -n 200
grep -R "box-shadow:" src/screens src/components | head -n 200
```

공통화 가치가 있는 반복값만 토큰으로 옮기고, 희귀도 등 화면 고유 색상은 유지한다.

- [ ] **Step 4: Vercel Preview 검증**

최신 브랜치 Preview가 READY인지 확인한다.

화면별 체크:
- 홈
- 운동 기록
- 도감
- 카드팩 개봉
- 보상
- 운동 리포트
- 운동 상세 분석
- 설정

기기 폭:
- 320px
- 360px
- 390px
- 430px

상태:
- 기본
- 긴 사용자 이름
- 카드 미획득/다수 획득
- 데이터 없음/데이터 많음
- 키보드 열림
- 모달/바텀시트 열림
- reduced-motion

- [ ] **Step 5: 접근성 수동 점검**

- 키보드 포커스가 보임
- 텍스트 대비가 충분함
- 아이콘만 있는 버튼에 accessible name 존재
- 활성 탭에 `aria-current` 또는 동등한 상태 존재
- 팝오버와 모달의 닫기 동작 유지

- [ ] **Step 6: 최종 diff 검토**

기능 로직, 상태 타입, API, 보상 계산, 카드 확률이 변경되지 않았는지 확인한다.

Run:

```bash
git diff --stat design/record-screen-rewards-style...HEAD
git diff design/record-screen-rewards-style...HEAD -- src/store src/game src/types
```

Expected: 이번 프로젝트와 무관한 상태·게임 로직 변경이 없음.

- [ ] **Step 7: 최종 커밋**

수정이 발생한 경우:

```bash
git add src
 git commit -m "fix: stabilize game UI across mobile screens"
```

- [ ] **Step 8: PR #14 요약 갱신**

PR 설명 또는 코멘트에 아래를 기록한다.

- 공통 게임 UI 디자인 시스템
- 화면별 개선 범위
- 기존 기능·이미지 유지
- 테스트 및 빌드 결과
- Vercel Preview URL
- 미병합 상태

---

## Completion Criteria

- 모든 화면이 동일한 게임 UI 토큰과 시각 언어를 사용한다.
- 홈은 게임 로비, 기록은 훈련 설정, 도감은 수집 앨범, 보상은 업적 보관함, 리포트는 플레이 기록처럼 보인다.
- 기존 기능, 데이터, 이미지, 정보 순서는 유지된다.
- 320px 이상 모바일에서 겹침과 잘림이 없다.
- 키보드, 하단 내비게이션, 모달, 바텀시트, safe-area가 안정적으로 동작한다.
- reduced-motion 환경을 지원한다.
- 전체 테스트와 프로덕션 빌드가 통과한다.
- Vercel Preview에서 전 화면 수동 검증을 완료한다.
- PR #14는 병합하지 않는다.
