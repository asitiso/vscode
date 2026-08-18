// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeWorkoutTimerButton } from './HomeWorkoutTimerButton';

describe('HomeWorkoutTimerButton', () => {
  it('대기 중에는 스톱워치를 누르면 타이머 시작만 요청한다', () => {
    const onStart = vi.fn();
    render(<HomeWorkoutTimerButton status="idle" elapsedSeconds={0} onStart={onStart} />);

    fireEvent.click(screen.getByRole('button', { name: '운동 타이머 시작' }));

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('운동 중에는 경과 시간을 표시하고 다시 눌러도 시작 요청을 보내지 않는다', () => {
    const onStart = vi.fn();
    render(<HomeWorkoutTimerButton status="running" elapsedSeconds={754} onStart={onStart} />);

    expect(screen.getByText('12:34')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '운동 타이머 12:34 진행 중' }));

    expect(onStart).not.toHaveBeenCalled();
  });
});
