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
        onStart={async () => { calls.push('start'); }}
        onStop={async () => { calls.push('stop'); }}
        onNavigate={() => { calls.push('navigate'); }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '오늘 운동 시작' }));

    await waitFor(() => expect(calls).toEqual(['start', 'navigate']));
    expect(screen.getByText('오늘 운동 시작')).toBeTruthy();
  });

  it('stops the running timer before navigating to the record screen', async () => {
    const calls: string[] = [];

    render(
      <HomeWorkoutCta
        status="running"
        onStart={async () => { calls.push('start'); }}
        onStop={async () => { calls.push('stop'); }}
        onNavigate={() => { calls.push('navigate'); }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '운동 종료하기' }));

    await waitFor(() => expect(calls).toEqual(['stop', 'navigate']));
    expect(screen.getByText('운동 종료하기')).toBeTruthy();
  });
});
