// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HomeWeeklyGoalControl } from './HomeWeeklyGoalControl';

afterEach(() => cleanup());

describe('HomeWeeklyGoalControl', () => {
  it('shows weekly progress in the HUD and opens the detailed weekly panel', () => {
    let open = false;
    const { rerender } = render(
      <HomeWeeklyGoalControl
        open={open}
        sessionsThisWeek={1}
        goalTarget={3}
        remainingThisWeek={2}
        streak={2}
        onToggle={() => { open = !open; }}
      />,
    );

    expect(screen.getByText('2주 연속')).toBeTruthy();
    expect(screen.getByText('이번 주 1/3회')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '주간 운동 상세 보기' }));

    rerender(
      <HomeWeeklyGoalControl
        open={open}
        sessionsThisWeek={1}
        goalTarget={3}
        remainingThisWeek={2}
        streak={2}
        onToggle={() => { open = !open; }}
      />,
    );

    expect(screen.getByRole('dialog', { name: '이번 주 운동' })).toBeTruthy();
    expect(screen.getByText('1 / 3회')).toBeTruthy();
    expect(screen.getByText('이번 주 목표까지 2회 남았어요')).toBeTruthy();
    expect(screen.getByText('현재 2주 연속 달성 중')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: '이번 주 운동 목표 진행률' }).getAttribute('aria-valuenow')).toBe('1');
  });

  it('shows a completed message when the weekly target is reached', () => {
    render(
      <HomeWeeklyGoalControl
        open
        sessionsThisWeek={3}
        goalTarget={3}
        remainingThisWeek={0}
        streak={4}
        onToggle={() => {}}
      />,
    );

    expect(screen.getByText('이번 주 목표 달성! 🎉')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });
});
