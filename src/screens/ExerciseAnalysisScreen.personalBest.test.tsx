// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkoutLog } from '../types';
import { ExerciseAnalysisScreen } from './ExerciseAnalysisScreen';

function workout(id: string, date: string, weightKg: number, personalBest = false): WorkoutLog {
  return {
    id,
    date,
    entries: [{ exerciseId: 'leg-press', weightKg, reps: 10, sets: 3 }],
    feeling: 'moderate',
    personalBestExerciseIds: personalBest ? ['leg-press'] : [],
    grantedPackIds: [],
    createdAt: `${date}T09:00:00.000Z`,
  };
}

describe('ExerciseAnalysisScreen personal best history', () => {
  it('shows NEW RECORD on a recent record that broke the personal best', () => {
    render(
      <ExerciseAnalysisScreen
        exerciseId="leg-press"
        workoutLogs={[
          workout('old', '2026-08-18', 60),
          workout('new', '2026-08-19', 65, true),
        ]}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText('NEW RECORD')).toBeInTheDocument();
  });
});
