// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

const gameState = vi.hoisted(() => ({
  workoutLogs: [
    {
      id: 'log-record',
      date: '2026-08-19',
      createdAt: '2026-08-19T09:00:00.000Z',
      feeling: 'moderate' as const,
      personalBestExerciseIds: ['leg-press'],
      grantedPackIds: [],
      entries: [{ exerciseId: 'leg-press', weightKg: 65, reps: 10, sets: 3 }],
    },
  ],
  ownedCards: {
    'card-leg-press': {
      cardId: 'card-leg-press',
      count: 1,
      starLevel: 1 as const,
      firstObtainedAt: '2026-08-18T09:00:00.000Z',
      lastObtainedAt: '2026-08-18T09:00:00.000Z',
    },
    'card-treadmill': {
      cardId: 'card-treadmill',
      count: 1,
      starLevel: 1 as const,
      firstObtainedAt: '2026-08-18T09:00:00.000Z',
      lastObtainedAt: '2026-08-18T09:00:00.000Z',
    },
  },
}));

vi.mock('../store/GameContext', () => ({
  useGame: () => ({
    state: gameState,
    cardSetProgress: [],
    dailyCardSet: { id: 'none' },
  }),
}));

import { CollectionScreen } from './CollectionScreen';

it('신기록 필터로 실제 신기록이 있는 운동 카드만 모아보고 카드에 트로피를 표시한다', () => {
  render(<CollectionScreen />);

  expect(screen.getByRole('button', { name: '신기록' })).toBeInTheDocument();
  expect(screen.getByLabelText('레그프레스 신기록 보유')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '신기록' }));

  expect(screen.getByRole('button', { name: '레그프레스 카드 자세히 보기' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '러닝머신 카드 자세히 보기' })).not.toBeInTheDocument();
});
