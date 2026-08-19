// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { WorkoutLog } from '../types';
import { WorkoutReportPanel } from './WorkoutReportPanel';

const logs: WorkoutLog[] = [
  {
    id: 'log-1',
    date: '2026-08-19',
    createdAt: '2026-08-19T01:00:00.000Z',
    durationSeconds: 2_538,
    feeling: 'moderate',
    personalBestExerciseIds: ['squat'],
    grantedPackIds: ['pack-1'],
    entries: [{ exerciseId: 'squat', exerciseName: '스쿼트', sets: 3, reps: 10 }],
  },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-19T11:00:00+09:00'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('리포트 상단에 최근 7일과 4주 운동시간을 보여주고 최근 기록 목록을 제공한다', () => {
  render(<WorkoutReportPanel workoutLogs={logs} />);

  expect(screen.getByText('최근 7일')).toBeInTheDocument();
  expect(screen.getByText('최근 4주')).toBeInTheDocument();
  expect(screen.getAllByText('42분 18초').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText('최근 운동 기록')).toBeInTheDocument();
  expect(screen.getAllByText('스쿼트').length).toBeGreaterThan(0);
});

it('주간과 월간 리포트에 신기록 통계와 신기록 날짜 트로피를 보여준다', () => {
  render(<WorkoutReportPanel workoutLogs={logs} />);

  const metricCards = [...document.querySelectorAll('.report-metric-card')];
  expect(metricCards).toHaveLength(7);
  expect(metricCards.some((card) => card.textContent?.includes('신기록1개'))).toBe(true);
  expect(screen.getByLabelText('2026-08-19 신기록 1개')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: '월간' }));

  expect(screen.getByLabelText('2026-08-19 신기록 1개')).toBeInTheDocument();
});
