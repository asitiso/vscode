# 신규 운동기구 카드 10종 추가 설계

## 목표

`design/record-screen-rewards-style` 브랜치의 `public/assets/equipment`에 추가된 이름 정리 PNG 10개를 기존 운동 기록 및 카드 도감 구조에 연결한다. 신규 장비는 모두 일반(`common`) 카드로 추가하고, 같은 이미지가 UUID 파일명으로 중복 저장된 10개 파일은 삭제한다.

## 작업 기준 브랜치

- 기준 브랜치: `design/record-screen-rewards-style`
- 작업 브랜치: `feature/add-equipment-cards`
- 기존 기록 화면 레이아웃, 카드 성장, 보상 개봉 및 저장 데이터 구조는 유지한다.

## 사용할 이미지

아래 이름 정리 파일만 앱에서 사용한다.

1. `Rowing Machine.png`
2. `Leg Extension.png`
3. `Leg Curl.png`
4. `Smith Machine.png`
5. `Pec Deck Fly.png`
6. `Seated Row.png`
7. `Cable Machine.png`
8. `Barbell.png`
9. `Kettlebell.png`
10. `Ab Crunch Machine.png`

파일은 기존 위치인 `public/assets/equipment/`에 그대로 둔다. 코드에서는 공백을 포함한 실제 파일 경로를 정확히 등록한다.

## 삭제할 중복 이미지

이름 정리 파일과 blob SHA가 같은 아래 UUID 파일 10개를 삭제한다.

- `61c4cdca-633d-4620-bb98-531be15329df.png`
- `63a02705-4869-4c70-858a-39afb8b32c52.png`
- `73713276-2bc3-423a-82a3-f36ab63c9d77.png`
- `82ea1c41-7c77-4c1c-8e17-f2bdd37c7c9e.png`
- `96795eab-db1b-4ea5-a062-448576ab62da.png`
- `9f36d6ed-db2f-4101-a56d-54bdf959cfb6.png`
- `a74ae8db-3ecc-46c8-839d-a622991c8a17.png`
- `a873186a-cf78-45c4-a9af-23885159be0c.png`
- `bba53525-e648-4256-b09f-f7930dab0dc7.png`
- `c78f129d-d2a6-4496-8f60-2a8745b9dd23.png`

삭제 전 각 UUID 파일과 이름 정리 파일의 blob SHA가 동일한지 다시 확인한다. 이름 정리 파일은 삭제하지 않는다.

## 에셋 매니페스트

`src/data/assetManifest.ts`에 아래 키를 추가한다.

| 에셋 키 | 실제 파일 |
|---|---|
| `rowing-machine-character` | `/assets/equipment/Rowing Machine.png` |
| `leg-extension-character` | `/assets/equipment/Leg Extension.png` |
| `leg-curl-character` | `/assets/equipment/Leg Curl.png` |
| `smith-machine-character` | `/assets/equipment/Smith Machine.png` |
| `pec-deck-fly-character` | `/assets/equipment/Pec Deck Fly.png` |
| `seated-row-character` | `/assets/equipment/Seated Row.png` |
| `cable-machine-character` | `/assets/equipment/Cable Machine.png` |
| `barbell-character` | `/assets/equipment/Barbell.png` |
| `kettlebell-character` | `/assets/equipment/Kettlebell.png` |
| `ab-crunch-machine-character` | `/assets/equipment/Ab Crunch Machine.png` |

이번 작업에서는 신규 장비의 진화 이미지가 없으므로 `-evolved` 에셋은 추가하지 않는다.

## 운동 기록 정의

`src/data/exercises.ts`에 운동 10종을 추가한다. 모든 근력 장비는 기존 입력 방식인 `weight-reps-sets`를 사용하고, 로잉머신은 시간 기록 방식인 `duration`을 사용한다.

| 운동 ID | 표시명 | 카테고리 | 기록 방식 |
|---|---|---|---|
| `rowing-machine` | 로잉머신 | `cardio` | `duration` |
| `leg-extension` | 레그익스텐션 | `legs` | `weight-reps-sets` |
| `leg-curl` | 레그컬 | `legs` | `weight-reps-sets` |
| `smith-machine` | 스미스머신 | `etc` | `weight-reps-sets` |
| `pec-deck-fly` | 펙덱플라이 | `chest` | `weight-reps-sets` |
| `seated-row` | 시티드로우 | `back` | `weight-reps-sets` |
| `cable-machine` | 케이블머신 | `etc` | `weight-reps-sets` |
| `barbell` | 바벨 | `etc` | `weight-reps-sets` |
| `kettlebell` | 케틀벨 | `etc` | `weight-reps-sets` |
| `ab-crunch-machine` | 복근운동 기구 | `abs` | `weight-reps-sets` |

스미스머신, 케이블머신, 바벨, 케틀벨은 여러 부위에 사용할 수 있으므로 특정 신체 부위로 고정하지 않고 `기타` 카테고리에 둔다. 각 운동의 `linkedCardIds`에는 해당 기본 카드 ID 하나만 연결한다.

## 카드 정의

`src/data/cards.ts`의 기본 기구 카드 영역에 아래 일반 카드 10장을 추가한다.

| 카드 ID | 운동 ID | 카드명 | 설명 | 에셋 키 |
|---|---|---|---|---|
| `card-rowing-machine` | `rowing-machine` | 로잉머신 | 전신의 리듬을 타며 힘차게 당기는 카드. | `rowing-machine-character` |
| `card-leg-extension` | `leg-extension` | 레그익스텐션 | 허벅지 앞쪽을 집중적으로 단련하는 카드. | `leg-extension-character` |
| `card-leg-curl` | `leg-curl` | 레그컬 | 다리 뒤쪽을 조용하고 강하게 단련하는 카드. | `leg-curl-character` |
| `card-smith-machine` | `smith-machine` | 스미스머신 | 안정적인 궤도로 힘을 밀어 올리는 카드. | `smith-machine-character` |
| `card-pec-deck-fly` | `pec-deck-fly` | 펙덱플라이 | 가슴을 활짝 열고 힘차게 모아주는 카드. | `pec-deck-fly-character` |
| `card-seated-row` | `seated-row` | 시티드로우 | 등을 곧게 세우고 묵직하게 당기는 카드. | `seated-row-character` |
| `card-cable-machine` | `cable-machine` | 케이블머신 | 다양한 동작을 자유롭게 소화하는 만능 카드. | `cable-machine-character` |
| `card-barbell` | `barbell` | 바벨 | 양쪽 무게를 균형 있게 들어 올리는 카드. | `barbell-character` |
| `card-kettlebell` | `kettlebell` | 케틀벨 | 폭발적인 움직임과 추진력을 가진 카드. | `kettlebell-character` |
| `card-ab-crunch-machine` | `ab-crunch-machine` | 복근운동 기구 | 몸을 단단히 말아 코어를 깨우는 카드. | `ab-crunch-machine-character` |

모든 카드의 `rarity`는 `common`으로 고정한다. 신규 카드에는 `evolvedIllustrationAsset`을 넣지 않는다.

## 도감 및 보상 동작

- `CollectionScreen`은 `CARDS` 배열을 기준으로 렌더링하므로 별도 UI 구조 변경 없이 신규 10장이 도감에 표시된다.
- 미획득 카드는 기존 잠금 표시를 그대로 사용한다.
- 카드 획득 후 수량, 별 성장, 중복 처리 방식은 기존 로직을 그대로 사용한다.
- `CARDS_BY_RARITY.common`이 자동으로 확장되어 일반 카드가 나오는 모든 보상팩의 후보에 신규 카드가 포함된다.
- 기존 등급 확률은 변경하지 않는다. 일반 등급 안에서 개별 카드당 등장 확률만 카드 수 증가에 따라 자연스럽게 낮아진다.
- 기존 사용자의 저장 데이터 마이그레이션은 필요 없다. 신규 카드 ID는 처음에는 보유 수량 0으로 취급된다.

## 화면 영향

- 기록 화면의 운동 선택 목록이 기존 10종에서 20종으로 늘어난다.
- 카테고리 필터는 기존 값을 재사용한다.
- 도감 완성률의 전체 카드 수가 10장 증가한다.
- 도감 카드 프레임, 상세 표시, 보상 개봉 애니메이션은 변경하지 않는다.
- 신규 PNG 비율이 카드 안에서 잘리지 않도록 기존 `PlaceholderArt`의 `object-fit` 동작을 우선 확인한다. 특정 이미지에만 별도 크롭 보정은 추가하지 않는다.

## 변경 파일

- 수정: `src/data/assetManifest.ts`
- 수정: `src/data/exercises.ts`
- 수정: `src/data/cards.ts`
- 삭제: UUID 이름의 중복 PNG 10개
- 유지: 이름 정리 PNG 10개

## 변경하지 않는 범위

- 카드 등급 확률
- 카드 중복 및 별 성장 기준
- 진화 해금 기준
- 보상 지급 조건
- 카드팩 종류와 개봉 연출
- 앱 저장소 스키마
- 기존 카드 및 운동 ID
- 도감 화면 레이아웃

## 검증 계획

1. 이름 정리 PNG 10개가 브랜치에 모두 존재하는지 확인한다.
2. 삭제 대상 UUID 파일과 대응 이미지의 blob SHA가 같은지 확인한다.
3. UUID 중복 파일 10개만 삭제됐는지 확인한다.
4. `assetManifest.ts`의 신규 키 10개가 정확한 파일 경로를 반환하는지 확인한다.
5. `EXERCISES`에 신규 운동 10개가 추가되고 ID가 중복되지 않는지 확인한다.
6. `CARDS`에 신규 일반 카드 10개가 추가되고 카드·운동 연결이 양방향으로 일치하는지 확인한다.
7. 기록 화면에서 10개 신규 운동이 카테고리별로 표시되는지 확인한다.
8. 도감에서 신규 카드 10장이 잠금 상태로 표시되는지 확인한다.
9. 보상 개봉 시 신규 일반 카드가 정상 획득되고 도감 수량이 갱신되는지 확인한다.
10. 기존 저장 데이터로 앱을 열어도 오류가 없는지 확인한다.
11. Vercel 타입 검사와 프로덕션 빌드가 성공하는지 확인한다.

## 완료 기준

- 신규 운동 10종을 기록할 수 있다.
- 신규 카드 10장이 도감에 표시된다.
- 신규 카드는 일반 보상 후보에 포함된다.
- 이름 정리 이미지가 카드 일러스트로 표시된다.
- UUID 중복 파일 10개가 삭제된다.
- 기존 카드, 보상 및 저장 데이터 동작에 회귀가 없다.
