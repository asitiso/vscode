# 로그인 기반 게임 저장 설계

날짜: 2026-08-18
상태: 사용자 설계 승인 완료, 구현 계획 작성 전
대상 브랜치: `feature/add-equipment-cards-v2`

## 1. 배경

현재 게임의 핵심 상태는 `AppState` 하나로 관리되며, 상태 변경 시 localStorage에 자동 저장된다. Supabase에는 로그인과 무관한 익명 기기키 기반 `anonymous_game_saves` 중간 저장 기능이 별도로 존재한다.

그룹 기능 도입으로 Supabase Auth 세션이 이미 앱에 존재하므로, 로그인한 사용자는 게임 데이터를 계정에 귀속시켜 여러 기기에서 이어서 플레이할 수 있도록 저장 구조를 확장한다.

이번 변경은 게임 로직이나 `AppState` 구조를 대규모로 분해하지 않는다. 기존 로컬 우선 플레이를 유지하면서 계정 기반 서버 저장 계층을 추가하는 것이 목적이다.

## 2. 목표

1. 로그인하지 않아도 지금처럼 게임을 정상 플레이할 수 있다.
2. 모든 게임 상태 변경은 localStorage에 즉시 저장된다.
3. 로그인한 사용자는 같은 Supabase Auth `user.id` 기준으로 게임 상태를 서버에 저장하고 다른 기기에서 복원할 수 있다.
4. 서버 저장 요청은 주기적 자동 저장이 아니라 필요한 이벤트에서만 발생한다.
5. 여러 기기에서 데이터가 갈라졌을 때 조용히 덮어쓰지 않고 충돌을 감지한다.
6. 첫 로그인 시 로컬 데이터와 계정 데이터 중 어느 쪽을 사용할지 안전하게 결정한다.
7. Supabase 저장 실패가 게임 플레이를 막지 않는다.
8. 그룹 데이터 구조는 기존 별도 테이블을 유지한다.

## 3. 비목표

이번 범위에서는 다음을 하지 않는다.

- 운동 기록, 카드, 팩, 배지 등을 각각 정규화된 별도 서버 테이블로 분해
- 서버 실시간 구독을 통한 게임 상태 동기화
- CRDT/필드 단위 자동 병합
- 로그인 강제
- 익명 사용자의 게임 플레이 제거
- 그룹 공개 범위 또는 그룹 랭킹 구조 변경
- 기존 `AppState` 게임 규칙 변경
- PR 병합 또는 main 반영

## 4. 선택한 저장 모델

### 4.1 서버 모델

계정당 하나의 JSON 스냅샷을 사용한다.

새 테이블: `public.user_game_saves`

권장 컬럼:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `state jsonb not null`
- `schema_version integer not null`
- `revision bigint not null default 1`
- `client_saved_at timestamptz not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

`state`에는 현재의 전체 `AppState`를 저장한다.

### 4.2 revision 기반 낙관적 동시성

서버 저장을 성공할 때마다 `revision`을 1 증가시킨다.

클라이언트는 마지막으로 읽은 서버 revision을 기억하고 저장 요청 시 `expected_revision`으로 전달한다.

- 계정 저장이 아직 없고 `expected_revision`이 신규 상태를 의미하면 최초 INSERT
- 현재 서버 revision과 `expected_revision`이 같으면 UPDATE 후 revision 증가
- 값이 다르면 저장을 거절하고 conflict 상태 반환

이 구조는 다른 기기에서 더 최신 저장이 생겼는데 현재 기기가 오래된 상태로 덮어쓰는 상황을 방지한다.

## 5. 보안 및 RPC

브라우저는 publishable key만 사용한다. service role key나 DB 비밀번호는 프런트엔드에 두지 않는다.

`user_game_saves`는 RLS를 활성화한다. 기본 정책은 로그인한 사용자가 자기 행만 SELECT할 수 있도록 하고, 직접 INSERT/UPDATE/DELETE는 허용하지 않는다. 쓰기는 security-definer RPC를 통해서만 처리한다.

권장 RPC:

### `load_user_game_state()`

인자 없음. `auth.uid()`를 사용한다.

반환:

- 저장 없음: 행 없음 또는 명시적 null 결과
- 저장 있음: `state`, `schema_version`, `revision`, `client_saved_at`, `updated_at`

### `save_user_game_state(p_state jsonb, p_client_saved_at timestamptz, p_schema_version integer, p_expected_revision bigint)`

동작:

1. `auth.uid()`가 없으면 거부
2. 저장 행이 없으면 최초 저장 조건을 확인하고 INSERT
3. 저장 행이 있으면 revision 일치 여부 확인
4. 일치하면 state 교체, revision + 1, timestamps 갱신
5. 불일치하면 overwrite하지 않고 conflict 결과 반환

RPC 실행 권한은 `authenticated`에만 부여하고 `anon`/`PUBLIC` 실행 권한은 제거한다.

## 6. 로컬 저장은 계속 기준 안전망으로 유지

`localStorage` 저장은 현재처럼 모든 `AppState` 변경 시 즉시 수행한다.

Supabase는 localStorage를 대체하지 않는다. 서버 저장은 계정 동기화와 여러 기기 복원의 역할을 한다.

따라서 네트워크가 끊기거나 Supabase가 실패해도 게임 입력, 카드 개봉, 운동 완료 등 게임 동작은 성공해야 한다.

## 7. 서버 저장 횟수 정책

시간 기반 1초/30초/60초 자동 저장은 사용하지 않는다.

서버 저장은 `dirty`인 경우에만, 아래 필요 이벤트에서 수행한다.

### 7.1 즉시 서버 저장을 시도하는 중요 이벤트

- 운동 기록 완료 (`COMPLETE_WORKOUT`)
- 카드팩 개봉 완료 (`OPEN_PACK`)
  - 이 액션 안에서 세트 완성 보상이 생성되는 경우도 같은 저장에 포함
- 레벨 마일스톤 보상 수령 (`CLAIM_LEVEL_MILESTONE`)
- 첫 로그인에서 현재 기기 데이터를 계정 데이터로 채택한 직후
- 사용자가 설정에서 `지금 저장`을 누른 경우

### 7.2 즉시 서버 저장하지 않고 dirty만 만드는 변경

예:

- 사용자 이름 변경
- 캐릭터 변경
- 주간 목표 변경
- 커스텀 운동 추가/수정/삭제
- 기타 `AppState` 변경

이 변경들은 localStorage에는 즉시 저장되며, 다음 중요 이벤트/백그라운드/수동 저장 시 함께 서버에 반영한다.

### 7.3 백그라운드 보조 저장

문서가 `visibilitychange`로 hidden 상태가 될 때 로그인 상태이고 서버에 반영되지 않은 변경이 있으면 1회 저장을 시도한다.

브라우저 종료 직전 비동기 요청의 완료를 보장할 수 없으므로 `beforeunload`에 서버 저장 성공을 의존하지 않는다. localStorage가 최종 안전망이다.

### 7.4 로그아웃 직전

로그인 상태에서 dirty 변경이 있으면 먼저 1회 서버 저장을 시도한다.

- 성공: 로그아웃 계속
- 실패: `저장에 실패했습니다. 그래도 로그아웃할까요?` 확인
- 사용자가 취소: 로그인 유지
- 사용자가 계속: 로그아웃하되 로컬 데이터는 삭제하지 않음

## 8. dirty 판정과 로컬 동기화 메타데이터

메모리 boolean 하나만으로 dirty를 관리하면 새로고침 후 상태를 잃을 수 있으므로, 계정별 로컬 sync metadata를 둔다.

권장 로컬 키 예:

`workout-card-game:account-sync:v1:<userId>`

저장 값 예:

```ts
interface AccountSyncMetadata {
  userId: string;
  serverRevision: number | null;
  lastSyncedLocalSavedAt: string | null;
  lastServerUpdatedAt: string | null;
  linked: boolean;
}
```

현재 로컬 저장 envelope의 `savedAt`이 `lastSyncedLocalSavedAt`보다 새로우면 로컬은 dirty로 간주한다.

서버 저장 성공 시 해당 시점의 local `savedAt`, 새 revision, 서버 updatedAt을 metadata에 갱신한다.

이 방식은 새로고침 후에도 미동기화 변경 여부를 복원할 수 있다.

## 9. 첫 로그인 / 첫 계정 연결

로그인 성공 후 `load_user_game_state()`를 1회 호출한다.

### 9.1 계정 저장이 없는 경우

현재 기기 local `AppState`를 계정의 최초 저장으로 업로드한다.

성공하면 이 기기를 해당 계정과 연결된 상태로 기록한다.

서버 저장 실패 시 로컬 게임은 유지하고 연결 완료로 표시하지 않는다. 재시도 가능 상태로 둔다.

### 9.2 계정 저장이 이미 있는 경우 + 이 기기에서 아직 연결한 적 없음

자동으로 어느 한쪽을 덮어쓰지 않는다.

사용자에게 한 번 선택 UI를 표시한다.

- `계정 데이터 사용`
  - 서버 state를 현재 게임 state로 교체
  - 같은 내용을 localStorage에도 저장
  - 서버 revision을 metadata에 기록
- `이 기기 데이터 사용`
  - 현재 서버 revision을 기준으로 현재 local state를 서버에 저장
  - 성공 시 새 revision 기록

선택 완료 후 이 기기를 계정과 연결된 상태로 기록한다.

## 10. 이후 같은 기기에서 로그인/재접속

연결 metadata가 존재하는 계정은 서버 상태와 로컬 상태를 비교한다.

### 10.1 서버 revision 변화 없음

로컬 상태로 즉시 계속 플레이한다.

### 10.2 서버 revision이 더 최신 + 로컬 clean

서버 state를 자동으로 local state에 반영한다.

### 10.3 서버 revision이 더 최신 + 로컬 dirty

자동 덮어쓰지 않는다.

충돌 선택 UI 표시:

- `계정 데이터 사용`
- `이 기기 데이터 사용`

`이 기기 데이터 사용`을 선택하면 사용자가 명시적으로 overwrite를 선택한 것이므로, 충돌 시점에 다시 읽은 최신 server revision을 expected revision으로 사용하여 저장한다.

## 11. 실행 중 revision 충돌

중요 이벤트 저장 중 RPC가 revision mismatch를 반환할 수 있다.

이 경우:

1. 게임 이벤트 자체는 취소하지 않는다. local state는 이미 유효하다.
2. 현재 상태를 dirty로 유지한다.
3. 자동 재시도로 서버를 덮어쓰지 않는다.
4. 계정/기기 데이터 선택이 필요한 conflict 상태를 UI에 노출한다.

충돌 UI가 열려 있는 동안에도 localStorage 저장은 계속된다.

## 12. 인증과 GameProvider 연결

현재 `GroupAuthProvider`가 `GameProvider` 바깥에 있으므로 `GameProvider`에서 인증 상태를 읽어 계정 저장 흐름을 연결한다.

그룹용 인증이라는 이름은 현재 유지해도 되지만 실제 세션은 Supabase Auth 공용 세션으로 취급한다. 이번 작업에서 인증 Provider를 별도 범용 이름으로 대규모 리네임하는 것은 필수 범위가 아니다.

로그인하지 않은 상태에서는 계정 저장 코드가 네트워크 호출을 만들지 않아야 한다.

## 13. 기존 익명 중간 저장과의 관계

기존 `anonymous_game_saves`, `save_anonymous_game_state`, `load_anonymous_game_state`는 이번 변경에서 즉시 삭제하지 않는다.

이유:

- 기존 사용자에게 회귀 위험을 줄임
- 계정 저장 안정화 전 되돌릴 수 있는 경로 유지
- 기존 익명 저장키는 기기 종속적이므로 계정 데이터와 자동 병합하기 부적절

로그아웃 상태 설정 화면에서는 기존 익명 중간 저장을 유지할 수 있다.

로그인 상태에서는 기본 UI를 계정 저장 상태로 전환하고 익명 중간 저장을 주 경로로 노출하지 않는다.

이번 범위에서는 익명 클라우드 저장 데이터를 자동으로 계정 저장으로 가져오지 않는다. 첫 계정 연결의 로컬 데이터는 현재 localStorage의 `AppState`를 기준으로 한다.

## 14. 설정 화면 UX

### 로그아웃 상태

기존 데이터 관리 UI 유지:

- 기기 자동 저장 설명
- 익명 중간 저장
- 익명 중간 저장 불러오기

### 로그인 상태

계정 저장 UI로 전환:

- `☁️ 계정 저장됨` 또는 동기화 상태
- 마지막 성공 저장 시각
- `지금 저장` 버튼
- 저장 실패/충돌 상태 메시지

불필요한 주기 저장 옵션은 제공하지 않는다.

## 15. 상태 로딩 중 UX

로그인 직후 서버 저장을 확인하는 동안 현재 로컬 state를 즉시 초기 상태로 바꾸지 않는다.

서버 데이터를 적용해야 하는 경우에만 명시적인 replace를 수행한다.

서버 장애 때문에 앱 전체가 로딩 화면에 갇히지 않도록 계정 저장 초기화 실패와 게임 렌더링을 분리한다.

## 16. schema version

서버 스냅샷에도 현재 `STATE_SCHEMA_VERSION`을 저장한다.

서버에서 읽은 `state`는 기존 `normalizeAppState()`/migration 경로를 반드시 통과시킨다.

향후 `AppState` schema가 변경되어도 localStorage와 서버 저장이 같은 migration 규칙을 사용하도록 한다.

## 17. 오류 처리

- 네트워크 오류: local state 유지, dirty 유지, 플레이 계속
- 인증 만료: 계정 저장 실패로 처리하되 local state 유지
- invalid server state: 현재 local state를 자동 덮어쓰지 않음
- revision conflict: 사용자 선택 필요 상태
- 수동 저장 실패: 설정 화면에 오류 표시
- background 저장 실패: 조용히 dirty 유지, 다음 기회에 재시도

서버 오류 때문에 이미 완료된 운동/카드 보상을 reducer에서 롤백하지 않는다.

## 18. 테스트 기준

### 18.1 기존 로컬 저장 회귀

- 로그아웃 상태에서 상태 변경 시 localStorage 저장 유지
- Supabase 계정 RPC 호출 없음
- 기존 저장 migration 테스트 통과

### 18.2 첫 로그인

- 서버 저장 없음 -> 현재 local state 최초 업로드
- 서버 저장 있음 -> 자동 덮어쓰기 없이 선택 필요
- 계정 데이터 선택 -> 서버 state가 local/GameContext에 반영
- 기기 데이터 선택 -> 현재 local state가 서버에 저장

### 18.3 이벤트 기반 저장 횟수

다음은 즉시 계정 저장을 발생시킨다.

- 운동 완료
- 팩 개봉
- 레벨 보상 수령
- 수동 지금 저장

다음은 단독으로 즉시 계정 저장을 발생시키지 않는다.

- 이름 변경
- 캐릭터 변경
- 주간 목표 변경
- 커스텀 운동 수정

### 18.4 background flush

- dirty + authenticated + hidden -> 저장 1회
- clean -> 호출 없음
- logged out -> 호출 없음

### 18.5 revision 충돌

- stale expected revision으로 저장 시 서버 state가 변경되지 않음
- 클라이언트가 conflict 상태로 전환
- local state가 유지됨
- 명시적 사용자 선택 없이는 overwrite하지 않음

### 18.6 다른 기기 복원

- 서버 최신 + local clean -> 서버 자동 적용
- 서버 최신 + local dirty -> 선택 UI

### 18.7 로그아웃

- clean -> 바로 로그아웃
- dirty + save success -> 저장 후 로그아웃
- dirty + save failure -> 사용자 확인 전 로그아웃하지 않음

## 19. DB 검증 기준

구현 후 실제 Supabase에서 확인한다.

- `user_game_saves.relrowsecurity = true`
- 계정별 최대 한 행
- authenticated 자기 데이터만 SELECT 가능
- anon은 SELECT/INSERT/UPDATE/DELETE 불가
- authenticated도 직접 쓰기 불가
- save/load RPC는 authenticated 실행 가능
- anon/PUBLIC은 RPC 실행 불가
- revision mismatch 저장이 실제 DB 값을 덮어쓰지 않음

## 20. 배포/검증 기준

구현 완료를 주장하기 전에 다음을 실제로 검증한다.

- 관련 Vitest 테스트
- `npm run build`
- Supabase migration 적용 결과
- Vercel preview build 성공 여부

시각적인 첫 로그인 충돌 UI는 가능한 경우 preview에서 실제 모바일 폭으로 확인한다.

## 21. 구현 원칙

- 기존 로컬 플레이 루프를 유지한다.
- 저장 실패를 게임 실패로 만들지 않는다.
- main에 병합하지 않는다.
- 변경을 기능 단위 커밋으로 나누어 되돌리기 쉽게 한다.
- DB migration과 프런트 연결을 분리한다.
- 기존 익명 저장을 먼저 삭제하지 않는다.
- 테스트 없이 서버 overwrite 로직을 추가하지 않는다.

## 22. 예상 구현 단위

1. Supabase `user_game_saves` + RPC + RLS migration
2. 계정 저장 API와 revision/conflict 타입
3. account sync metadata 유틸 + 테스트
4. `GameProvider` 인증 연결 및 최초 계정 연결 상태머신
5. 중요 이벤트 기반 save trigger
6. background dirty flush
7. 충돌 선택 UI
8. 설정 화면 계정 저장 UI
9. 로그아웃 전 dirty flush 연결
10. DB/테스트/build/Vercel 검증

이 문서는 위 설계를 구현의 기준으로 사용한다.
