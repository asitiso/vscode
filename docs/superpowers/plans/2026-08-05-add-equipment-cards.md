# 신규 운동기구 카드 10종 추가 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이름이 정리된 신규 운동기구 PNG 10개를 운동 기록과 카드 도감에 연결하고, 동일 이미지의 UUID 중복 파일 10개를 삭제한다.

**Architecture:** 기존 정적 데이터 구조를 그대로 확장한다. `assetManifest.ts`가 실제 PNG 경로를 해석하고, `exercises.ts`가 기록 화면의 운동 목록을 제공하며, `cards.ts`가 도감과 보상 후보를 제공한다. `CollectionScreen`과 카드 추첨 로직은 이미 `CARDS` 및 `CARDS_BY_RARITY`를 참조하므로 UI나 확률 알고리즘은 변경하지 않는다.

**Tech Stack:** React 19, TypeScript 6, Vite 8, GitHub Contents API, 기존 정적 카드·운동 데이터 구조

## Global Constraints

- 기준 브랜치는 `design/record-screen-rewards-style`, 작업 브랜치는 `feature/add-equipment-cards`다.
- 신규 카드 10장은 모두 `common` 등급으로 추가한다.
- 신규 장비에는 진화 이미지와 `evolvedIllustrationAsset`을 추가하지 않는다.
- 기존 카드 등급 확률, 중복 성장, 별 단계, 보상 조건, 저장 스키마를 변경하지 않는다.
- 이름이 정리된 PNG 10개는 유지하고, blob SHA가 동일한 UUID 파일 10개만 삭제한다.
- 로잉머신은 `duration`, 나머지 9개는 `weight-reps-sets` 기록 방식을 사용한다.
- 스미스머신, 케이블머신, 바벨, 케틀벨은 `etc` 카테고리를 사용한다.
- 도감 화면과 기록 화면의 레이아웃은 변경하지 않는다.

---

## File Structure

- Modify `src/data/assetManifest.ts`: 신규 장비 이미지 키 10개를 실제 PNG 경로에 연결한다.
- Modify `src/data/exercises.ts`: 신규 운동 10종과 해당 카드 연결을 추가한다.
- Modify `src/data/cards.ts`: 신규 일반 카드 10장을 기본 기구 카드 영역에 추가한다.
- Delete `public/assets/equipment/<UUID>.png` 10개: 이름 정리 PNG와 동일한 중복 파일을 제거한다.
- Preserve `public/assets/equipment/Rowing Machine.png` 등 이름 정리 PNG 10개.

---

### Task 1: 중복 이미지 검증 및 삭제

**Files:**
- Delete: `public/assets/equipment/61c4cdca-633d-4620-bb98-531be15329df.png`
- Delete: `public/assets/equipment/63a02705-4869-4c70-858a-39afb8b32c52.png`
- Delete: `public/assets/equipment/73713276-2bc3-423a-82a3-f36ab63c9d77.png`
- Delete: `public/assets/equipment/82ea1c41-7c77-4c1c-8e17-f2bdd37c7c9e.png`
- Delete: `public/assets/equipment/96795eab-db1b-4ea5-a062-448576ab62da.png`
- Delete: `public/assets/equipment/9f36d6ed-db2f-4101-a56d-54bdf959cfb6.png`
- Delete: `public/assets/equipment/a74ae8db-3ecc-46c8-839d-a622991c8a17.png`
- Delete: `public/assets/equipment/a873186a-cf78-45c4-a9af-23885159be0c.png`
- Delete: `public/assets/equipment/bba53525-e648-4256-b09f-f7930dab0dc7.png`
- Delete: `public/assets/equipment/c78f129d-d2a6-4496-8f60-2a8745b9dd23.png`

**Interfaces:**
- Consumes: GitHub blob SHA metadata for UUID and named files.
- Produces: equipment directory containing only the named copies for the 10 new images.

- [ ] **Step 1: Verify every UUID file has the same blob SHA as its named counterpart**

Use this exact mapping:

```text
61c4cdca-633d-4620-bb98-531be15329df.png = Leg Extension.png
63a02705-4869-4c70-858a-39afb8b32c52.png = Leg Curl.png
73713276-2bc3-423a-82a3-f36ab63c9d77.png = Rowing Machine.png
82ea1c41-7c77-4c1c-8e17-f2bdd37c7c9e.png = Seated Row.png
96795eab-db1b-4ea5-a062-448576ab62da.png = Kettlebell.png
9f36d6ed-db2f-4101-a56d-54bdf959cfb6.png = Cable Machine.png
a74ae8db-3ecc-46c8-839d-a622991c8a17.png = Barbell.png
a873186a-cf78-45c4-a9af-23885159be0c.png = Ab Crunch Machine.png
bba53525-e648-4256-b09f-f7930dab0dc7.png = Smith Machine.png
c78f129d-d2a6-4496-8f60-2a8745b9dd23.png = Pec Deck Fly.png
```

Expected: each pair has identical blob SHA. Stop without deleting any file if one pair differs.

- [ ] **Step 2: Delete only the UUID files**

Delete each UUID path using its current blob SHA. Keep all 10 named PNG files unchanged.

- [ ] **Step 3: Re-fetch the equipment directory**

Expected:
- all 10 named PNGs remain;
- all 10 UUID PNGs are absent;
- all pre-existing equipment assets remain.

- [ ] **Step 4: Commit the cleanup**

```bash
git add -u public/assets/equipment
git commit -m "chore: remove duplicate equipment images"
```

---

### Task 2: 신규 장비 이미지 키 등록

**Files:**
- Modify: `src/data/assetManifest.ts`

**Interfaces:**
- Consumes: asset keys from `exercises.ts` and `cards.ts`.
- Produces: `resolveAssetUrl(assetName)` results for the 10 new character keys.

- [ ] **Step 1: Add the 10 manifest entries below the existing basic equipment entries**

```ts
  'rowing-machine-character': '/assets/equipment/Rowing Machine.png',
  'leg-extension-character': '/assets/equipment/Leg Extension.png',
  'leg-curl-character': '/assets/equipment/Leg Curl.png',
  'smith-machine-character': '/assets/equipment/Smith Machine.png',
  'pec-deck-fly-character': '/assets/equipment/Pec Deck Fly.png',
  'seated-row-character': '/assets/equipment/Seated Row.png',
  'cable-machine-character': '/assets/equipment/Cable Machine.png',
  'barbell-character': '/assets/equipment/Barbell.png',
  'kettlebell-character': '/assets/equipment/Kettlebell.png',
  'ab-crunch-machine-character': '/assets/equipment/Ab Crunch Machine.png',
```

Do not add evolved keys.

- [ ] **Step 2: Verify key and path uniqueness**

Confirm:
- no key duplicates an existing manifest key;
- every path exactly matches the case and spaces in the GitHub filename;
- all 10 named files exist.

- [ ] **Step 3: Commit the manifest update**

```bash
git add src/data/assetManifest.ts
git commit -m "feat: register new equipment artwork"
```

---

### Task 3: 신규 운동 10종을 기록 목록에 추가

**Files:**
- Modify: `src/data/exercises.ts`

**Interfaces:**
- Consumes: existing `Exercise` type and manifest asset keys from Task 2.
- Produces: 10 new `Exercise` entries consumed by `RecordScreen` and `EXERCISES_BY_ID`.

- [ ] **Step 1: Add the cardio exercise**

Insert before the existing legs section or after the current cardio entries:

```ts
  {
    id: 'rowing-machine',
    name: '로잉머신',
    category: 'cardio',
    logType: 'duration',
    characterAsset: 'rowing-machine-character',
    linkedCardIds: ['card-rowing-machine'],
  },
```

- [ ] **Step 2: Add the lower-body exercises**

```ts
  {
    id: 'leg-extension',
    name: '레그익스텐션',
    category: 'legs',
    logType: 'weight-reps-sets',
    characterAsset: 'leg-extension-character',
    linkedCardIds: ['card-leg-extension'],
  },
  {
    id: 'leg-curl',
    name: '레그컬',
    category: 'legs',
    logType: 'weight-reps-sets',
    characterAsset: 'leg-curl-character',
    linkedCardIds: ['card-leg-curl'],
  },
```

- [ ] **Step 3: Add chest and back exercises**

```ts
  {
    id: 'pec-deck-fly',
    name: '펙덱플라이',
    category: 'chest',
    logType: 'weight-reps-sets',
    characterAsset: 'pec-deck-fly-character',
    linkedCardIds: ['card-pec-deck-fly'],
  },
  {
    id: 'seated-row',
    name: '시티드로우',
    category: 'back',
    logType: 'weight-reps-sets',
    characterAsset: 'seated-row-character',
    linkedCardIds: ['card-seated-row'],
  },
```

- [ ] **Step 4: Add multi-purpose equipment under `etc`**

```ts
  {
    id: 'smith-machine',
    name: '스미스머신',
    category: 'etc',
    logType: 'weight-reps-sets',
    characterAsset: 'smith-machine-character',
    linkedCardIds: ['card-smith-machine'],
  },
  {
    id: 'cable-machine',
    name: '케이블머신',
    category: 'etc',
    logType: 'weight-reps-sets',
    characterAsset: 'cable-machine-character',
    linkedCardIds: ['card-cable-machine'],
  },
  {
    id: 'barbell',
    name: '바벨',
    category: 'etc',
    logType: 'weight-reps-sets',
    characterAsset: 'barbell-character',
    linkedCardIds: ['card-barbell'],
  },
  {
    id: 'kettlebell',
    name: '케틀벨',
    category: 'etc',
    logType: 'weight-reps-sets',
    characterAsset: 'kettlebell-character',
    linkedCardIds: ['card-kettlebell'],
  },
```

- [ ] **Step 5: Add the abs exercise**

```ts
  {
    id: 'ab-crunch-machine',
    name: '복근운동 기구',
    category: 'abs',
    logType: 'weight-reps-sets',
    characterAsset: 'ab-crunch-machine-character',
    linkedCardIds: ['card-ab-crunch-machine'],
  },
```

- [ ] **Step 6: Verify exercise integrity**

Check the final data:

```text
EXERCISES.length = 20
new exercise IDs are unique
new characterAsset values resolve through ASSET_MANIFEST
new linkedCardIds exactly match Task 4 card IDs
```

- [ ] **Step 7: Commit the exercise data**

```bash
git add src/data/exercises.ts
git commit -m "feat: add ten equipment exercises"
```

---

### Task 4: 신규 일반 카드 10장을 도감에 추가

**Files:**
- Modify: `src/data/cards.ts`

**Interfaces:**
- Consumes: exercise IDs from Task 3 and manifest keys from Task 2.
- Produces: 10 new `CardDefinition` entries included automatically in `CARDS_BY_ID` and `CARDS_BY_RARITY.common`.

- [ ] **Step 1: Add all cards inside the basic equipment card section before theme cards**

```ts
  {
    id: 'card-rowing-machine',
    exerciseId: 'rowing-machine',
    name: '로잉머신',
    rarity: 'common',
    description: '전신의 리듬을 타며 힘차게 당기는 카드.',
    illustrationAsset: 'rowing-machine-character',
  },
  {
    id: 'card-leg-extension',
    exerciseId: 'leg-extension',
    name: '레그익스텐션',
    rarity: 'common',
    description: '허벅지 앞쪽을 집중적으로 단련하는 카드.',
    illustrationAsset: 'leg-extension-character',
  },
  {
    id: 'card-leg-curl',
    exerciseId: 'leg-curl',
    name: '레그컬',
    rarity: 'common',
    description: '다리 뒤쪽을 조용하고 강하게 단련하는 카드.',
    illustrationAsset: 'leg-curl-character',
  },
  {
    id: 'card-smith-machine',
    exerciseId: 'smith-machine',
    name: '스미스머신',
    rarity: 'common',
    description: '안정적인 궤도로 힘을 밀어 올리는 카드.',
    illustrationAsset: 'smith-machine-character',
  },
  {
    id: 'card-pec-deck-fly',
    exerciseId: 'pec-deck-fly',
    name: '펙덱플라이',
    rarity: 'common',
    description: '가슴을 활짝 열고 힘차게 모아주는 카드.',
    illustrationAsset: 'pec-deck-fly-character',
  },
  {
    id: 'card-seated-row',
    exerciseId: 'seated-row',
    name: '시티드로우',
    rarity: 'common',
    description: '등을 곧게 세우고 묵직하게 당기는 카드.',
    illustrationAsset: 'seated-row-character',
  },
  {
    id: 'card-cable-machine',
    exerciseId: 'cable-machine',
    name: '케이블머신',
    rarity: 'common',
    description: '다양한 동작을 자유롭게 소화하는 만능 카드.',
    illustrationAsset: 'cable-machine-character',
  },
  {
    id: 'card-barbell',
    exerciseId: 'barbell',
    name: '바벨',
    rarity: 'common',
    description: '양쪽 무게를 균형 있게 들어 올리는 카드.',
    illustrationAsset: 'barbell-character',
  },
  {
    id: 'card-kettlebell',
    exerciseId: 'kettlebell',
    name: '케틀벨',
    rarity: 'common',
    description: '폭발적인 움직임과 추진력을 가진 카드.',
    illustrationAsset: 'kettlebell-character',
  },
  {
    id: 'card-ab-crunch-machine',
    exerciseId: 'ab-crunch-machine',
    name: '복근운동 기구',
    rarity: 'common',
    description: '몸을 단단히 말아 코어를 깨우는 카드.',
    illustrationAsset: 'ab-crunch-machine-character',
  },
```

Do not set `evolvedIllustrationAsset` on these cards.

- [ ] **Step 2: Verify card integrity**

Check:

```text
CARDS.length increases by exactly 10
CARDS_BY_RARITY.common increases by exactly 10
all new card IDs are unique
all new exerciseId values exist in EXERCISES_BY_ID
all new illustrationAsset values exist in ASSET_MANIFEST
```

- [ ] **Step 3: Verify bidirectional links**

For every new exercise:

```ts
EXERCISES_BY_ID[card.exerciseId].linkedCardIds.includes(card.id) === true
```

- [ ] **Step 4: Commit the card data**

```bash
git add src/data/cards.ts
git commit -m "feat: add ten common equipment cards"
```

---

### Task 5: 통합 검증 및 PR 생성

**Files:**
- Verify: `src/data/assetManifest.ts`
- Verify: `src/data/exercises.ts`
- Verify: `src/data/cards.ts`
- Verify: `public/assets/equipment/`

**Interfaces:**
- Consumes: all outputs from Tasks 1–4.
- Produces: a deployable branch and pull request targeting `design/record-screen-rewards-style`.

- [ ] **Step 1: Run repository checks**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands exit with code 0. If the execution environment cannot install or run dependencies, use the Vercel status for the final commit and explicitly report that local checks were unavailable.

- [ ] **Step 2: Verify record screen behavior**

At mobile width, verify:

```text
cardio: 로잉머신 appears and uses duration fields
legs: 레그익스텐션 and 레그컬 appear
chest: 펙덱플라이 appears
back: 시티드로우 appears
abs: 복근운동 기구 appears
etc: 스미스머신, 케이블머신, 바벨, 케틀벨 appear
```

Selecting each new exercise must create the existing input card without changing the screen layout.

- [ ] **Step 3: Verify collection behavior**

Verify:

```text
10 new locked cards appear in the collection
named PNG artwork renders without placeholder fallback
collection completion denominator increases by 10
existing owned-card counts remain unchanged
```

- [ ] **Step 4: Verify reward behavior**

Confirm the draw logic still uses `CARDS_BY_RARITY.common` and does not require a separate allowlist. Exercise a common-card draw and confirm a new card can be selected and persisted using the existing duplicate/count logic.

- [ ] **Step 5: Verify file cleanup**

Confirm:

```text
10 UUID files absent
10 named files present
no unrelated equipment files deleted
```

- [ ] **Step 6: Check final commit status**

Fetch the combined status for the branch head. Expected: Vercel `success`.

- [ ] **Step 7: Create the pull request**

Create a PR with:

```text
base: design/record-screen-rewards-style
head: feature/add-equipment-cards
title: 운동기구 카드 10종과 기록 항목 추가
```

PR body must summarize:
- 10 common cards;
- 10 recordable exercises;
- 10 manifest entries;
- deletion of 10 UUID duplicates;
- unchanged rarity probabilities and storage schema;
- build verification result.
