// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { GroupMemberSummary } from '../../group/groupTypes';
import { GroupCoopQuestPanel } from './GroupCoopQuestPanel';

function member(userId: string, nickname: string, weeklySeconds: number, weeklyGoalPercent: number): GroupMemberSummary {
  return { userId, nickname, todaySeconds: 0, weeklySeconds, weeklyGoalPercent, isActive: false };
}

afterEach(cleanup);

describe('GroupCoopQuestPanel', () => {
  it('세 공동 미션과 진행 수치를 보여준다', () => {
    render(<GroupCoopQuestPanel members={[
      member('a', '민수', 3600, 100),
      member('b', '지수', 1800, 40),
      member('c', '유나', 0, 0),
      member('d', '준호', 0, 0),
    ]} />);
    expect(screen.getByText('👟 모두의 출석')).toBeInTheDocument();
    expect(screen.getByText('2 / 3명')).toBeInTheDocument();
    expect(screen.getByText('⏱️ 함께 채운 시간')).toBeInTheDocument();
    expect(screen.getByText('90 / 240분')).toBeInTheDocument();
    expect(screen.getByText('🎯 각자의 목표, 하나의 팀')).toBeInTheDocument();
    expect(screen.getByText('1 / 2명')).toBeInTheDocument();
  });

  it('세 미션이 모두 완료되면 COMPLETE 문구를 보여준다', () => {
    render(<GroupCoopQuestPanel members={[
      member('a', '민수', 7200, 100),
      member('b', '지수', 7200, 100),
    ]} />);
    expect(screen.getByText('🏆 이번 주 우리 그룹 미션 COMPLETE!')).toBeInTheDocument();
  });

  it('이번 주 MVP와 기여 점수를 보여준다', () => {
    render(<GroupCoopQuestPanel members={[
      member('a', '민수', 9000, 100),
      member('b', '지수', 1800, 50),
    ]} />);
    expect(screen.getByText('🔥 이번 주 MVP')).toBeInTheDocument();
    expect(screen.getByText('민수')).toBeInTheDocument();
    expect(screen.getByText('기여도 8점')).toBeInTheDocument();
  });

  it('기여자가 없으면 첫 기여 대기 문구를 보여준다', () => {
    render(<GroupCoopQuestPanel members={[member('a', '민수', 0, 0)]} />);
    expect(screen.getByText('이번 주 첫 기여자를 기다리고 있어요')).toBeInTheDocument();
  });
});
