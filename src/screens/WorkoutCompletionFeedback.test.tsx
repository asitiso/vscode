// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkoutCompletionFeedback } from './WorkoutCompletionFeedback';

afterEach(() => cleanup());

const summary = {
  durationSeconds: 1938,
  xpGain: 100,
  personalBests: [],
  personalBestBonusXp: 0 as const,
  weeklySessions: 1,
  weeklyGoalTarget: 3,
  weeklyRemaining: 2,
  weeklyGoalCompletedNow: false,
  packCount: 1,
  weeklyRewardPackCount: 0 as const,
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

  it('shows a prominent NEW RECORD block and the 50 XP bonus for an automatic personal best', () => {
    render(
      <WorkoutCompletionFeedback
        summary={{
          ...summary,
          xpGain: 150,
          personalBestBonusXp: 50,
          personalBests: [{
            exerciseId: 'leg-press',
            exerciseName: '레그 프레스',
            metric: 'weight',
            previousValue: 60,
            value: 65,
          }],
        }}
        packId="pack-new"
        onOpenPack={vi.fn()}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByText('NEW RECORD')).toBeTruthy();
    expect(screen.getByText('레그 프레스 65kg')).toBeTruthy();
    expect(screen.getByText('이전 최고 60kg')).toBeTruthy();
    expect(screen.getByText('신기록 보너스 +50 XP')).toBeTruthy();
  });

  it('celebrates a weekly goal with bonus XP and a dedicated reward pack', () => {
    render(
      <WorkoutCompletionFeedback
        summary={{
          durationSeconds: 1200,
          xpGain: 250,
          personalBests: [],
          personalBestBonusXp: 0,
          weeklySessions: 3,
          weeklyGoalTarget: 3,
          weeklyRemaining: 0,
          weeklyGoalCompletedNow: true,
          packCount: 2,
          weeklyRewardPackCount: 1,
        }}
        packId="weekly-pack-new"
        onOpenPack={vi.fn()}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByText('주간 목표 달성팩 +1')).toBeTruthy();
    expect(screen.getByText('이번 주 목표 달성! 보너스 XP와 특별팩을 획득했어요.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /주간 목표팩 지금 열기/ })).toBeTruthy();
  });
});
