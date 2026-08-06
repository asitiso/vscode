# Collection Card Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카드 도감의 일러스트를 카드 프레임에 맞게 확대하고, 획득·미획득 카드 모두 클릭 가능한 상세 모달을 제공한다.

**Architecture:** `CollectionScreen`은 필터와 선택 상태만 관리하고, 카드 렌더링은 `CollectionCard`, 상세 표시는 `CollectionCardDetailModal`로 분리한다. 기존 카드 데이터, 세트 조회 함수, 이미지 선택 함수, 스크롤 잠금 훅을 재사용한다.

**Tech Stack:** React 19, TypeScript 6, CSS, Vitest, Testing Library

## Global Constraints

- 기존 필터, 카드 데이터, 획득 로직, 카드 세트 진행률을 변경하지 않는다.
- 미획득 카드의 실제 이름, 등급, 설명, 세트, 진화 이미지를 UI와 접근성 속성에서 숨긴다.
- 새 의존성을 추가하지 않는다.
- PR #14는 병합하지 않는다.

---

### Task 1: CollectionCard 분리와 카드 이미지 확대

**Files:**
- Create: `src/screens/CollectionCard.tsx`
- Modify: `src/screens/CollectionScreen.tsx`
- Modify: `src/screens/CollectionScreen.css`

**Interfaces:**
- Consumes: `CardDefinition`, `OwnedCard`, `pickDisplayIllustration`
- Produces: `CollectionCard({ card, owned, onSelect })`

- [ ] `CollectionCard`를 버튼 기반으로 작성한다.
- [ ] 획득 카드는 등급, 이미지, 이름, 별을 표시한다.
- [ ] 미획득 카드는 일반화된 접근성 이름과 `미발견`만 표시한다.
- [ ] 이미지 영역 76%, 정보 띠 24% 구조를 CSS로 적용한다.
- [ ] 커밋: `refactor: extract collection card component`

### Task 2: 등급 프레임과 상호작용 스타일

**Files:**
- Modify: `src/screens/CollectionScreen.css`

- [ ] 일반·레어·슈퍼 레어·레전드 프레임을 구분한다.
- [ ] hover, active, focus-visible 상태를 추가한다.
- [ ] 미획득 카드에는 회색 잠금 표현을 적용한다.
- [ ] `prefers-reduced-motion`에서 움직임을 줄인다.
- [ ] 커밋: `style: enhance collection card rarity frames`

### Task 3: 상세 모달 구현

**Files:**
- Create: `src/screens/CollectionCardDetailModal.tsx`
- Create: `src/screens/CollectionCardDetailModal.css`
- Modify: `src/screens/CollectionScreen.tsx`

**Interfaces:**
- Consumes: `CardDefinition`, `OwnedCard`, `findSetForCard`, `pickDisplayIllustration`, `useBodyScrollLock`
- Produces: `CollectionCardDetailModal({ card, owned, onClose })`

- [ ] 획득 카드의 이미지, 이름, 등급, 별, 세트, 설명, 최대 별 상태를 표시한다.
- [ ] 미획득 카드에는 발견 안내만 표시한다.
- [ ] X, 배경 클릭, ESC로 닫는다.
- [ ] `role="dialog"`, `aria-modal`, `aria-labelledby`를 적용한다.
- [ ] 열릴 때 닫기 버튼으로 포커스를 이동하고 닫힐 때 선택 카드로 복귀한다.
- [ ] 커밋: `feat: add collection card detail modal`

### Task 4: 상호작용 테스트

**Files:**
- Create: `src/screens/CollectionCard.test.tsx`
- Create: `src/screens/CollectionCardDetailModal.test.tsx`

- [ ] 획득 카드 버튼의 이름과 별 표시를 검증한다.
- [ ] 미획득 카드가 실제 카드명을 노출하지 않는지 검증한다.
- [ ] 획득 모달 상세 정보 표시를 검증한다.
- [ ] 미획득 모달 정보 보호를 검증한다.
- [ ] ESC와 닫기 버튼 동작을 검증한다.
- [ ] `npm test -- CollectionCard CollectionCardDetailModal`을 실행한다.
- [ ] `npm run build`를 실행한다.
- [ ] 커밋: `test: cover collection card detail interactions`

## Verification

- 필터와 카드 세트 진행률이 기존처럼 동작한다.
- 320px 이상 모바일 폭에서 카드 정보가 넘치지 않는다.
- 미획득 카드 정보가 화면과 접근성 트리에 노출되지 않는다.
- 테스트와 빌드 결과를 실제 실행했을 때만 성공으로 기록한다.
