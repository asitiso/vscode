# Record Screen Rewards-Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기록 탭의 기존 입력 기능을 유지하면서 보상 탭과 동일한 카드형 레이아웃과 보라색 강조 체계로 통일한다.

**Architecture:** `RecordScreen.tsx`의 상태와 이벤트 로직은 유지하고 JSX의 시각적 그룹만 재구성한다. `RecordScreen.css`에서 카드, 칩, 입력, 느낌 선택, sticky 작업 영역을 새 디자인 체계로 교체한다.

**Tech Stack:** React, TypeScript, CSS, Vite

## Global Constraints

- 운동 기록 데이터 구조를 변경하지 않는다.
- 운동 선택, 이전 기록 불러오기, 완료 조건, 저장 로직을 변경하지 않는다.
- 새로운 외부 의존성을 추가하지 않는다.
- 375px, 390px, 430px 모바일 폭을 지원한다.

---

### Task 1: 기록 화면 정보 구조 정리

**Files:**
- Modify: `src/screens/RecordScreen.tsx`

**Interfaces:**
- Consumes: 기존 `useGame`, `EXERCISES`, `WorkoutSetEntry`, `FeelingTag`
- Produces: 기존 이벤트 로직을 그대로 사용하는 카드형 JSX 구조

- [ ] **Step 1: 상단 헤더를 보상 탭 형식으로 변경**

`TODAY WORKOUT`, `오늘 운동 기록`, 설명 문구를 포함한다.

- [ ] **Step 2: 운동 선택 영역을 하나의 카드로 묶기**

최근 운동, 카테고리, 운동 목록을 하위 그룹으로 구분하고 선택된 운동 수 배지를 표시한다.

- [ ] **Step 3: 세트 기록과 느낌, 메모를 각각 카드로 묶기**

기존 입력과 onChange 로직을 그대로 유지한다.

- [ ] **Step 4: 완료 조건과 이동 로직이 변경되지 않았는지 정적 검토**

`canComplete`, `handleComplete`, `completeWorkout`, `onDone` 호출을 기존과 동일하게 유지한다.

### Task 2: 보상 탭 스타일 적용

**Files:**
- Modify: `src/screens/RecordScreen.css`

**Interfaces:**
- Consumes: Task 1에서 추가한 클래스 이름
- Produces: 카드형 모바일 레이아웃

- [ ] **Step 1: 배경과 헤더 스타일 적용**

보상 화면과 같은 밝은 배경, 영문 라벨, 큰 제목, 설명 문구를 적용한다.

- [ ] **Step 2: 카드와 섹션 헤더 스타일 적용**

흰 카드, 연보라 테두리, 22~26px radius, 선택 개수 배지를 적용한다.

- [ ] **Step 3: 칩과 입력 필드 스타일 적용**

선택 상태는 보라색으로 통일하고 입력 필드는 44px 이상 높이를 확보한다.

- [ ] **Step 4: 느낌 버튼과 메모 스타일 적용**

2열 그리드를 유지하며 선택 상태를 보라색 테두리와 연보라 배경으로 표시한다.

- [ ] **Step 5: sticky 작업 영역 보정**

하단 내비게이션 바로 위에 유지되도록 배경, 여백, z-index를 설정한다.

### Task 3: 빌드 및 배포 검증

**Files:**
- Verify: `src/screens/RecordScreen.tsx`
- Verify: `src/screens/RecordScreen.css`

- [ ] **Step 1: Vercel 타입 검사와 프로덕션 빌드 확인**

Expected: Vercel status `success`.

- [ ] **Step 2: 변경 범위 확인**

Expected: 기록 화면과 문서 파일만 변경되고 저장 구조와 게임 로직 파일은 변경되지 않는다.

- [ ] **Step 3: PR 생성**

Base: `feature/home-level-xp-popover`
Head: `design/record-screen-rewards-style`
