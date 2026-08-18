// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeWorkoutTimerButton } from './HomeWorkoutTimerButton';

describe('HomeWorkoutTimerButton', () => {
  it('대기 중에는 HUD 캡슐에 운동이라고 표시하고 기록 화면 열기를 요청한다', () => {
    const onOpen = vi.fn();
    render(<HomeWorkoutTimerButton status="idle" elapsedSeconds={0} onOpen={onOpen} />);

    expect(screen.getByText('운동')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '운동 타이머 열기' }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('운동 중에는 HUD 캡슐에 경과 시간을 표시하고 기록 화면 열기를 요청한다', () => {
    const onOpen = vi.fn();
    render(<HomeWorkoutTimerButton status="running" elapsedSeconds={754} onOpen={onOpen} />);

    expect(screen.getByText('12:34')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '운동 타이머 12:34 열기' }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
