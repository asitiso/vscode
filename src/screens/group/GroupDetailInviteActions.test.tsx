// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadGroupDetail: vi.fn(),
}));

vi.mock('../../group/groupApi', () => ({
  loadGroupDetail: mocks.loadGroupDetail,
  leaveGroup: vi.fn(),
  removeGroupMember: vi.fn(),
}));

vi.mock('../../group/GroupAuthContext', () => ({
  useGroupAuth: () => ({ user: { id: 'me' } }),
}));

vi.mock('./GroupCoopQuestPanel', () => ({ GroupCoopQuestPanel: () => null }));
vi.mock('./GroupTeamStreakPanel', () => ({ GroupTeamStreakPanel: () => null }));
vi.mock('./GroupWeeklyAwardsPanel', () => ({ GroupWeeklyAwardsPanel: () => null }));
vi.mock('./GroupMotivationPanel', () => ({ GroupMotivationPanel: () => null }));
vi.mock('./GroupMemberDetailModal', () => ({ GroupMemberDetailModal: () => null }));

import { GroupDetailScreen } from './GroupDetailScreen';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('GroupDetailScreen invite actions', () => {
  it('renders copy and share actions beside an available invite code', async () => {
    mocks.loadGroupDetail.mockResolvedValue({
      id: 'group-1',
      name: '아침 운동단',
      ownerId: 'me',
      memberCount: 1,
      weeklySeconds: 0,
      inviteCode: 'ABC123',
      members: [{
        userId: 'me',
        nickname: '나',
        todaySeconds: 0,
        weeklySeconds: 0,
        weeklyGoalPercent: 0,
        isActive: false,
        isOwner: true,
      }],
      dailyParticipation: [],
    });

    render(<GroupDetailScreen groupId="group-1" onBack={() => undefined} />);

    expect(await screen.findByText('ABC123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '코드 복사' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '친구에게 공유' })).toBeInTheDocument();
  });
});
