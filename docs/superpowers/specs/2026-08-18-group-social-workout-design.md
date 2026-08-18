# 그룹 운동 공유 기능 설계

## 목표

열품타의 그룹 내 실시간 학습 현황과 누적 시간 비교 방식을 운동 게임에 맞게 변형한다. 사용자는 기존 게임을 로그인 없이 계속 이용할 수 있고, 그룹 기능을 사용할 때만 Supabase Auth 로그인을 요구한다. 그룹 안에서는 각 사용자의 오늘 운동시간, 이번 주 누적 운동시간, 주간 목표 달성률, 현재 운동 중 여부만 공유한다.

이번 범위의 핵심 목표는 그룹 기능을 추가하면서 기존 localStorage 자동 저장, 익명 Supabase 중간저장, 카드/레벨/보상 흐름을 변경하지 않는 것이다.

## 확정 요구사항

- 평소 게임은 로그인 없이 사용 가능
- 그룹 메뉴 진입 시 로그인 요구
- 로그인 방식
  - Google OAuth
  - 이메일 매직링크
- 그룹 프로필 닉네임
  - 기존 게임 닉네임을 최초 기본값으로 사용
  - 그룹 프로필에서 별도 변경 가능
- 그룹 가입
  - 그룹장이 그룹 생성
  - 6자리 초대코드 자동 발급
  - 코드를 입력하면 즉시 가입
- 사용자당 최대 5개 그룹 가입
- 그룹당 최대 20명
- 그룹 내 공개 정보
  - 오늘 운동시간
  - 이번 주 누적 운동시간
  - 주간 목표 달성률
  - 현재 운동 중 여부
- 비공개 정보
  - 운동 종목
  - 세트 수
  - 반복 횟수
  - 중량
  - 메모
  - 카드/보상 상세 상태
- 현재 운동 중 표시는 실제 운동 세션 타이머가 실행 중일 때만 표시
- 앱 종료/네트워크 단절 시 stale heartbeat를 기준으로 자동 해제
- 그룹 채팅, 사진 인증, 댓글, 좋아요, 공개 그룹 검색, 전국 랭킹은 이번 범위에서 제외

## 현재 코드와의 관계

현재 `RecordScreen`은 사용자가 운동 종류와 수치를 입력한 뒤 `기록 완료`를 누르는 방식이며 실시간 세션 타이머가 없다. 그룹의 `운동 중` 상태를 정확히 표시하려면 기록 화면 상단에 최소한의 운동 세션 타이머를 추가한다.

운동 종목별 `durationMinutes`와 그룹용 세션 타이머는 다른 의미를 가진다.

- 기존 `durationMinutes`: 특정 운동 항목에 사용자가 입력한 기록
- 그룹 세션 시간: 실제 운동 시작 버튼부터 종료 버튼까지 흐른 시간

둘을 합산하거나 서로 덮어쓰지 않는다. 기존 운동 기록 데이터 구조를 보존하기 위함이다.

## 전체 아키텍처

```text
기존 게임
├─ localStorage 자동 저장
├─ 익명 기기키
├─ anonymous_game_saves RPC 중간저장
└─ 로그인 없이 플레이

그룹 기능
├─ Supabase Auth
│  ├─ Google OAuth
│  └─ 이메일 매직링크
├─ GroupProfile
├─ Groups / Memberships
├─ WorkoutSession heartbeat
├─ Daily activity aggregation
└─ Group dashboard
```

그룹 기능은 별도의 React context/service 계층으로 분리한다. `GameContext`에 인증 및 그룹 네트워크 상태를 섞지 않는다.

권장 구조:

```text
src/group/
  GroupAuthContext.tsx
  groupApi.ts
  groupTypes.ts
  workoutSessionApi.ts
  groupSelectors.ts

src/screens/group/
  GroupEntryScreen.tsx
  GroupAuthScreen.tsx
  GroupProfileSetup.tsx
  GroupListScreen.tsx
  GroupDetailScreen.tsx
  GroupMemberDetailModal.tsx

src/hooks/
  useWorkoutSessionTimer.ts
```

## 인증 설계

### Supabase client

현재 Supabase client는 `persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`로 되어 있다. 그룹 Auth를 위해 다음으로 변경한다.

```ts
persistSession: true
autoRefreshToken: true
detectSessionInUrl: true
```

기존 익명 중간저장은 로그인 상태와 관계없이 브라우저 익명 기기키를 계속 사용하므로 동작을 변경하지 않는다.

### 로그인 진입

그룹 메뉴 진입 시:

1. Supabase session 확인
2. session 없음 → `GroupAuthScreen`
3. session 있음 → group profile 확인
4. profile 없음 → 게임 닉네임을 기본값으로 `GroupProfileSetup`
5. profile 있음 → 그룹 목록

### Google OAuth

- `signInWithOAuth({ provider: 'google' })`
- redirect 대상은 현재 앱의 group entry로 복귀 가능한 URL 사용
- Vercel preview와 production redirect URL을 Supabase Auth 설정에 등록해야 함

### 이메일 매직링크

- 이메일 입력
- `signInWithOtp`
- 링크를 연 뒤 동일 앱으로 복귀
- 로그인 성공 후 그룹 화면 진입

## 그룹 프로필

### group_profiles

```text
user_id uuid primary key references auth.users(id)
nickname text not null
created_at timestamptz not null
updated_at timestamptz not null
```

규칙:

- 최초 닉네임 기본값은 현재 게임 `state.user.name`
- 2~20자
- 앞뒤 공백 제거
- 그룹별 별도 닉네임은 이번 범위에서 지원하지 않음
- 사용자가 프로필에서 변경하면 모든 가입 그룹에 같은 닉네임 표시

## 그룹 데이터

### groups

```text
id uuid primary key
name text not null
owner_id uuid references auth.users(id)
invite_code char(6) unique not null
created_at timestamptz not null
```

그룹 이름은 2~30자.

초대코드는 혼동이 쉬운 문자를 제외한 대문자 영숫자 집합을 사용한다. 예: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.

### group_members

```text
group_id uuid references groups(id)
user_id uuid references auth.users(id)
joined_at timestamptz not null
primary key (group_id, user_id)
```

그룹 생성 시 owner를 group_members에도 자동 추가한다.

## 그룹 생성/가입 RPC

프런트에서 제한 검사를 신뢰하지 않는다. 핵심 제약은 RPC 트랜잭션 안에서 검사한다.

### create_group(name)

검사:

- 로그인 사용자 존재
- 현재 가입 그룹 수 < 5
- 이름 검증
- 중복되지 않는 6자리 invite code 생성
- groups insert
- owner membership insert

반환:

```text
group_id
invite_code
```

### join_group_by_invite_code(code)

검사:

- 로그인 사용자 존재
- code 정규화 및 존재 여부
- 이미 가입한 그룹인지
- 사용자 가입 그룹 수 < 5
- 대상 그룹 멤버 수 < 20

성공 시 group_members insert.

### leave_group(group_id)

- 일반 멤버는 즉시 탈퇴 가능
- owner는 다른 멤버가 남아 있으면 바로 탈퇴 불가
- 이번 MVP에서는 owner 이전 기능을 만들지 않음
- owner가 혼자 있을 때만 그룹 삭제 가능

### remove_group_member(group_id, member_id)

- owner만 실행 가능
- owner 자신은 제거 불가

## 운동 세션

### workout_sessions

```text
id uuid primary key
user_id uuid references auth.users(id)
started_at timestamptz not null
ended_at timestamptz null
last_heartbeat_at timestamptz not null
duration_seconds integer null
created_at timestamptz not null
```

한 사용자는 동시에 하나의 active session만 허용한다.

### 시작

RecordScreen 상단에 `운동 시작` 버튼 추가.

로그인 상태인 경우:

- server-side RPC로 active session 생성
- `started_at` 서버 시간 사용
- 타이머 UI 시작

로그인하지 않은 경우:

- 타이머는 로컬에서 정상 사용 가능
- 그룹 실시간 상태 동기화는 하지 않음
- 그룹 기능을 쓰지 않는 사용자에게 로그인 강요하지 않음

이 로컬 타이머는 사용 편의 기능으로만 동작하고 기존 workout log 저장 방식에 영향을 주지 않는다.

### heartbeat

로그인한 active session은 약 60초마다 `last_heartbeat_at` 갱신.

`운동 중` 판정:

```text
ended_at is null
AND last_heartbeat_at >= now() - interval '3 minutes'
```

따라서 브라우저 종료나 네트워크 단절 후 최대 약 3분 뒤에는 다른 그룹원에게 운동 중으로 표시되지 않는다.

### 종료

다음 경우 active session 종료:

- 사용자가 `운동 종료` 버튼
- 운동 기록 완료
- 사용자가 명시적으로 세션 취소

서버에서 `duration_seconds = ended_at - started_at` 계산.

긴 비정상 세션을 막기 위해 서버에서 6시간 상한을 적용한다. 6시간을 넘긴 세션은 6시간까지만 집계한다.

## 일별 운동시간 집계

### group_activity_daily

```text
user_id uuid references auth.users(id)
activity_date date not null
workout_seconds integer not null default 0
updated_at timestamptz not null
primary key (user_id, activity_date)
```

세션 종료 시 해당 날짜에 완료된 세션 시간을 일별 집계에 반영한다.

세션이 자정을 넘으면 날짜별로 분할 집계한다.

예:

```text
23:50 시작
00:20 종료
→ 전날 10분
→ 다음날 20분
```

그룹 화면에서는 raw workout_sessions 전체를 가져오지 않고 일별 집계값을 사용한다.

## 주간 목표 달성률

현재 게임의 `weeklyGoal.targetSessionsPerWeek`는 로그인하지 않은 로컬 GameState에 저장된다. 그룹 화면에서 다른 사용자의 목표 달성률을 보여주려면 최소한의 그룹용 목표 정보만 서버에 저장해야 한다.

`group_profiles`에 다음 필드를 추가한다.

```text
weekly_goal_sessions smallint not null default 3
weekly_completed_sessions smallint not null default 0
weekly_goal_week date
```

단, 서버가 운동 종목 상세를 알 필요는 없다. 기록 완료 시 해당 날짜에 운동 세션 또는 workout completion이 존재하면 그 주의 완료 일수를 동기화한다.

첫 버전에서는 목표 달성률을 다음처럼 정의한다.

```text
이번 주 운동한 서로 다른 날짜 수 / 주간 목표 횟수
```

100%를 최대값으로 표시한다.

사용자의 로컬 주간 목표가 바뀌면 로그인 상태에서 group profile의 `weekly_goal_sessions`도 갱신한다.

## 그룹 대시보드

### GroupListScreen

표시:

- 그룹 이름
- 멤버 수
- 이번 주 그룹 전체 운동시간
- 그룹 만들기
- 6자리 코드로 참가

### GroupDetailScreen

기본 정렬:

1. 주간 목표 달성률 높은 순
2. 같은 달성률이면 이번 주 운동시간 높은 순
3. 같으면 닉네임 가나다순

멤버 행:

```text
1  민수      🔥 운동 중
   오늘 52분 · 이번 주 4시간 22분
   목표 100%
```

본인 행은 `나` 표시를 추가한다.

### Member detail

다른 사용자 클릭 시 보여주는 정보:

- 그룹 닉네임
- 오늘 운동시간
- 이번 주 운동시간
- 최근 7일 일별 운동시간
- 주간 목표 달성률
- 현재 운동 중 여부

운동 종목/중량/세트는 요청하지도 않고 표시하지도 않는다.

## 앱 내 진입 위치

MVP에서는 하단 네비게이션을 6개로 늘리지 않는다. 현재 5개 탭의 폭을 유지하기 위해 홈 화면 또는 설정 화면에서 `운동 그룹` 카드로 진입시킨다.

권장 첫 위치는 홈 화면의 작은 `운동 그룹` 카드이다.

이후 실제 사용률이 높으면 하단 탭 승격을 별도 작업으로 검토한다.

`ScreenId`에는 `group`을 추가한다. 그룹 내부 세부 화면은 GroupEntryScreen 내부 상태 또는 별도 작은 group router로 처리하며 App의 전역 ScreenId를 세부 단계마다 늘리지 않는다.

## RLS 보안

### group_profiles

- 본인 profile select/update 가능
- 다른 profile은 같은 그룹 멤버 관계가 있을 때 필요한 공개 필드만 조회 가능
- 직접 테이블 전체 select를 허용하지 않는 방향을 우선

### groups

- 같은 그룹 멤버만 select
- 직접 insert/update/delete 대신 RPC 사용 권장

### group_members

- 같은 그룹 멤버끼리 해당 그룹 membership 조회 가능
- 직접 insert/delete는 금지하고 RPC로 처리

### workout_sessions

- 본인은 자신의 session만 생성/수정/조회
- 다른 사용자의 raw session 목록 조회 금지
- 다른 그룹원은 security definer RPC/view를 통해 `is_active` 상태만 조회

### group_activity_daily

- 본인은 자신의 집계 row 직접 조회 가능
- 같은 그룹 멤버는 group dashboard RPC를 통해 집계값만 조회
- 다른 그룹 또는 비로그인 사용자는 조회 불가

## 조회 RPC

### get_my_groups()

현재 사용자의 그룹 목록, 멤버 수, 이번 주 그룹 총 운동시간 반환.

### get_group_dashboard(group_id)

호출자가 해당 그룹 멤버인지 검사 후 다음 필드만 반환:

```text
user_id
nickname
is_owner
is_active
today_seconds
week_seconds
weekly_goal_sessions
weekly_completed_sessions
goal_percent
```

### get_group_member_activity(group_id, member_id)

같은 그룹 멤버 여부를 검사하고 최근 7일 일별 운동시간만 반환.

이 방식으로 프런트가 여러 테이블을 직접 조합하지 않아도 되고 RLS 정책도 단순해진다.

## 실시간 업데이트

첫 MVP에서는 Supabase Realtime presence를 사용하지 않는다.

이유:

- heartbeat + 30~60초 dashboard refresh만으로 충분히 자연스러움
- Realtime channel lifecycle과 모바일 background handling을 추가하면 유지관리 부담이 증가
- 실제 편의 차이는 작음

대신 GroupDetailScreen이 열려 있을 때 30초마다 dashboard RPC를 새로 호출한다. 사용자가 화면을 벗어나면 polling 중지.

## 오류 처리

- 로그인 실패: 기존 게임으로 돌아갈 수 있어야 함
- Google OAuth 취소: 그룹 로그인 화면 유지
- 매직링크 오류/만료: 재전송 버튼
- 초대코드 오류: `초대코드를 확인해 주세요`
- 그룹 정원 초과: `이 그룹은 최대 20명까지 참여할 수 있어요`
- 사용자 그룹 한도: `최대 5개 그룹까지 참여할 수 있어요`
- 네트워크 오류: 기존 게임 기록 저장은 계속 가능
- 세션 종료 API 실패: local timer는 종료하고 재동기화 가능한 pending 상태 보관

그룹 서버 오류 때문에 `completeWorkout`이 실패해서는 안 된다. 운동 기록 저장이 우선이고 그룹 동기화는 후속 best-effort 작업으로 처리한다.

## 개인정보 최소화

Supabase에 그룹 공유 목적으로 올리는 데이터는 다음으로 제한한다.

- auth user id
- group nickname
- group membership
- 세션 시작/종료 시각
- 일별 총 운동시간
- 주간 목표 횟수와 완료 횟수

운동 종목, 중량, 반복수, 세트, 메모는 기존 로컬 게임 상태에만 남긴다.

## 기존 익명 저장과의 격리

`anonymous_game_saves`와 익명 device key 로직은 수정하지 않는다.

로그인 사용자가 되어도:

- localStorage 자동 저장 유지
- 수동 익명 중간 저장 유지
- 그룹 Auth 세션은 별도 목적

향후 계정 기반 전체 게임 동기화를 만들더라도 이번 그룹 작업과 분리한다.

## 테스트 범위

### DB/RPC

- 그룹 생성 시 owner membership 자동 생성
- 6자리 코드 uniqueness
- 최대 5그룹 제한
- 최대 20명 제한
- 중복 가입 방지
- 비멤버 dashboard 접근 차단
- owner만 멤버 제거 가능
- raw workout session 타인 조회 차단
- stale heartbeat가 inactive 처리되는지
- 자정 넘는 세션 일별 분할

### 프런트

- 그룹 진입 시 미로그인 → auth screen
- 로그인 완료 → profile setup 또는 group list
- 기존 닉네임이 최초 group nickname 기본값인지
- 닉네임 변경
- 초대코드 입력과 오류 상태
- 그룹 목록/상세 rendering
- 운동 시작/종료 timer
- 기록 완료 시 timer 자동 종료
- 로그인하지 않아도 timer와 기존 기록 완료가 동작
- 그룹 API 실패 시 기존 workout log 저장 유지

### 회귀

- anonymous_game_saves 저장/복원
- 카드팩 및 레벨 마일스톤
- RecordScreen 기존 운동 수치 입력
- 모바일 키보드/스크롤 레이아웃
- Vercel production build

## 제외 범위

- 그룹 채팅
- 사진/카메라 인증
- 댓글/좋아요
- 공개 그룹 검색
- 전국 또는 글로벌 랭킹
- 그룹 간 대전
- 푸시 알림
- owner 이전
- 계정 기반 전체 게임 세이브 동기화
- Apple 로그인
- 그룹별 다른 닉네임
- Realtime presence

## 구현 순서 권장

1. Supabase Auth 세션 설정 및 Google/매직링크 로그인
2. 그룹 DB/RLS/RPC
3. GroupAuthContext 및 group API 계층
4. GroupEntry/List/Detail 화면
5. RecordScreen 세션 타이머
6. heartbeat와 일별 집계
7. 주간 목표 동기화
8. 그룹 진입 카드 연결
9. 테스트/빌드/Vercel 검증

## 성공 기준

- 기존 사용자는 로그인하지 않아도 게임 전체를 기존처럼 사용할 수 있다.
- 그룹을 사용하려는 사용자는 Google 또는 이메일로 로그인할 수 있다.
- 그룹을 만들고 6자리 코드로 다른 사용자를 초대할 수 있다.
- 한 사용자는 최대 5개 그룹, 그룹은 최대 20명으로 제한된다.
- 같은 그룹에서 오늘/주간 운동시간, 목표 달성률, 현재 운동 중 상태를 볼 수 있다.
- 타인의 상세 운동 기록은 서버에서도 그룹 조회 API로 노출되지 않는다.
- 운동 기록 저장은 그룹 네트워크 오류와 독립적으로 성공한다.
- 기존 익명 Supabase 중간저장 동작이 유지된다.
