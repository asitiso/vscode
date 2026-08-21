// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GroupDailyParticipation } from '../../group/groupTypes';
import { GroupTeamStreakPanel } from './GroupTeamStreakPanel';

function day(date: string, participantCount: number): GroupDailyParticipation {
  return { date, participantCount };
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

  it('celebrates today when the target is already complete', () => {
    render(<GroupTeamStreakPanel
      memberCount={4}
      dailyParticipation={[
        day('2026-08-19', 2),
        day('2026-08-20', 3),
        day('2026-08-21', 2),
      ]}
    />);

    expect(screen.getByText('3일 연속')).toBeInTheDocument();
    expect(screen.getByText('오늘도 팀 스트릭 성공!')).toBeInTheDocument();
  });
});
