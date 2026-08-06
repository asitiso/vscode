# 운동 상세 분석 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운동 리포트에서 운동명을 눌러 운동별 최고 기록, 누적 통계, 최근 4회 추세와 전체 수행 기록을 확인할 수 있게 한다.

**Architecture:** 모든 분석값은 기존 `AppState.workoutLogs`에서 파생하며 별도 분석 상태를 저장하지 않는다. 운동별 기록 정규화와 집계는 순수 함수로 분리하고, 상세 화면은 SVG 추세 그래프·최근 기록·전체 기록 목록을 조합한다. 기존 `WorkoutDayDetailSheet`를 재사용해 날짜 상세를 보여주고, `RewardsScreen`이 리포트 선택 상태와 분석 화면 전환을 관리한다.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Testing Library, CSS, inline SVG

## Global Constraints

- 운동 분석은 운동 리포트의 운동명을 눌러 진입한다.
- 뒤로가면 기존 주간·월간 모드와 보고 있던 기간을 유지한다.
- 별도 분석 데이터를 localStorage에 저장하지 않고 기존 `workoutLogs`에서 계산한다.
- 최고 기록 카드는 해당 값이 있는 항목만 최대 3개 표시한다.
- 누적 통계는 운동일, 기록 횟수, 총 세트, 총 반복, 총 운동 시간을 표시한다.
- 최근 4회 그래프 대표 지표는 중량 기록이 있으면 최고 중량, 아니면 시간 기록이 있으면 운동 시간, 그 외 총 반복이다.
- 최근 4회 그래프는 외부 차트 라이브러리 없이 SVG로 구현한다.
- 최근 4회 기록 카드는 날짜, 중량, 시간, 세트, 반복, 느낌을 실제 저장값 기준으로 표시한다.
- 전체 기록은 최신순 세로 목록이며 첫 20개를 표시하고 `더 보기`로 20개씩 추가한다.
- 전체 기록 카드를 누르면 기존 날짜 상세 바텀시트를 연다.
- 사용자 직접 등록 운동이 삭제됐어도 `WorkoutSetEntry.exerciseName`을 우선 사용한다.
- 날짜 파싱 실패 기록은 목록 맨 아래에 두되 삭제하지 않는다.
- 기록이 없거나 잘못된 운동 ID로 진입하면 안내와 돌아가기 동작을 제공한다.
- 총볼륨, 평균 중량, 장기 추세 그래프, 검색·필터·정렬 변경은 이번 범위에서 제외한다.
- 기존 오늘 활동, 운동 리포트, 연속 보상 기능은 변경하지 않는다.

---

## File Structure

- Create: `src/game/exerciseAnalysis.ts` — 운동별 수행 기록 정규화, 최고 기록, 누적 통계, 최근 기록, 그래프 지표 계산.
- Create: `src/game/exerciseAnalysis.test.ts` — 집계 규칙과 정렬·삭제 운동·빈 기록 테스트.
- Create: `src/screens/ExerciseTrendChart.tsx` — 최근 4회 SVG 미니 선 그래프.
- Create: `src/screens/ExerciseTrendChart.test.tsx` — 1개·여러 개 지점과 접근성 테스트.
- Create: `src/screens/ExerciseAnalysisScreen.tsx` — 운동별 상세 분석 화면과 최근 기록 카드.
- Create: `src/screens/ExerciseAnalysisScreen.css` — 상세 분석 화면과 모바일 반응형 스타일.
- Create: `src/screens/ExerciseAnalysisScreen.test.tsx` — 최고 기록, 누적 통계, 전체 기록 진입 테스트.
- Create: `src/screens/ExerciseHistoryList.tsx` — 20개 단위 전체 기록 목록과 날짜 상세 선택.
- Create: `src/screens/ExerciseHistoryList.test.tsx` — 더 보기와 바텀시트 연동 테스트.
- Modify: `src/screens/WorkoutReportPanel.tsx` — 운동명 선택 콜백 추가.
- Modify: `src/screens/WorkoutDayDetailSheet.tsx` — 운동명 선택 콜백을 선택적으로 지원.
- Modify: `src/screens/RewardsScreen.tsx` — 운동 분석 화면 전환과 뒤로가기 상태 유지.
- Modify: `src/RewardsReport.css` — 운동명 버튼과 분석 화면 진입 스타일 보완.

---

### Task 1: 운동별 기록 정규화와 분석 집계

**Files:**
- Create: `src/game/exerciseAnalysis.ts`
- Create: `src/game/exerciseAnalysis.test.ts`

**Interfaces:**
- Produces: `ExercisePerformanceRecord`
- Produces: `ExerciseAnalysisTotals`
- Produces: `ExercisePersonalBest`
- Produces: `ExerciseTrendMetric`
- Produces: `ExerciseAnalysis`
- Produces: `buildExerciseHistory(workoutLogs: WorkoutLog[], exerciseId: string): ExercisePerformanceRecord[]`
- Produces: `buildExerciseTrend(records: ExercisePerformanceRecord[]): { metric: ExerciseTrendMetric; points: ExerciseTrendPoint[] }`
- Produces: `buildExerciseAnalysis(workoutLogs: WorkoutLog[], exerciseId: string): ExerciseAnalysis | null`

- [ ] **Step 1: 실패 테스트를 작성한다**

`src/game/exerciseAnalysis.test.ts`에 다음 사례를 작성한다.

```ts
import { describe, expect, it } from 'vitest';
import type { WorkoutLog } from '../types';
import {
  buildExerciseAnalysis,
  buildExerciseHistory,
  buildExerciseTrend,
} from './exerciseAnalysis';

const log = (
  id: string,
  date: string,
  entries: WorkoutLog['entries'],
  createdAt = `${date}T09:00:00.000Z`,
): WorkoutLog => ({
  id,
  date,
  entries,
  feeling: 'moderate',
  grantedPackIds: [],
  createdAt,
});

describe('buildExerciseHistory', () => {
  it('같은 날짜의 서로 다른 로그를 별도 수행 기록으로 유지한다', () => {
    const records = buildExerciseHistory([
      log('a', '2026-08-05', [{ exerciseId: 'leg-press', weightKg: 40, sets: 3, reps: 10 }]),
      log('b', '2026-08-05', [{ exerciseId: 'leg-press', weightKg: 45, sets: 2, reps: 8 }], '2026-08-05T11:00:00.000Z'),
    ], 'leg-press');

    expect(records).toHaveLength(2);
    expect(records[0].weightKg).toBe(45);
  });

  it('삭제된 사용자 운동은 저장된 이름을 유지한다', () => {
    const records = buildExerciseHistory([
      log('a', '2026-08-05', [{ exerciseId: 'custom-gone', exerciseName: '힙 밴드 걷기', durationMinutes: 15 }]),
    ], 'custom-gone');

    expect(records[0].exerciseName).toBe('힙 밴드 걷기');
  });
});

describe('buildExerciseAnalysis', () => {
  it('운동일과 기록 횟수를 구분하고 최고 기록을 계산한다', () => {
    const analysis = buildExerciseAnalysis([
      log('a', '2026-08-04', [{ exerciseId: 'leg-press', weightKg: 40, sets: 3, reps: 10 }]),
      log('b', '2026-08-04', [{ exerciseId: 'leg-press', weightKg: 50, sets: 2, reps: 8 }]),
      log('c', '2026-08-05', [{ exerciseId: 'leg-press', weightKg: 45, sets: 4, reps: 12 }]),
    ], 'leg-press');

    expect(analysis?.totals).toMatchObject({ activeDays: 2, recordCount: 3, sets: 9, reps: 94 });
    expect(analysis?.personalBests.maxWeightKg).toBe(50);
    expect(analysis?.personalBests.maxReps).toBe(48);
  });

  it('기록이 없으면 null을 반환한다', () => {
    expect(buildExerciseAnalysis([], 'missing')).toBeNull();
  });
});

describe('buildExerciseTrend', () => {
  it('중량 기록이 하나라도 있으면 중량을 대표 지표로 고른다', () => {
    const records = buildExerciseHistory([
      log('a', '2026-08-01', [{ exerciseId: 'leg-press', sets: 3, reps: 10 }]),
      log('b', '2026-08-02', [{ exerciseId: 'leg-press', weightKg: 50, sets: 3, reps: 10 }]),
    ], 'leg-press');

    expect(buildExerciseTrend(records).metric).toBe('weight');
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/game/exerciseAnalysis.test.ts`

Expected: 모듈이 없어 FAIL.

- [ ] **Step 3: 타입과 기록 정규화를 구현한다**

```ts
export type ExerciseTrendMetric = 'weight' | 'duration' | 'reps';

export interface ExercisePerformanceRecord {
  id: string;
  logId: string;
  date: string;
  createdAt: string;
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  durationMinutes: number;
  sets: number;
  repsPerSet: number;
  totalReps: number;
  feeling: FeelingTag;
  note?: string;
}

export interface ExerciseAnalysisTotals {
  activeDays: number;
  recordCount: number;
  sets: number;
  reps: number;
  durationMinutes: number;
}

export interface ExercisePersonalBest {
  maxWeightKg?: number;
  maxDurationMinutes?: number;
  maxReps?: number;
}

export interface ExerciseTrendPoint {
  recordId: string;
  date: string;
  value: number;
}

export interface ExerciseAnalysis {
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  latestDate: string;
  totals: ExerciseAnalysisTotals;
  personalBests: ExercisePersonalBest;
  history: ExercisePerformanceRecord[];
  recentRecords: ExercisePerformanceRecord[];
  trend: {
    metric: ExerciseTrendMetric;
    points: ExerciseTrendPoint[];
  };
}
```

정규화 규칙:

- 각 로그 안에서 대상 운동 항목을 찾고, 항목마다 하나의 `ExercisePerformanceRecord`를 만든다.
- 이름은 `entry.exerciseName ?? EXERCISES_BY_ID[exerciseId]?.name ?? '삭제된 운동'` 순서다.
- 기본 운동 카테고리를 찾지 못하면 `etc`다.
- `totalReps`는 `(entry.reps ?? 0) * Math.max(1, entry.sets ?? 1)`다.
- 최신순은 유효한 날짜, `createdAt`, 로그 ID 순으로 정렬한다.
- `YYYY-MM-DD` 파싱 실패 기록은 유효 기록 뒤에 두고 `createdAt` 역순으로 정렬한다.

- [ ] **Step 4: 누적·최고 기록·최근 4회·추세 지표를 구현한다**

- `activeDays`: 유효·무효 여부와 관계없이 서로 다른 저장 날짜 문자열 수.
- `recordCount`: 정규화된 수행 기록 수.
- `sets`, `reps`, `durationMinutes`: 모든 수행 기록 합계.
- `maxWeightKg`: `weightKg > 0`인 값의 최댓값.
- `maxDurationMinutes`: `durationMinutes > 0`인 값의 최댓값.
- `maxReps`: `totalReps > 0`인 값의 최댓값.
- `recentRecords`: 최신순 첫 4개.
- 대표 지표 우선순위: 전체 history에 `weightKg > 0`이 하나라도 있으면 `weight`, 아니면 `durationMinutes > 0`이 있으면 `duration`, 그 외 `reps`.
- 그래프 점은 최근 4개를 오래된 순으로 뒤집고, 해당 값이 없으면 `0`을 사용한다.

- [ ] **Step 5: 테스트와 빌드를 실행한다**

Run: `npm test -- src/game/exerciseAnalysis.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add src/game/exerciseAnalysis.ts src/game/exerciseAnalysis.test.ts
git commit -m "feat: add exercise analysis aggregation"
```

---

### Task 2: 최근 4회 SVG 추세 그래프

**Files:**
- Create: `src/screens/ExerciseTrendChart.tsx`
- Create: `src/screens/ExerciseTrendChart.test.tsx`
- Modify: `src/screens/ExerciseAnalysisScreen.css`

**Interfaces:**
- Consumes: `ExerciseTrendMetric`, `ExerciseTrendPoint[]`
- Produces: `ExerciseTrendChart({ metric, points }: { metric: ExerciseTrendMetric; points: ExerciseTrendPoint[] })`

- [ ] **Step 1: 실패 테스트를 작성한다**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExerciseTrendChart } from './ExerciseTrendChart';

it('그래프 제목과 최근 지점 값을 표시한다', () => {
  render(<ExerciseTrendChart metric="weight" points={[
    { recordId: 'a', date: '2026-08-01', value: 40 },
    { recordId: 'b', date: '2026-08-03', value: 50 },
  ]} />);

  expect(screen.getByText('최근 최고 중량 변화')).toBeInTheDocument();
  expect(screen.getByText('50kg')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: '최근 최고 중량 변화 그래프' })).toBeInTheDocument();
});

it('지점이 하나여도 정상 렌더링한다', () => {
  render(<ExerciseTrendChart metric="duration" points={[
    { recordId: 'a', date: '2026-08-01', value: 20 },
  ]} />);

  expect(screen.getByText('20분')).toBeInTheDocument();
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/screens/ExerciseTrendChart.test.tsx`

Expected: 컴포넌트가 없어 FAIL.

- [ ] **Step 3: SVG 좌표 계산과 그래프를 구현한다**

- `viewBox="0 0 320 120"`을 사용한다.
- 좌우 패딩 24, 상단 16, 하단 28을 둔다.
- 값이 모두 같으면 중앙 높이에 배치한다.
- 1개 지점은 중앙 X에 배치한다.
- polyline, 점 circle, 날짜 라벨, 최신 값 배지를 표시한다.
- `role="img"`와 대표 지표별 한국어 `aria-label`을 제공한다.
- metric별 표시 단위는 `kg`, `분`, `회`다.

- [ ] **Step 4: 반응형 CSS를 추가한다**

- SVG는 `width: 100%; height: auto;`다.
- 그래프 카드의 최소 너비를 만들지 않는다.
- 320px 폭에서도 가로 스크롤이 발생하지 않게 한다.

- [ ] **Step 5: 테스트와 빌드를 실행한다**

Run: `npm test -- src/screens/ExerciseTrendChart.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add src/screens/ExerciseTrendChart.tsx src/screens/ExerciseTrendChart.test.tsx src/screens/ExerciseAnalysisScreen.css
git commit -m "feat: add exercise trend chart"
```

---

### Task 3: 운동 상세 분석 화면

**Files:**
- Create: `src/screens/ExerciseAnalysisScreen.tsx`
- Create: `src/screens/ExerciseAnalysisScreen.css`
- Create: `src/screens/ExerciseAnalysisScreen.test.tsx`

**Interfaces:**
- Consumes: `ExerciseAnalysis`, `ExerciseTrendChart`
- Produces: `ExerciseAnalysisScreen({ analysis, onBack, onOpenHistory, onSelectDate }: Props)`

```ts
interface Props {
  analysis: ExerciseAnalysis | null;
  onBack: () => void;
  onOpenHistory: () => void;
  onSelectDate: (date: string) => void;
}
```

- [ ] **Step 1: 실패 테스트를 작성한다**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseAnalysisScreen } from './ExerciseAnalysisScreen';

it('최고 기록과 누적 통계, 최근 기록을 표시한다', () => {
  render(<ExerciseAnalysisScreen analysis={{
    exerciseId: 'leg-press',
    exerciseName: '레그프레스',
    category: 'legs',
    latestDate: '2026-08-05',
    totals: { activeDays: 3, recordCount: 4, sets: 12, reps: 120, durationMinutes: 0 },
    personalBests: { maxWeightKg: 70, maxReps: 40 },
    history: [],
    recentRecords: [{
      id: 'a', logId: 'log-a', date: '2026-08-05', createdAt: '2026-08-05T09:00:00.000Z',
      exerciseId: 'leg-press', exerciseName: '레그프레스', weightKg: 70,
      durationMinutes: 0, sets: 3, repsPerSet: 10, totalReps: 30,
      feeling: 'moderate',
    }],
    trend: { metric: 'weight', points: [{ recordId: 'a', date: '2026-08-05', value: 70 }] },
  }} onBack={() => {}} onOpenHistory={() => {}} onSelectDate={() => {}} />);

  expect(screen.getByRole('heading', { name: '레그프레스' })).toBeInTheDocument();
  expect(screen.getByText('70kg')).toBeInTheDocument();
  expect(screen.getByText('3일')).toBeInTheDocument();
  expect(screen.getByText('최근 4회 기록')).toBeInTheDocument();
});

it('전체 기록 보기 동작을 호출한다', async () => {
  const onOpenHistory = vi.fn();
  render(<ExerciseAnalysisScreen analysis={null} onBack={() => {}} onOpenHistory={onOpenHistory} onSelectDate={() => {}} />);
  expect(screen.getByText('아직 분석할 기록이 없어요')).toBeInTheDocument();
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/screens/ExerciseAnalysisScreen.test.tsx`

Expected: 컴포넌트가 없어 FAIL.

- [ ] **Step 3: 분석 화면 구조를 구현한다**

화면 순서:

1. 뒤로가기, 운동명, 최근 운동일.
2. 값이 있는 최고 기록 카드 최대 3개.
3. 누적 통계 5개.
4. `ExerciseTrendChart`.
5. 최근 4회 기록 카드.
6. `전체 기록 보기` 버튼.

최근 기록 카드 표시 규칙:

- 날짜는 `M월 D일`.
- `weightKg > 0`이면 중량 표시.
- `durationMinutes > 0`이면 시간 표시.
- `sets > 0`이면 세트 표시.
- `totalReps > 0`이면 반복 표시.
- 느낌은 기존 `FeelingTag` 한국어 레이블을 재사용하거나 공용 상수로 분리한다.
- 카드를 누르면 `onSelectDate(record.date)`를 호출한다.

- [ ] **Step 4: 빈 기록과 잘못된 운동 처리 UI를 구현한다**

`analysis === null`이면:

- `아직 분석할 기록이 없어요`
- `운동 리포트로 돌아가기` 버튼
- `onBack` 호출

- [ ] **Step 5: 모바일 CSS를 구현한다**

- 화면 자체가 세로 스크롤된다.
- 최고 기록은 2열, 누적 통계는 작은 화면에서 2열로 줄어든다.
- 기록 카드는 줄바꿈하며 320px에서 가로 넘침이 없다.
- 하단 내비게이션 높이와 `env(safe-area-inset-bottom)`을 포함한 패딩을 둔다.

- [ ] **Step 6: 테스트와 빌드를 실행한다**

Run: `npm test -- src/screens/ExerciseAnalysisScreen.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 7: 커밋한다**

```bash
git add src/screens/ExerciseAnalysisScreen.tsx src/screens/ExerciseAnalysisScreen.css src/screens/ExerciseAnalysisScreen.test.tsx
git commit -m "feat: add exercise analysis screen"
```

---

### Task 4: 전체 운동 기록 목록과 날짜 상세 연동

**Files:**
- Create: `src/screens/ExerciseHistoryList.tsx`
- Create: `src/screens/ExerciseHistoryList.test.tsx`
- Modify: `src/screens/ExerciseAnalysisScreen.css`

**Interfaces:**
- Consumes: `ExercisePerformanceRecord[]`
- Produces: `ExerciseHistoryList({ records, onBack, onSelectDate }: Props)`

```ts
interface Props {
  records: ExercisePerformanceRecord[];
  onBack: () => void;
  onSelectDate: (date: string) => void;
}
```

- [ ] **Step 1: 실패 테스트를 작성한다**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ExerciseHistoryList } from './ExerciseHistoryList';

it('처음 20개만 표시하고 더 보기로 20개를 추가한다', async () => {
  const records = Array.from({ length: 25 }, (_, index) => ({
    id: `r-${index}`, logId: `l-${index}`, date: `2026-07-${String(25 - index).padStart(2, '0')}`,
    createdAt: `2026-07-01T09:${String(index).padStart(2, '0')}:00.000Z`, exerciseId: 'treadmill',
    exerciseName: '러닝머신', weightKg: 0, durationMinutes: 20, sets: 0,
    repsPerSet: 0, totalReps: 0, feeling: 'moderate' as const,
  }));

  render(<ExerciseHistoryList records={records} onBack={() => {}} onSelectDate={() => {}} />);
  expect(screen.getAllByRole('button', { name: /운동 상세 보기/ })).toHaveLength(20);
  await userEvent.click(screen.getByRole('button', { name: '기록 더 보기' }));
  expect(screen.getAllByRole('button', { name: /운동 상세 보기/ })).toHaveLength(25);
});

it('기록 선택 시 날짜를 전달한다', async () => {
  const onSelectDate = vi.fn();
  const record = {
    id: 'r', logId: 'l', date: '2026-08-05', createdAt: '2026-08-05T09:00:00.000Z',
    exerciseId: 'treadmill', exerciseName: '러닝머신', weightKg: 0,
    durationMinutes: 20, sets: 0, repsPerSet: 0, totalReps: 0, feeling: 'moderate' as const,
  };
  render(<ExerciseHistoryList records={[record]} onBack={() => {}} onSelectDate={onSelectDate} />);
  await userEvent.click(screen.getByRole('button', { name: /2026년 8월 5일 운동 상세 보기/ }));
  expect(onSelectDate).toHaveBeenCalledWith('2026-08-05');
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/screens/ExerciseHistoryList.test.tsx`

Expected: 컴포넌트가 없어 FAIL.

- [ ] **Step 3: 20개 단위 목록을 구현한다**

- 내부 `visibleCount` 초기값은 20.
- `기록 더 보기`를 누르면 `Math.min(records.length, visibleCount + 20)`.
- 화면 재진입 시 20개부터 시작한다.
- 최신순은 상위 집계 함수의 정렬을 그대로 사용한다.
- 카드에 날짜, 중량, 시간, 세트, 반복, 느낌을 표시한다.
- 값이 없는 항목은 카드에서 숨긴다.
- 날짜 파싱 실패면 원래 문자열을 그대로 표시한다.

- [ ] **Step 4: 날짜 상세 선택을 연결한다**

각 카드는 button으로 만들고 `onSelectDate(record.date)`를 호출한다. 같은 날짜에 여러 기록이 있어도 각각 표시되며, 선택 시 기존 날짜 전체 상세 바텀시트가 열린다.

- [ ] **Step 5: 테스트와 빌드를 실행한다**

Run: `npm test -- src/screens/ExerciseHistoryList.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 6: 커밋한다**

```bash
git add src/screens/ExerciseHistoryList.tsx src/screens/ExerciseHistoryList.test.tsx src/screens/ExerciseAnalysisScreen.css
git commit -m "feat: add exercise history list"
```

---

### Task 5: 운동 리포트 진입점과 화면 상태 통합

**Files:**
- Modify: `src/screens/WorkoutReportPanel.tsx`
- Modify: `src/screens/WorkoutDayDetailSheet.tsx`
- Modify: `src/screens/RewardsScreen.tsx`
- Modify: `src/RewardsReport.css`
- Test: `src/screens/RewardsScreen.test.tsx` 또는 기존 보상 화면 테스트 파일

**Interfaces:**
- `WorkoutReportPanel`에 `onSelectExercise?: (exerciseId: string) => void` 추가.
- `WorkoutDayDetailSheet`에 `onSelectExercise?: (exerciseId: string) => void` 추가.
- `RewardsScreen` 내부 화면 상태: `'rewards' | 'analysis' | 'history'`.

- [ ] **Step 1: 통합 실패 테스트를 작성한다**

테스트에서 운동 로그가 있는 GameContext를 렌더링하고:

1. `운동 리포트` 탭 선택.
2. 운동명 버튼 클릭.
3. `레그프레스` 분석 제목 확인.
4. 뒤로가기 클릭.
5. 이전 주간·월간 선택과 기간 제목이 유지되는지 확인.

또한 월간 날짜 상세 바텀시트의 운동명을 눌러 같은 분석 화면으로 진입하는 사례를 추가한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/screens/RewardsScreen.test.tsx`

Expected: 선택 콜백과 화면 전환이 없어 FAIL.

- [ ] **Step 3: 운동명을 접근 가능한 버튼으로 변경한다**

`WorkoutReportPanel`에서 다음 위치를 버튼으로 만든다.

- 가장 많이 한 운동.
- 주간 일별 운동 항목.
- 월간 날짜 상세 바텀시트의 운동 항목.

버튼은 기존 텍스트 스타일을 유지하고 `onSelectExercise(exerciseId)`를 호출한다. 콜백이 없으면 일반 텍스트로 렌더링해 기존 사용처를 깨지 않는다.

- [ ] **Step 4: RewardsScreen 화면 전환을 구현한다**

상태:

```ts
type RewardsView = 'rewards' | 'analysis' | 'history';
const [rewardsView, setRewardsView] = useState<RewardsView>('rewards');
const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
const [selectedAnalysisDate, setSelectedAnalysisDate] = useState<string | null>(null);
```

- 운동 선택 시 ID를 저장하고 `analysis`로 전환한다.
- 분석 화면에서 `전체 기록 보기`는 `history`로 전환한다.
- history 뒤로가기는 analysis로, analysis 뒤로가기는 rewards로 전환한다.
- `WorkoutReportPanel`은 언마운트돼도 그 기간 상태가 사라지지 않도록 기간·모드 상태를 `RewardsScreen`으로 끌어올리거나 컴포넌트를 숨김 렌더링한다. 권장안은 `reportMode`, `weekStart`, `monthCursor`를 제어형 props로 승격하는 것이다.
- 선택 날짜는 `buildDailyReport(state.workoutLogs, selectedAnalysisDate)`로 계산해 기존 `WorkoutDayDetailSheet`에 전달한다.

- [ ] **Step 5: 브라우저 뒤로가기 처리 범위를 제한해 구현한다**

앱이 기존 라우터를 사용하지 않는다면 실제 History API를 새로 도입하지 않는다. 화면 내 뒤로가기 버튼으로 상태를 복원한다. Android 시스템 뒤로가기가 이미 앱 전역에서 처리되고 있다면 기존 처리 지점에 `history → analysis → rewards` 우선순위만 추가한다.

- [ ] **Step 6: CSS를 보완한다**

- 운동명 버튼은 밑줄 없이 기존 색을 유지하되 터치 영역 최소 40px.
- 분석·전체 기록 화면에서 하단 내비게이션에 가리지 않도록 안전 여백 적용.
- 작은 화면에서 탭 상태와 분석 화면이 겹치지 않게 한다.

- [ ] **Step 7: 테스트와 빌드를 실행한다**

Run: `npm test -- src/screens/RewardsScreen.test.tsx src/screens/ExerciseAnalysisScreen.test.tsx src/screens/ExerciseHistoryList.test.tsx && npm run build`

Expected: PASS.

- [ ] **Step 8: 커밋한다**

```bash
git add src/screens/WorkoutReportPanel.tsx src/screens/WorkoutDayDetailSheet.tsx src/screens/RewardsScreen.tsx src/RewardsReport.css src/screens/RewardsScreen.test.tsx
git commit -m "feat: connect exercise analysis to workout reports"
```

---

### Task 6: 회귀 검증과 PR 설명 갱신

**Files:**
- Modify: PR #14 description only.

**Interfaces:**
- Consumes: Tasks 1–5 final branch.
- Produces: 검증 결과와 갱신된 PR 설명.

- [ ] **Step 1: 운동 분석 관련 테스트를 실행한다**

Run:

```bash
npm test -- \
  src/game/exerciseAnalysis.test.ts \
  src/game/workoutReport.test.ts \
  src/screens/ExerciseTrendChart.test.tsx \
  src/screens/ExerciseAnalysisScreen.test.tsx \
  src/screens/ExerciseHistoryList.test.tsx \
  src/screens/WorkoutDayDetailSheet.test.tsx \
  src/screens/RewardsScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 2: 전체 테스트와 빌드를 실행한다**

Run:

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 3: 모바일 수동 검증을 한다**

검증 폭: 320px, 360px, 390px.

확인 항목:

- 리포트 운동명 터치 영역.
- 분석 화면 최고 기록·통계 카드 줄바꿈.
- SVG 그래프 가로 넘침 없음.
- 최근 기록 카드와 전체 기록 목록 스크롤.
- 20개 단위 더 보기.
- 날짜 상세 바텀시트가 하단 내비게이션 위에 표시됨.
- 분석 뒤로가기 후 기존 주·월과 기간 유지.

- [ ] **Step 4: PR #14 설명을 갱신한다**

추가할 항목:

- 운동별 최고 기록과 누적 통계.
- 최근 4회 SVG 추세 그래프.
- 최근 4회 기록 카드.
- 전체 기록 20개 단위 목록.
- 운동 리포트와 날짜 상세에서 운동 분석 진입.
- 삭제된 사용자 운동 이름 유지.
- 실제 실행한 테스트·빌드 결과.

검증을 실행하지 못한 항목은 성공으로 쓰지 않고 원인을 명시한다.

- [ ] **Step 5: 최종 커밋 상태와 CI를 확인한다**

Run:

```bash
git status --short
git log -5 --oneline
```

Expected: 작업 트리가 깨끗하고 Tasks 1–5 커밋이 존재한다.

GitHub/Vercel 상태가 계정 빌드 제한으로 실패하면 코드 실패와 구분해 PR 설명에 기록한다.
