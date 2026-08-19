// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { WorkoutLog } from '../types';
import { WorkoutHistoryList } from './WorkoutHistoryList';

const logs: WorkoutLog[] = [
  {
    id: 'log-1',
    date: '2026-08-19',
    createdAt: '2026-08-19T01:00:00.000Z',
    durationSeconds: 2_538,
    feeling: 'moderate',
    grantedPackIds: ['pack-1'],
    entries: [
      { exerciseId: 'squat', exerciseName: '스쿼트', sets: 3, reps: 10 },
      { exerciseId: 'run', exerciseName: '러닝', durationMinutes: 15 },
    ],
  },
];

it('운동 기록 카드에 시간과 종목 요약을 표시하고 날짜 상세를 연다', async () => {
  const onSelectDay = vi.fn();
  render(<WorkoutHistoryList workoutLogs={logs} onSelectDay={onSelectDay} />);

  expect(screen.getByText('최근 운동 기록')).toBeInTheDocument();
  expect(screen.getByText(/42분 18초/)).toBeInTheDocument();
  expect(screen.getByText('스쿼트 · 러닝')).toBeInTheDocument();
  expect(screen.getByText('3세트 · 30회 · 카드팩 1개')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /8월 19일 운동 기록 자세히 보기/ }));
  expect(onSelectDay).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-08-19' }));
});
