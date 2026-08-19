// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HomeWorkoutCta } from './HomeWorkoutCta';

afterEach(() => cleanup());

describe('HomeWorkoutCta', () => {
  it('starts the timer before navigating to the record screen', async () => {
    const calls: string[] = [];

    render(
      <HomeWorkoutCta
        status="idle"
        elapsedSeconds={0}
        onStart={async () => { calls.push('start'); }}
        onStop={async () => { calls.push('stop'); }}
        onNavigate={() => { calls.push('navigate'); }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '오늘 운동 시작' }));

    await waitFor(() => expect(calls).toEqual(['start', 'navigate']));
    expect(screen.getByText('오늘 운동 시작')).toBeTruthy();
  });

  it('shows elapsed time while running, then stops before navigating to the record screen', async () => {
    const calls: string[] = [];

    render(
      <HomeWorkoutCta
        status="running"
        elapsedSeconds={754}
        onStart={async () => { calls.push('start'); }}
        onStop={async () => { calls.push('stop'); }}
        onNavigate={() => { calls.push('navigate'); }}
      />,
    );

    expect(screen.getByText('12:34')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '운동 종료하기 · 12:34' }));

    await waitFor(() => expect(calls).toEqual(['stop', 'navigate']));
    expect(screen.getByText('운동 종료하기')).toBeTruthy();
  });
});
