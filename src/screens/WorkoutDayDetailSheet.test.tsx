import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { WorkoutDayDetailSheet } from './WorkoutDayDetailSheet';

it('선택한 날짜의 운동과 수치를 표시하고 닫을 수 있다', async () => {
  const onClose = vi.fn();
  render(
    <WorkoutDayDetailSheet
      report={{
        date: '2026-08-05',
        logs: [],
        exercises: [
          {
            exerciseId: 'leg-press',
            name: '레그프레스',
            category: 'legs',
            activeDays: 1,
            durationMinutes: 0,
            sets: 3,
            reps: 30,
          },
        ],
        totals: {
          activeDays: 1,
          logCount: 1,
          exerciseCount: 1,
          durationMinutes: 0,
          sets: 3,
          reps: 30,
        },
        categories: [],
      }}
      onClose={onClose}
    />,
  );

  expect(screen.getByText('8월 5일 운동 기록')).toBeInTheDocument();
  expect(screen.getByText('레그프레스')).toBeInTheDocument();
  expect(screen.getByText('3세트 · 30회')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '닫기' }));
  expect(onClose).toHaveBeenCalledOnce();
});
