# 운동 리포트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 보상 화면 안에 주간·월간 운동 리포트를 추가해 사용자가 저장된 전체 운동 기록을 기간별로 탐색하고 날짜별 세부 기록을 확인하도록 한다.

**Architecture:** 모든 통계는 기존 `AppState.workoutLogs`에서 계산하며 별도 리포트 데이터를 저장하지 않는다. 날짜 범위 계산과 집계는 `src/game/workoutReport.ts`의 순수 함수로 분리하고, `RewardsScreen`은 `WorkoutReportPanel`과 날짜 상세 바텀시트를 조합해 표시한다. 모바일에서는 보상 화면만 내부 스크롤을 허용하고 하단 내비게이션 높이만큼 여백을 확보한다.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Testing Library, CSS

## Global Constraints

- 보상 화면 탭 순서는 `오늘 활동 | 운동 리포트 | 연속 보상`이다.
- 운동 리포트 내부는 `주간 | 월간` 전환을 제공한다.
- 주간은 월요일 시작, 일요일 종료다.
- 저장된 첫 운동 기록부터 현재까지 전체 기간을 조회할 수 있다.
- 미래 주·월로는 이동할 수 없다.
- 주간과 월간 모두 운동일 수, 기록 횟수, 종목 수, 총 운동 시간, 총 세트, 총 반복을 표시한다.
- 값이 없는 지표도 숨기지 않고 `0`으로 표시한다.
- 가장 많이 한 운동은 해당 기간에 운동한 날짜 수 기준이며 같은 날 여러 번 기록해도 1일로 계산한다.
- 카테고리 분포는 가로 막대로 표시한다.
- 주간은 바로 이전 주, 월간은 바로 이전 달과 절대 증감으로 비교한다.
- 월간 달력은 운동한 날짜에 카테고리 색상 점과 운동 종목 수를 표시한다.
- 날짜를 누르면 바텀시트에서 해당 날짜의 모든 운동 기록, 시간·세트·반복, 느낌을 표시한다.
- 사용자 직접 등록 운동이 삭제되었어도 `WorkoutSetEntry.exerciseName`을 우선 사용해 과거 이름을 유지한다.
- 기록이 없는 기간도 열 수 있으며 모든 통계는 0, 본문에는 `이 기간에는 운동 기록이 없어요`를 표시한다.
- 리포트 전용 통계를 localStorage에 중복 저장하지 않는다.
- 최고 중량, 총볼륨, 장기 추세 그래프는 이번 범위에서 제외한다.
- 기존 오늘 활동과 연속 보상 기능은 변경하지 않는다.

---

## File Structure

- Create: `src/game/workoutReport.ts` — 로컬 날짜 범위, 주간·월간·일별 집계, 이전 기간 비교 순수 함수.
- Create: `src/game/workoutReport.test.ts` — 날짜 경계, 중복 제거, 사용자 운동 이름, 빈 기간, 비교값 테스트.
- Create: `src/screens/WorkoutReportPanel.tsx` — 기간 전환, 이동, 요약, 주간 목록, 월간 달력, 카테고리 막대 UI.
- Create: `src/screens/WorkoutReportPanel.css` — 리포트 레이아웃과 모바일 스타일.
- Create: `src/screens/WorkoutDayDetailSheet.tsx` — 날짜별 상세 기록 바텀시트.
- Create: `src/screens/WorkoutDayDetailSheet.css` — 바텀시트와 안전영역 스타일.
- Modify: `src/screens/RewardsScreen.tsx` — `report` 탭 추가와 리포트 패널 연결.
- Modify: `src/screens/RewardsScreen.css` — 세 개 탭, 내부 스크롤, 하단 내비게이션 여백.

---

### Task 1: 날짜 범위와 리포트 집계 순수 함수

**Files:**
- Create: `src/game/workoutReport.ts`
- Create: `src/game/workoutReport.test.ts`

**Interfaces:**
- Produces: `ReportMetricTotals`
- Produces: `ExerciseReportItem`
- Produces: `CategoryReportItem`
- Produces: `DailyWorkoutReport`
- Produces: `PeriodWorkoutReport`
- Produces: `getWeekStart(dateKey: string): string`
- Produces: `getWeekEnd(weekStart: string): string`
- Produces: `shiftDateKey(dateKey: string, days: number): string`
- Produces: `buildDailyReport(workoutLogs: WorkoutLog[], dateKey: string): DailyWorkoutReport`
- Produces: `buildWeeklyReport(workoutLogs: WorkoutLog[], weekStart: string): PeriodWorkoutReport`
- Produces: `buildMonthlyReport(workoutLogs: WorkoutLog[], year: number, month: number): PeriodWorkoutReport`
- Produces: `getPreviousPeriodDelta(current: PeriodWorkoutReport, previous: PeriodWorkoutReport): ReportMetricTotals`

- [ ] **Step 1: 실패 테스트를 작성한다**

`src/game/workoutReport.test.ts`에 다음 핵심 사례를 작성한다.

```ts
import { describe, expect, it } from 'vitest';
import type { WorkoutLog } from '../types';
import {
  buildDailyReport,
  buildMonthlyReport,
  buildWeeklyReport,
  getPreviousPeriodDelta,
  getWeekStart,
} from './workoutReport';

const log = (date: string, entries: WorkoutLog['entries'], id = date): WorkoutLog => ({
  id: `log-${id}`,
  date,
  entries,
  feeling: 'moderate',
  grantedPackIds: [],
  createdAt: `${date}T09:00:00.000Z`,
});

describe('getWeekStart', () => {
  it('일요일도 같은 주의 월요일을 반환한다', () => {
    expect(getWeekStart('2026-08-09')).toBe('2026-08-03');
  });
});

describe('buildWeeklyReport', () => {
  it('월요일부터 일요일까지 집계한다', () => {
    const report = buildWeeklyReport([
      log('2026-08-03', [{ exerciseId: 'leg-press', sets: 3, reps: 10 }], 'a'),
      log('2026-08-09', [{ exerciseId: 'treadmill', durationMinutes: 20 }], 'b'),
      log('2026-08-10', [{ exerciseId: 'lat-pulldown', sets: 3, reps: 8 }], 'c'),
    ], '2026-08-03');

    expect(report.totals).toMatchObject({ activeDays: 2, logCount: 2, exerciseCount: 2, durationMinutes: 20, sets: 3, reps: 30 });
  });

  it('같은 운동을 같은 날 여러 번 기록해도 인기 운동 날짜 수는 1만 증가한다', () => {
    const report = buildWeeklyReport([
      log('2026-08-03', [{ exerciseId: 'leg-press' }], 'a'),
      log('2026-08-03', [{ exerciseId: 'leg-press' }], 'b'),
      log('2026-08-04', [{ exerciseId: 'treadmill' }], 'c'),
    ], '2026-08-03');

    expect(report.topExercises[0]).toMatchObject({ exerciseId: 'leg-press', activeDays: 1 });
  });
});

describe('buildDailyReport', () => {
  it('삭제된 사용자 운동은 기록에 저장된 이름을 사용한다', () => {
    const report = buildDailyReport([
      log('2026-08-05', [{ exerciseId: 'custom-deleted', exerciseName: '힙 밴드 걷기', durationMinutes: 15 }]),
    ], '2026-08-05');

    expect(report.exercises[0].name).toBe('힙 밴드 걷기');
  });
});

describe('buildMonthlyReport', () => {
  it('기록이 없는 달도 0 통계를 반환한다', () => {
    expect(buildMonthlyReport([], 2026, 8).totals).toEqual({
      activeDays: 0,
      logCount: 0,
      exerciseCount: 0,
      durationMinutes: 0,
      sets: 0,
      reps: 0,
    });
  });
});

describe('getPreviousPeriodDelta', () => {
  it('현재 값에서 이전 값을 뺀 절대 증감을 반환한다', () => {
    const current = buildWeeklyReport([log('2026-08-03', [{ exerciseId: 'treadmill', durationMinutes: 30 }])], '2026-08-03');
    const previous = buildWeeklyReport([], '2026-07-27');
    expect(getPreviousPeriodDelta(current, previous).durationMinutes).toBe(30);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/game/workoutReport.test.ts`

Expected: 모듈과 함수가 없어 FAIL.

- [ ] **Step 3: 리포트 타입과 날짜 유틸리티를 구현한다**

`src/game/workoutReport.ts`에 다음 타입을 정의한다.

```ts
export interface ReportMetricTotals {
  activeDays: number;
  logCount: number;
  exerciseCount: number;
  durationMinutes: number;
  sets: number;
  reps: number;
}

export interface ExerciseReportItem {
  exerciseId: string;
  name: string;
  category: ExerciseCategory;
  activeDays: number;
  durationMinutes: number;
  sets: number;
  reps: number;
}

export interface CategoryReportItem {
  category: ExerciseCategory;
  label: string;
  activeEntries: number;
  percentage: number;
}

export interface DailyWorkoutReport {
  date: string;
  logs: WorkoutLog[];
  exercises: ExerciseReportItem[];
  totals: ReportMetricTotals;
  categories: CategoryReportItem[];
}

export interface PeriodWorkoutReport {
  startDate: string;
  endDate: string;
  days: DailyWorkoutReport[];
  totals: ReportMetricTotals;
  topExercises: ExerciseReportItem[];
  categories: CategoryReportItem[];
}
```

날짜 계산은 `new Date(year, monthIndex, day)`와 `getFullYear`, `getMonth`, `getDate`를 사용해 로컬 날짜 기준으로 처리한다. `new Date('YYYY-MM-DD')`의 UTC 파싱에 의존하지 않는다.

- [ ] **Step 4: 집계 함수를 최소 구현한다**

구현 규칙:

- `durationMinutes`는 모든 항목의 값을 합산한다.
- `sets`는 모든 항목의 값을 합산한다.
- `reps`는 `reps * Math.max(1, sets ?? 1)`로 계산한다.
- `exerciseCount`는 기간 내 서로 다른 운동 ID 수다.
- `activeDays`는 운동 기록이 하나 이상 있는 서로 다른 날짜 수다.
- 운동명은 `entry.exerciseName ?? EXERCISES_BY_ID[entry.exerciseId]?.name ?? '삭제된 운동'` 순서다.
- 운동 카테고리는 기본 운동이면 정의값, 사용자·삭제 운동이면 `etc`다.
- 인기 운동은 날짜별 운동 ID 집합을 만든 뒤 날짜 수를 더한다.
- 동률은 `activeDays`, `sets + durationMinutes`, 한글 이름 순으로 정렬한다.
- 카테고리 비율 분모는 기간 내 전체 운동 항목 수이며 소수점 반올림 정수로 반환한다.

- [ ] **Step 5: 테스트와 빌드를 실행한다**

Run: `npm test -- src/game/workoutReport.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add src/game/workoutReport.ts src/game/workoutReport.test.ts
git commit -m "feat: add workout report aggregation"
```

---

### Task 2: 날짜별 상세 기록 바텀시트

**Files:**
- Create: `src/screens/WorkoutDayDetailSheet.tsx`
- Create: `src/screens/WorkoutDayDetailSheet.css`
- Create: `src/screens/WorkoutDayDetailSheet.test.tsx`

**Interfaces:**
- Consumes: `DailyWorkoutReport`
- Produces: `WorkoutDayDetailSheet({ report, onClose }: { report: DailyWorkoutReport | null; onClose: () => void })`

- [ ] **Step 1: 바텀시트 실패 테스트를 작성한다**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WorkoutDayDetailSheet } from './WorkoutDayDetailSheet';

it('선택한 날짜의 운동과 수치를 표시하고 닫을 수 있다', async () => {
  const onClose = vi.fn();
  render(<WorkoutDayDetailSheet report={{
    date: '2026-08-05',
    logs: [],
    exercises: [{ exerciseId: 'leg-press', name: '레그프레스', category: 'legs', activeDays: 1, durationMinutes: 0, sets: 3, reps: 30 }],
    totals: { activeDays: 1, logCount: 1, exerciseCount: 1, durationMinutes: 0, sets: 3, reps: 30 },
    categories: [],
  }} onClose={onClose} />);

  expect(screen.getByText('8월 5일 운동 기록')).toBeInTheDocument();
  expect(screen.getByText('레그프레스')).toBeInTheDocument();
  expect(screen.getByText('3세트 · 30회')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '닫기' }));
  expect(onClose).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/screens/WorkoutDayDetailSheet.test.tsx`

Expected: 컴포넌트가 없어 FAIL.

- [ ] **Step 3: 바텀시트를 구현한다**

표시 규칙:

- `report === null`이면 아무것도 렌더링하지 않는다.
- 헤더는 `M월 D일 운동 기록`과 `운동 N종`을 표시한다.
- 각 운동은 이름, 시간, 세트, 반복을 표시하되 0인 단위는 문구에서 제외한다.
- 같은 날짜에 여러 로그가 있으면 하단에 각 로그의 느낌과 메모를 시간순으로 표시한다.
- 느낌 문구는 기존 `RewardsScreen`의 `FEELING_LABELS`를 공용 파일로 옮기지 않고 이 컴포넌트 내부 상수로 둔다.
- 배경 클릭과 Escape 키로 닫는다.
- `padding-bottom: max(20px, env(safe-area-inset-bottom))`을 적용한다.

- [ ] **Step 4: 테스트와 빌드를 실행한다**

Run: `npm test -- src/screens/WorkoutDayDetailSheet.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add src/screens/WorkoutDayDetailSheet.tsx src/screens/WorkoutDayDetailSheet.css src/screens/WorkoutDayDetailSheet.test.tsx
git commit -m "feat: add workout day detail sheet"
```

---

### Task 3: 주간·월간 운동 리포트 패널

**Files:**
- Create: `src/screens/WorkoutReportPanel.tsx`
- Create: `src/screens/WorkoutReportPanel.css`
- Create: `src/screens/WorkoutReportPanel.test.tsx`

**Interfaces:**
- Consumes: `WorkoutLog[]`
- Consumes: Task 1의 `buildWeeklyReport`, `buildMonthlyReport`, `buildDailyReport`, `getWeekStart`, `shiftDateKey`, `getPreviousPeriodDelta`
- Consumes: Task 2의 `WorkoutDayDetailSheet`
- Produces: `WorkoutReportPanel({ workoutLogs }: { workoutLogs: WorkoutLog[] })`

- [ ] **Step 1: 패널 실패 테스트를 작성한다**

핵심 테스트:

```tsx
it('주간과 월간을 전환하고 과거 기간을 조회한다', async () => {
  render(<WorkoutReportPanel workoutLogs={[sampleLog]} />);
  expect(screen.getByRole('button', { name: '주간' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText(/이번 주/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '월간' }));
  expect(screen.getByText(/2026년 8월/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '이전 달' }));
  expect(screen.getByText(/2026년 7월/)).toBeInTheDocument();
});

it('기록이 없는 기간에 0 통계와 안내 문구를 표시한다', () => {
  render(<WorkoutReportPanel workoutLogs={[]} />);
  expect(screen.getByText('이 기간에는 운동 기록이 없어요')).toBeInTheDocument();
  expect(screen.getAllByText('0').length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/screens/WorkoutReportPanel.test.tsx`

Expected: 컴포넌트가 없어 FAIL.

- [ ] **Step 3: 기간 상태와 이동을 구현한다**

상태:

```ts
const [range, setRange] = useState<'weekly' | 'monthly'>('weekly');
const [weekStart, setWeekStart] = useState(getWeekStart(getLocalDateKey()));
const [monthCursor, setMonthCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
const [selectedDate, setSelectedDate] = useState<string | null>(null);
```

- `다음 주`, `다음 달`은 현재 기간 이후로 갈 때 disabled.
- 과거 시작점 제한은 두지 않는다. 첫 기록 이전 기간도 빈 리포트로 조회 가능하다.
- 주간 제목은 `8월 3일 – 8월 9일`, 월간 제목은 `2026년 8월` 형식이다.

- [ ] **Step 4: 핵심 요약과 이전 기간 비교를 구현한다**

요약 카드는 다음 6개를 고정 순서로 표시한다.

1. 운동일
2. 기록 횟수
3. 운동 종목
4. 운동 시간
5. 총 세트
6. 총 반복

각 항목 아래에는 `지난주보다 +1`, `지난달보다 -8` 또는 `변화 없음`을 표시한다.

- [ ] **Step 5: 주간 요일 목록을 구현한다**

- 월요일부터 일요일까지 7개 행을 항상 표시한다.
- 날짜, 요일, 운동 종목 수, 대표 운동명을 표시한다.
- 기록이 없는 날은 `기록 없음`을 표시하고 클릭 disabled.
- 기록이 있는 행을 누르면 날짜 상세 바텀시트를 연다.

- [ ] **Step 6: 월간 달력을 구현한다**

- 월요일 시작 7열 달력이다.
- 앞뒤 빈 칸을 포함해 5주 또는 6주 그리드로 구성한다.
- 기록이 있는 날짜는 최대 3개의 카테고리 색상 점과 `N종`을 표시한다.
- 기록이 없는 날짜는 날짜 숫자만 표시한다.
- 미래 날짜는 disabled.
- 날짜 선택 시 바텀시트를 연다.

- [ ] **Step 7: 인기 운동과 카테고리 분포를 구현한다**

- 인기 운동은 상위 3개까지 표시하고 `N일` 문구를 붙인다.
- 카테고리 막대는 비율이 큰 순서로 표시한다.
- 0% 카테고리는 렌더링하지 않는다.
- 색상은 CSS 클래스 `report-category--cardio`, `--legs`처럼 카테고리별로 지정한다.

- [ ] **Step 8: 테스트와 빌드를 실행한다**

Run: `npm test -- src/screens/WorkoutReportPanel.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 9: 커밋한다**

```bash
git add src/screens/WorkoutReportPanel.tsx src/screens/WorkoutReportPanel.css src/screens/WorkoutReportPanel.test.tsx
git commit -m "feat: add weekly and monthly workout reports"
```

---

### Task 4: 보상 화면 탭 통합과 모바일 스크롤

**Files:**
- Modify: `src/screens/RewardsScreen.tsx`
- Modify: `src/screens/RewardsScreen.css`
- Modify: `src/screens/RewardsScreen.test.tsx` if present, otherwise Create: `src/screens/RewardsScreen.test.tsx`

**Interfaces:**
- Consumes: `WorkoutReportPanel`
- Changes: `RewardsTab = 'today' | 'report' | 'streak'`

- [ ] **Step 1: 탭 통합 실패 테스트를 작성한다**

```tsx
it('보상 화면에 오늘 활동, 운동 리포트, 연속 보상 탭을 순서대로 표시한다', () => {
  renderRewardsScreen();
  const tabs = screen.getAllByRole('tab');
  expect(tabs.map((tab) => tab.textContent)).toEqual(['오늘 활동', '운동 리포트', '연속 보상']);
});

it('운동 리포트 탭을 누르면 리포트 패널을 표시한다', async () => {
  renderRewardsScreen();
  await userEvent.click(screen.getByRole('tab', { name: '운동 리포트' }));
  expect(screen.getByRole('button', { name: '주간' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '월간' })).toBeInTheDocument();
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/screens/RewardsScreen.test.tsx`

Expected: 리포트 탭이 없어 FAIL.

- [ ] **Step 3: `RewardsScreen`에 리포트 탭을 연결한다**

- `RewardsTab`에 `report`를 추가한다.
- 탭 순서를 오늘 활동, 운동 리포트, 연속 보상으로 변경한다.
- `activeTab === 'report'`일 때 `<WorkoutReportPanel workoutLogs={state.workoutLogs} />`를 렌더링한다.
- 기존 오늘 활동과 연속 보상 JSX는 변경하지 않는다.

- [ ] **Step 4: 모바일 스크롤과 하단 여백을 적용한다**

`RewardsScreen.css`에서:

```css
.rewards-screen {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  padding-bottom: calc(var(--bottom-nav-height, 88px) + max(20px, env(safe-area-inset-bottom)));
  -webkit-overflow-scrolling: touch;
}

.rewards-tabs {
  position: sticky;
  top: 0;
  z-index: 20;
}
```

- 세 탭은 같은 너비를 사용한다.
- 320px 폭에서도 탭 문구가 한 줄로 유지되도록 글자 크기를 낮춘다.
- 날짜 상세 바텀시트가 열렸을 때 배경 리포트는 `overflow: hidden`으로 잠그지 않는다. 바텀시트 자체가 포인터 이벤트를 차단한다.

- [ ] **Step 5: 테스트와 빌드를 실행한다**

Run: `npm test -- src/screens/RewardsScreen.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add src/screens/RewardsScreen.tsx src/screens/RewardsScreen.css src/screens/RewardsScreen.test.tsx
git commit -m "feat: add workout report tab to rewards"
```

---

### Task 5: 전체 회귀 검증과 PR 갱신

**Files:**
- Modify only if failures require scoped fixes.

**Interfaces:**
- Validates all tasks.

- [ ] **Step 1: 관련 테스트를 한 번에 실행한다**

Run:

```bash
npm test -- \
  src/game/workoutReport.test.ts \
  src/screens/WorkoutDayDetailSheet.test.tsx \
  src/screens/WorkoutReportPanel.test.tsx \
  src/screens/RewardsScreen.test.tsx
```

Expected: 모든 관련 테스트 PASS.

- [ ] **Step 2: 전체 테스트를 실행한다**

Run: `npm test`

Expected: 기존 오늘 활동, 연속 보상, 카드 세트, 미션, 저장 마이그레이션 테스트를 포함해 PASS.

- [ ] **Step 3: 프로덕션 빌드를 실행한다**

Run: `npm run build`

Expected: TypeScript와 Vite 빌드 PASS.

- [ ] **Step 4: 모바일 수동 검증을 수행한다**

검증 기기 폭:

- 360×740
- 390×844
- 430×932

체크리스트:

- 보상 탭의 세 탭이 잘리지 않는다.
- 리포트 본문은 스크롤되고 하단 메뉴는 가려지지 않는다.
- 주간 7일 목록을 끝까지 볼 수 있다.
- 월간 6주 달력도 가로 스크롤 없이 보인다.
- 날짜 상세 바텀시트 하단 버튼이 브라우저 도구막대 위에 보인다.
- 주소창이 열리고 닫혀도 하단 여백이 유지된다.

- [ ] **Step 5: PR 설명을 갱신한다**

PR #14에 다음 내용을 추가한다.

```markdown
## 운동 리포트
- 보상 화면에 운동 리포트 탭 추가
- 주간·월간 전체 기간 조회
- 운동일·횟수·종목·시간·세트·반복 집계
- 이전 주·이전 달 비교
- 요일별 기록과 월간 운동 달력
- 카테고리 분포와 인기 운동
- 날짜별 상세 기록 바텀시트
- 삭제된 사용자 운동의 과거 이름 유지
```

- [ ] **Step 6: 최종 커밋이 필요한 경우 커밋한다**

```bash
git add src

git commit -m "test: verify workout report flows"
```

새 변경이 없으면 빈 커밋을 만들지 않는다.
