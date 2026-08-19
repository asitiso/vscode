// @vitest-environment jsdom
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

it('그날의 실제 운동시간과 세션별 운동 요약, 종목별 신기록을 표시한다', () => {
  render(
    <WorkoutDayDetailSheet
      report={{
        date: '2026-08-19',
        logs: [
          {
            id: 'log-1',
            date: '2026-08-19',
            createdAt: '2026-08-19T01:00:00.000Z',
            durationSeconds: 2_538,
            feeling: 'moderate',
            memo: '좋았음',
            personalBestExerciseIds: ['squat'],
            grantedPackIds: ['pack-1'],
            entries: [
              { exerciseId: 'squat', exerciseName: '스쿼트', sets: 3, reps: 10 },
              { exerciseId: 'run', exerciseName: '러닝', durationMinutes: 15 },
            ],
          },
        ],
        exercises: [
          { exerciseId: 'squat', name: '스쿼트', category: 'legs', activeDays: 1, durationMinutes: 0, sets: 3, reps: 30 },
          { exerciseId: 'run', name: '러닝', category: 'cardio', activeDays: 1, durationMinutes: 15, sets: 0, reps: 0 },
        ],
        totals: {
          activeDays: 1,
          logCount: 1,
          exerciseCount: 2,
          durationMinutes: 15,
          sets: 3,
          reps: 30,
        },
        categories: [],
      }}
      onClose={vi.fn()}
    />,
  );

  expect(screen.getByText('00:42:18')).toBeInTheDocument();
  expect(screen.getByText('1번째 운동')).toBeInTheDocument();
  expect(screen.getByText('스쿼트 · 러닝')).toBeInTheDocument();
  expect(screen.getByText('3세트 · 30회 · 카드팩 1개')).toBeInTheDocument();
  expect(screen.getByText('NEW RECORD')).toBeInTheDocument();
});
