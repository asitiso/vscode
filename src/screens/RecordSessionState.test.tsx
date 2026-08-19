// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordSessionTimerPanel } from './RecordSessionTimerPanel';

afterEach(() => cleanup());

describe('RecordSessionTimerPanel', () => {
  it('continues showing the shared running workout time', () => {
    const stop = vi.fn();
    render(
      <RecordSessionTimerPanel
        status="running"
        elapsedSeconds={754}
        lastCompletedSeconds={0}
        onStart={vi.fn()}
        onStop={stop}
      />,
    );

    expect(screen.getByText('운동 중 🔥')).toBeTruthy();
    expect(screen.getByText('00:12:34')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '운동 종료' }));
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('shows the just-finished duration after the home stop action navigates here', () => {
    const start = vi.fn();
    render(
      <RecordSessionTimerPanel
        status="idle"
        elapsedSeconds={0}
        lastCompletedSeconds={1938}
        onStart={start}
        onStop={vi.fn()}
      />,
    );

    expect(screen.getByText('운동 세션 완료')).toBeTruthy();
    expect(screen.getByText('오늘 운동 00:32:18 완료')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 운동 시작' }));
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('keeps the original start state when there is no active or completed session', () => {
    render(
      <RecordSessionTimerPanel
        status="idle"
        elapsedSeconds={0}
        lastCompletedSeconds={0}
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    expect(screen.getByText('운동 세션 타이머')).toBeTruthy();
    expect(screen.getByRole('button', { name: '운동 시작' })).toBeTruthy();
  });
});
