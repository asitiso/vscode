// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GroupMotivationPanel } from './GroupMotivationPanel';
import type { GroupMemberSummary } from '../../group/groupTypes';

const members: GroupMemberSummary[] = [
  { userId: 'a', nickname: '민서', todaySeconds: 4200, weeklySeconds: 9000, weeklyGoalPercent: 80, isActive: true },
  { userId: 'me', nickname: '나', todaySeconds: 1800, weeklySeconds: 7200, weeklyGoalPercent: 60, isActive: true },
  { userId: 'b', nickname: '혜미', todaySeconds: 3000, weeklySeconds: 10800, weeklyGoalPercent: 90, isActive: false },
];

describe('GroupMotivationPanel', () => {
  it('지금 운동 중 인원, 오늘 순위, 내 추격 정보를 보여준다', () => {
    render(<GroupMotivationPanel members={members} currentUserId="me" onSelectMember={vi.fn()} />);

    expect(screen.getByText('지금 2명 운동 중')).toBeInTheDocument();
    expect(screen.getByText('오늘 총 2시간 30분')).toBeInTheDocument();
    expect(screen.getByText('내 순위 3위')).toBeInTheDocument();
    expect(screen.getByText('혜미님까지 20분')).toBeInTheDocument();
    expect(screen.getAllByText(/운동 중/).length).toBeGreaterThan(1);
  });

  it('이번 주 탭으로 바꾸면 주간 기준 순위와 목표 달성률을 보여준다', () => {
    render(<GroupMotivationPanel members={members} currentUserId="me" onSelectMember={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '이번 주 순위' }));

    expect(screen.getByText('이번 주 총 7시간 30분')).toBeInTheDocument();
    expect(screen.getByText('민서님까지 목표 20%p')).toBeInTheDocument();
    expect(screen.getAllByText('주간 목표 90%').length).toBeGreaterThan(0);
  });
});
