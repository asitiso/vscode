# 모바일 키보드 및 아이폰 안전영역 안정화 설계

## 목표

모바일에서 키보드가 열릴 때 입력 화면의 레이아웃이 무너지지 않도록 하고, 아이폰 15를 포함한 홈 인디케이터 기기에서 화면 하단 콘텐츠와 버튼이 잘리지 않게 한다.

이번 작업은 기존 `VisualViewport` 기반 구조를 유지하면서 실제 문제 지점만 보완한다. 홈, 도감, 보상 화면의 기존 디자인과 기능은 변경하지 않는다.

## 현재 상태

이미 다음 기반이 적용되어 있다.

- `viewport-fit=cover`
- `100dvh`
- `window.visualViewport` 기반 높이 동기화
- 키보드 열림 감지
- 키보드가 열릴 때 하단 내비게이션 숨김
- CSS 변수 `--app-viewport-height`, `--keyboard-height`, `--keyboard-open`

따라서 새로운 viewport 시스템을 추가하지 않고 기존 구현을 보완한다.

## 핵심 방향

### 1. 표시 영역 높이 계산 안정화

`visualViewport.height`와 `visualViewport.offsetTop`을 함께 고려해 실제 화면에 보이는 영역을 계산한다.

- 앱 셸 높이는 현재 보이는 viewport 높이를 사용한다.
- 주소창이나 키보드로 viewport가 이동한 경우 offset을 별도 CSS 변수로 제공한다.
- 키보드 열림 판정은 기존 160px 기준을 유지한다.
- orientationchange, visualViewport resize, visualViewport scroll 이벤트를 계속 사용한다.

추가 CSS 변수:

```css
--app-viewport-offset-top
--safe-area-top
--safe-area-bottom
```

### 2. 앱 셸과 안전영역

`.app-shell`은 아이폰 안전영역을 침범하지 않도록 내부 컨테이너 기준으로 동작한다.

- 상단 콘텐츠는 `env(safe-area-inset-top)`을 고려한다.
- 하단 콘텐츠는 `env(safe-area-inset-bottom)`을 고려한다.
- 키보드가 닫힌 상태에서만 하단 안전영역 여백을 적용한다.
- 키보드가 열린 상태에서는 불필요한 빈 공간을 만들지 않는다.

공통 변수 예시:

```css
--safe-bottom: env(safe-area-inset-bottom, 0px);
--screen-bottom-space: calc(var(--bottom-nav-height) + var(--safe-bottom));
```

### 3. 입력 화면 구조

기록 화면과 설정 화면처럼 입력 요소가 있는 화면만 별도로 보완한다.

- 화면 전체는 고정 높이를 유지한다.
- 입력 화면 내부 본문만 `overflow-y: auto`로 스크롤한다.
- 본문에는 `min-height: 0`을 반드시 적용한다.
- 하단 작업 버튼은 `flex-shrink: 0`으로 유지한다.
- 키보드가 열린 동안 버튼이 입력칸을 덮지 않게 본문 하단 패딩을 추가한다.
- 기존 absolute/fixed 요소는 필요한 경우에만 일반 흐름 또는 sticky 영역으로 이동한다.

권장 구조:

```css
.input-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.input-screen__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.input-screen__footer {
  flex-shrink: 0;
}
```

### 4. 포커스된 입력칸 보정

CSS만으로 입력칸이 가려지는 일부 iOS 상황에 한해 제한적으로 `scrollIntoView`를 사용한다.

- `input`, `textarea`, `select`가 포커스될 때만 실행한다.
- 키보드가 열린 상태에서만 실행한다.
- 즉시 실행하지 않고 viewport resize 이후 짧은 지연 뒤 실행한다.
- 이미 충분히 보이는 입력칸은 이동하지 않는다.
- 전역 강제 스크롤은 사용하지 않는다.

이 로직은 공통 훅으로 분리한다.

```text
src/hooks/useFocusedFieldVisibility.ts
```

### 5. 하단 내비게이션과 하단 버튼

- 키보드가 열리면 기존처럼 하단 내비게이션을 숨긴다.
- 키보드가 닫히면 내비게이션 높이에 안전영역을 포함한다.
- 화면 본문은 내비게이션과 홈 인디케이터 높이만큼 하단 공간을 확보한다.
- 고정 버튼은 `bottom: env(safe-area-inset-bottom)`을 직접 쓰지 않고 공통 변수로 통일한다.

## 수정 대상

### 공통 viewport

- `src/utils/viewport.ts`
- `src/hooks/useViewportState.ts`
- `src/App.tsx`
- `src/App.css`
- `src/MobileViewport.css`
- `src/ScreenStability.css`
- `src/index.css`

### 입력 화면

- `src/screens/RecordScreen.tsx`
- `src/screens/RecordScreen.css`
- `src/screens/SettingsScreen.tsx`
- `src/screens/SettingsScreen.css`

실제 검색 결과에 따라 입력 요소가 있는 다른 화면이 발견되면 동일한 공통 클래스만 적용한다. 관련 없는 화면은 수정하지 않는다.

## 키보드 상태별 동작

### 키보드 닫힘

- 앱은 전체 viewport 높이를 사용한다.
- 하단 내비게이션을 표시한다.
- 하단 안전영역을 포함한다.
- 아이폰 15 홈 인디케이터 위로 버튼과 콘텐츠가 올라온다.

### 키보드 열림

- 앱 높이는 `visualViewport.height`에 맞춰 줄어든다.
- 하단 내비게이션을 숨긴다.
- 입력 화면 본문만 스크롤된다.
- 하단 안전영역의 과도한 빈 공간은 제거한다.
- 포커스된 입력칸은 보이는 영역 안으로 이동한다.

## 오류 및 예외 처리

- `visualViewport`가 없는 브라우저는 `window.innerHeight`를 사용한다.
- `env(safe-area-inset-*)` 미지원 브라우저는 0px로 동작한다.
- 화면 회전 시 새 높이와 offset을 다시 계산한다.
- 키보드 높이가 160px 미만인 브라우저 UI 변화는 키보드로 판정하지 않는다.
- 외장 키보드처럼 viewport가 줄지 않는 경우에는 기존 레이아웃을 유지한다.
- 모달이 열려 body scroll lock 상태인 경우 포커스 보정 훅은 실행하지 않는다.

## 테스트

### viewport 순수 함수

- `visualViewport`가 없으면 `innerHeight`를 사용한다.
- viewport 높이가 160px 이상 줄면 키보드 열림으로 판정한다.
- `offsetTop`이 있을 때 실제 보이는 영역과 키보드 높이를 정확히 계산한다.
- CSS 변수에 높이, offset, 키보드 상태가 기록된다.

### 화면 동작

- 키보드가 열리면 하단 내비게이션이 사라진다.
- 키보드가 닫히면 다시 표시된다.
- 입력 화면 본문은 스크롤 가능하고 footer는 축소되지 않는다.
- 포커스된 입력칸이 가려질 때만 `scrollIntoView`가 호출된다.
- 아이폰 안전영역 CSS 변수가 하단 버튼과 본문 여백에 사용된다.

### 수동 확인 기준

- iPhone 15 Safari 또는 동일 viewport 시뮬레이션
- Android Chrome
- 세로 모드에서 기록 화면 입력
- 메모 입력 중 키보드 열기/닫기 반복
- 설정 화면 이름 입력
- 화면 회전 후 다시 세로 복귀
- 홈 인디케이터 위 하단 버튼 잘림 여부 확인

## 제외 범위

- 모든 화면을 공통 셸로 재작성
- 네이티브 키보드 높이 직접 측정
- 기기별 하드코딩된 높이
- Android와 iOS별 별도 화면 컴포넌트
- 홈·도감·보상 화면의 시각 디자인 변경
- 하단 내비게이션 디자인 변경

## 완료 기준

- 키보드가 열려도 기록·설정 화면의 입력칸과 버튼이 겹치지 않는다.
- 포커스된 입력칸이 화면 밖으로 밀려나지 않는다.
- 아이폰 15에서 하단 버튼과 콘텐츠가 홈 인디케이터에 가려지지 않는다.
- 키보드가 닫힌 일반 화면의 기존 레이아웃은 유지된다.
- Android Chrome과 데스크톱 화면에 회귀가 없다.
- 실제 테스트와 빌드를 실행한 경우에만 성공으로 보고한다.
