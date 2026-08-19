// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkoutCompletionFeedback } from './WorkoutCompletionFeedback';

afterEach(() => cleanup());

const summary = {
  durationSeconds: 1938,
  xpGain: 100,
  weeklySessions: 1,
  weeklyGoalTarget: 3,
  weeklyRemaining: 2,
  weeklyGoalCompletedNow: false,
  packCount: 1 as const,
};

describe('WorkoutCompletionFeedback', () => {
  it('opens the newly earned pack from the primary action', () => {
    const onOpenPack = vi.fn();
    const onDone = vi.fn();
    render(
      <WorkoutCompletionFeedback
        summary={summary}
        packId="pack-new"
        onOpenPack={onOpenPack}
        onDone={onDone}
      />,
    );

    expect(screen.getByRole('dialog', { name: '오늘 운동 완료!' })).toBeTruthy();
    expect(screen.getByText('00:32:18')).toBeTruthy();
    expect(screen.getByText('+100 XP')).toBeTruthy();
    expect(screen.getByText('1 / 3회')).toBeTruthy();
    expect(screen.getByText('카드팩 +1')).toBeTruthy();
    expect(screen.getByText('이번 주 목표까지 2회 남았어요')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /카드팩 지금 열기/ }));
    expect(onOpenPack).toHaveBeenCalledWith('pack-new');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('keeps the pack unopened and returns home when choosing later', () => {
    const onOpenPack = vi.fn();
    const onDone = vi.fn();
    render(
      <WorkoutCompletionFeedback
        summary={summary}
        packId="pack-new"
        onOpenPack={onOpenPack}
        onDone={onDone}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '나중에 열기' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onOpenPack).not.toHaveBeenCalled();
  });

  it('celebrates a weekly goal completed by this workout', () => {
    render(
      <WorkoutCompletionFeedback
        summary={{
          durationSeconds: 1200,
          xpGain: 250,
          weeklySessions: 3,
          weeklyGoalTarget: 3,
          weeklyRemaining: 0,
          weeklyGoalCompletedNow: true,
          packCount: 1,
        }}
        packId="pack-new"
        onOpenPack={vi.fn()}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByText('이번 주 목표 달성! 보너스 XP까지 획득했어요.')).toBeTruthy();
  });
});
