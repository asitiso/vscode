# Reward Events V5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카드팩 개봉의 반복 변주와 카드 성장 목표 안내를 결합해, 여러 번 개봉해도 같은 느낌이 반복되지 않고 중복 카드도 명확한 성장 보상으로 느껴지게 만든다.

**Architecture:** 순수 함수 모듈이 개봉 패턴, 대사, 성장 단계와 다음 목표를 계산한다. `PackOpeningScreen`은 계산 결과를 상태 흐름과 UI에 연결하고, V5 전용 CSS가 패턴별 시각 변주와 성장 게이지를 담당한다. 기존 V4 사운드 엔진은 패턴별 음높이 변주 인자를 받도록 확장한다.

**Tech Stack:** React 19, TypeScript 6, Vite 8, CSS animations, Web Audio API, localStorage

## Global Constraints

- 카드 확률과 카드 선택 로직을 변경하지 않는다.
- 카드팩 보상은 한 번만 지급한다.
- 서버와 `AppState` 저장 구조를 변경하지 않는다.
- 직전 개봉 패턴과 같은 패턴이 연속 선택되지 않게 한다.
- 일반 카드는 빠르게, 희귀·성장 이벤트만 더 강하게 연출한다.
- `prefers-reduced-motion`과 기존 사운드 끄기 설정을 유지한다.

---

### Task 1: 개봉 변주와 성장 계산 모듈

**Files:**
- Create: `src/game/rewardVariation.ts`

**Interfaces:**
- Produces: `selectRewardVariant(previousId, randomValue)`, `getRewardCopy(variantId, phase)`, `getCardGrowthProgress(count)`
- Consumes: `STAR_THRESHOLDS` from `src/types/index.ts`

- [ ] **Step 1: 패턴 타입과 3개 패턴 정의**

`calm-rise`, `power-burst`, `mystery-pulse` 패턴에 라벨, CSS 클래스, 사운드 피치 값을 정의한다.

- [ ] **Step 2: 직전 패턴 제외 선택 함수 구현**

`selectRewardVariant(previousId, randomValue)`는 직전 패턴을 후보에서 제외하고 `randomValue`를 후보 인덱스로 변환한다.

- [ ] **Step 3: 단계별 대사 선택 함수 구현**

`ready`, `charging`, `burst` 단계별 대사를 패턴마다 2개 이상 제공하고 안정적인 인덱스로 선택한다.

- [ ] **Step 4: 성장 진행 계산 구현**

현재 장수, 현재 별, 다음 별 기준, 남은 장수, 진행률, 최대 성장 여부를 반환한다.

- [ ] **Step 5: TypeScript 빌드 확인**

Run: `npm run build`
Expected: 새 모듈 타입 오류 없음.

- [ ] **Step 6: Commit**

```bash
git add src/game/rewardVariation.ts
git commit -m "feat: add reward variation and growth helpers"
```

### Task 2: 개봉 화면에 반복 변주 연결

**Files:**
- Modify: `src/screens/PackOpeningScreen.tsx`
- Create: `src/screens/RewardEventsV5.css`

**Interfaces:**
- Consumes: Task 1의 변주 선택과 성장 계산 함수
- Produces: 패턴별 클래스, 대사, 성장 게이지, 다음 성장 목표 UI

- [ ] **Step 1: 최초 진입 시 패턴 선택 및 최근 패턴 저장**

`localStorage` 키 `workout-card-reward-last-variant`를 읽고 직전 패턴을 제외해 선택한 뒤 저장한다. 다시보기에서는 같은 결과를 유지한다.

- [ ] **Step 2: 개봉 단계 문구를 패턴별 대사로 교체**

준비·충전·폭발 단계의 제목과 안내 문구를 선택된 패턴의 문구로 표시한다.

- [ ] **Step 3: 희귀 예고 UI 추가**

결과가 확정된 뒤 레어 이상이면 공개 직전 등급별 예고 문구와 색상 클래스가 나타나게 한다. 실제 등급은 카드 공개 전까지 텍스트로 직접 노출하지 않는다.

- [ ] **Step 4: 성장 게이지와 다음 목표 추가**

카드 결과 아래에 현재 장수, 다음 별 기준, 남은 장수와 진행 게이지를 표시한다. 4성은 `MAX`와 특별 일러스트 상태를 표시한다.

- [ ] **Step 5: 피날레에 다음 성장 목표 추가**

V4 피날레 요약에 `다음 성장까지 N장` 또는 `최대 성장 완료`를 넣는다.

- [ ] **Step 6: CSS 패턴 3종과 성장 애니메이션 구현**

패턴별 카드팩 이동, 링 회전, 플래시 방향과 성장 게이지 상승 효과를 분리한다. 작은 화면과 동작 감소 설정을 포함한다.

- [ ] **Step 7: Build and lint**

Run: `npm run build && npm run lint`
Expected: 두 명령 모두 성공.

- [ ] **Step 8: Commit**

```bash
git add src/screens/PackOpeningScreen.tsx src/screens/RewardEventsV5.css
git commit -m "feat: add varied openings and card growth feedback"
```

### Task 3: 패턴별 효과음 변주

**Files:**
- Modify: `src/game/rewardSound.ts`
- Modify: `src/screens/PackOpeningScreen.tsx`

**Interfaces:**
- Consumes: 선택된 패턴의 `soundPitch`
- Produces: 기존 사운드 이벤트에 선택적 피치 배율을 받는 API

- [ ] **Step 1: 사운드 함수에 피치 배율 인자 추가**

기본값 `1`을 유지해 기존 호출과 호환되도록 한다.

- [ ] **Step 2: 개봉 화면에서 패턴 피치 전달**

터치·충전·폭발·공개 효과음에만 패턴 피치를 적용하고 레전드 전용 사운드는 기존 강도를 유지한다.

- [ ] **Step 3: Build and lint**

Run: `npm run build && npm run lint`
Expected: 성공.

- [ ] **Step 4: Commit**

```bash
git add src/game/rewardSound.ts src/screens/PackOpeningScreen.tsx
git commit -m "feat: vary reward sounds by opening pattern"
```

### Task 4: 통합 검증과 PR

**Files:**
- Verify: all V5 changed files

- [ ] **Step 1: 변경 범위 확인**

`git diff feature/reward-events-v4...feature/reward-events-v5 --stat`에서 설계 문서, 계획 문서, 변주 모듈, 개봉 화면, V5 CSS, 사운드 파일만 포함되는지 확인한다.

- [ ] **Step 2: 최종 빌드와 린트 실행**

Run: `npm run build && npm run lint`
Expected: 성공.

- [ ] **Step 3: 모바일 확인 항목 점검**

375px, 390px, 430px 폭에서 카드, 성장 게이지, 피날레 버튼이 화면 밖으로 잘리지 않는지 확인한다.

- [ ] **Step 4: PR 생성**

Base: `feature/reward-events-v4`
Head: `feature/reward-events-v5`
Title: `보상 개봉 5차: 반복 변주와 카드 성장 목표`
