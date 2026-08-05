# Home Level XP Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈의 레벨 배지를 누르면 기존 운동·팩 기록에서 계산한 현재 경험치와 다음 레벨 진행 상황을 팝업으로 보여준다.

**Architecture:** `src/game/experience.ts`에서 저장 상태를 변경하지 않는 순수 계산 함수를 제공한다. `HomeScreen`은 계산 결과와 팝업 열림 상태만 관리하며, 바깥 클릭과 Escape로 닫히는 접근 가능한 dialog를 렌더링한다.

**Tech Stack:** React, TypeScript, CSS, 기존 `AppState` 데이터

## Global Constraints

- `AppState`, `UserProfile`, 저장소 스키마를 변경하지 않는다.
- 운동 기록 1회는 100 XP다.
- 개봉 카드팩 1개는 30 XP다.
- `personal-best` 운동 기록은 50 XP를 추가한다.
- 주간 목표 달성 주는 주당 한 번만 150 XP를 추가한다.
- 다음 레벨 필요 경험치는 `현재 레벨 × 500 XP`다.
- 계산된 XP로 저장된 사용자 레벨을 자동 변경하지 않는다.
- 기존 운동 기록, 카드 지급, 확률, 홈 버튼 동작을 변경하지 않는다.

---

### Task 1: 경험치 순수 계산 모듈

**Files:**
- Create: `src/game/experience.ts`

**Interfaces:**
- Consumes: `WorkoutLog[]`, `GrantedPack[]`, 현재 레벨, 주간 목표 횟수
- Produces: `calculateExperienceProgress(state): ExperienceProgress`

- [ ] **Step 1:** ISO 날짜를 월요일 시작 주 키로 변환하는 내부 함수를 작성한다.
- [ ] **Step 2:** 운동 기록, 개인 기록, 개봉 팩, 달성 주 수를 각각 집계한다.
- [ ] **Step 3:** 누적 XP와 현재 레벨 시작 XP를 계산한다.
- [ ] **Step 4:** 현재 구간 XP, 필요 XP, 남은 XP, 0~100 진행률을 반환한다.
- [ ] **Step 5:** TypeScript 빌드에서 모든 타입이 검증되도록 명시적 반환 타입을 사용한다.
- [ ] **Step 6:** `feat: add derived experience progress calculator`로 커밋한다.

### Task 2: 홈 레벨 버튼과 팝업

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: `calculateExperienceProgress(state)`
- Produces: 클릭 가능한 레벨 배지와 `role="dialog"` 경험치 팝업

- [ ] **Step 1:** 레벨 배지를 `button`으로 변경하고 `aria-expanded`, `aria-controls`를 연결한다.
- [ ] **Step 2:** 팝업 열림 상태와 레벨 영역 ref를 추가한다.
- [ ] **Step 3:** document pointerdown에서 레벨 영역 밖 클릭을 감지해 닫는다.
- [ ] **Step 4:** Escape 키 입력 시 팝업을 닫는다.
- [ ] **Step 5:** 현재 XP/필요 XP, 백분율, 남은 XP와 접근 가능한 progressbar를 렌더링한다.
- [ ] **Step 6:** `feat: show level experience popover on home`으로 커밋한다.

### Task 3: 팝업 스타일과 모바일 터치 검증

**Files:**
- Modify: `src/screens/HomeScreen.css`

**Interfaces:**
- Consumes: `hud-level-control`, `level-xp-popover`, `level-xp-progress` 클래스
- Produces: 다른 홈 버튼을 가리지 않는 상단 제한 팝업

- [ ] **Step 1:** 레벨 버튼의 기본 button 스타일을 제거하고 기존 HUD 모양을 유지한다.
- [ ] **Step 2:** 팝업을 레벨 배지 바로 아래에 배치하고 z-index를 상단 HUD 범위로 제한한다.
- [ ] **Step 3:** 팝업 내부 진행 바, 수치, 남은 XP 문구를 선명하게 스타일링한다.
- [ ] **Step 4:** 장식 요소에 `pointer-events: none`을 적용하고 버튼에는 `touch-action: manipulation`을 적용한다.
- [ ] **Step 5:** 375px 폭에서도 팝업이 화면 밖으로 나가지 않도록 최대 폭을 제한한다.
- [ ] **Step 6:** Vercel 타입 검사 및 프로덕션 빌드 상태를 확인한다.
- [ ] **Step 7:** PR을 생성하고 저장 구조가 변경되지 않았음을 설명한다.
