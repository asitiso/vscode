// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeWorkoutTimerButton } from './HomeWorkoutTimerButton';

describe('HomeWorkoutTimerButton', () => {
  it('대기 중에는 HUD 캡슐에 운동이라고 표시하고 누르면 타이머 시작만 요청한다', () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    render(<HomeWorkoutTimerButton status="idle" elapsedSeconds={0} onStart={onStart} onStop={onStop} />);

    expect(screen.getByText('운동')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '운동 타이머 시작' }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStop).not.toHaveBeenCalled();
  });

  it('운동 중에는 HUD 캡슐에 경과 시간을 표시하고 누르면 타이머 종료만 요청한다', () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    render(<HomeWorkoutTimerButton status="running" elapsedSeconds={754} onStart={onStart} onStop={onStop} />);

    expect(screen.getByText('12:34')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '운동 타이머 12:34 종료' }));

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
  });
});
