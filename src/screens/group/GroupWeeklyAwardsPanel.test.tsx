// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { GroupMemberSummary } from '../../group/groupTypes';
import { GroupWeeklyAwardsPanel } from './GroupWeeklyAwardsPanel';

function member(
  userId: string,
  nickname: string,
  todaySeconds: number,
  weeklySeconds: number,
  weeklyGoalPercent: number,
): GroupMemberSummary {
  return { userId, nickname, todaySeconds, weeklySeconds, weeklyGoalPercent, isActive: false };
}

afterEach(cleanup);

describe('GroupWeeklyAwardsPanel', () => {
  it('서로 다른 멤버의 주간 칭호와 근거 수치를 보여준다', () => {
    render(<GroupWeeklyAwardsPanel members={[
      member('a', '민수', 3600, 9000, 100),
      member('b', '혜미', 2400, 7200, 100),
      member('c', '유나', 1800, 5400, 80),
    ]} />);

    expect(screen.getByText('🏅 이번 주 팀 시상식')).toBeInTheDocument();
    expect(screen.getByText('🔥 오늘의 불꽃')).toBeInTheDocument();
    expect(screen.getByText('민수')).toBeInTheDocument();
    expect(screen.getByText('오늘 1시간 0분')).toBeInTheDocument();
    expect(screen.getByText('🎯 목표 사냥꾼')).toBeInTheDocument();
    expect(screen.getByText('혜미')).toBeInTheDocument();
    expect(screen.getByText('목표 100%')).toBeInTheDocument();
    expect(screen.getByText('🤝 숨은 영웅')).toBeInTheDocument();
    expect(screen.getByText('유나')).toBeInTheDocument();
    expect(screen.getByText('기여도 5점')).toBeInTheDocument();
  });

  it('수상자가 하나도 없으면 시상식 패널을 렌더링하지 않는다', () => {
    const { container } = render(<GroupWeeklyAwardsPanel members={[
      member('a', '민수', 0, 0, 0),
      member('b', '혜미', 0, 0, 0),
    ]} />);

    expect(screen.queryByText('🏅 이번 주 팀 시상식')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
