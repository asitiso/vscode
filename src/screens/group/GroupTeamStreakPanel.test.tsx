// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GroupDailyParticipation, GroupMemberSummary } from '../../group/groupTypes';
import { GroupTeamStreakPanel } from './GroupTeamStreakPanel';

function day(date: string, participantCount: number): GroupDailyParticipation {
  return { date, participantCount };
}

function member(overrides: Partial<GroupMemberSummary> & Pick<GroupMemberSummary, 'userId' | 'nickname'>): GroupMemberSummary {
  return {
    todaySeconds: 0,
    weeklySeconds: 0,
    weeklyGoalPercent: 0,
    isActive: false,
    ...overrides,
  };
}

describe('GroupTeamStreakPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 21, 12, 0, 0));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows the seven-day heatmap, current streak, and the next member needed today', () => {
    render(<GroupTeamStreakPanel
      memberCount={5}
      dailyParticipation={[
        day('2026-08-17', 1),
        day('2026-08-18', 1),
        day('2026-08-19', 4),
        day('2026-08-20', 3),
        day('2026-08-21', 2),
      ]}
    />);

    expect(screen.getByText('🔥 팀 스트릭')).toBeInTheDocument();
    expect(screen.getByText('2일 연속')).toBeInTheDocument();
    expect(screen.getByText('하루 3명 참여 시 성공')).toBeInTheDocument();
    expect(screen.getByText('오늘 1명 더 운동하면 스트릭 유지!')).toBeInTheDocument();
    expect(screen.getByText('4/5')).toBeInTheDocument();
    expect(screen.getByText('3/5')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
    for (const label of ['월', '화', '수', '목', '금', '토', '일']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('shows rescue candidates while today is incomplete and opens the selected member', () => {
    const onSelectMember = vi.fn();
    const candidates = [
      member({ userId: 'me', nickname: '나' }),
      member({ userId: '1', nickname: '가영' }),
      member({ userId: '2', nickname: '나래' }),
      member({ userId: '3', nickname: '민서' }),
      member({ userId: '4', nickname: '윤희' }),
    ];

    render(<GroupTeamStreakPanel
      memberCount={5}
      dailyParticipation={[day('2026-08-21', 2)]}
      members={candidates}
      currentUserId="me"
      onSelectMember={onSelectMember}
    />);

    expect(screen.getByText('🚑 스트릭 구조대')).toBeInTheDocument();
    expect(screen.getByText('멤버를 눌러 익명 응원을 보내보세요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '가영' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '나래' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '민서' })).toBeInTheDocument();
    expect(screen.getByText('+1명')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '나래' }));
    expect(onSelectMember).toHaveBeenCalledWith(candidates[2]);
  });

  it('hides the rescue area when today is already complete', () => {
    render(<GroupTeamStreakPanel
      memberCount={4}
      dailyParticipation={[
        day('2026-08-19', 2),
        day('2026-08-20', 3),
        day('2026-08-21', 2),
      ]}
      members={[
        member({ userId: 'me', nickname: '나' }),
        member({ userId: '1', nickname: '가영' }),
      ]}
      currentUserId="me"
      onSelectMember={() => undefined}
    />);

    expect(screen.getByText('3일 연속')).toBeInTheDocument();
    expect(screen.getByText('오늘도 팀 스트릭 성공!')).toBeInTheDocument();
    expect(screen.queryByText('🚑 스트릭 구조대')).not.toBeInTheDocument();
  });
});
