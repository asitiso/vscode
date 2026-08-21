// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GroupMemberSummary } from '../../group/groupTypes';
import { loadGroupDailyCheerSummary, sendGroupDailyCheer } from '../../group/groupApi';
import { GroupMemberDetailModal } from './GroupMemberDetailModal';

vi.mock('../../group/groupApi', () => ({
  loadGroupDailyCheerSummary: vi.fn(),
  sendGroupDailyCheer: vi.fn(),
}));

const member: GroupMemberSummary = {
  userId: 'u2',
  nickname: '혜미',
  todaySeconds: 3120,
  weeklySeconds: 7200,
  weeklyGoalPercent: 110,
  isActive: false,
};

describe('GroupMemberDetailModal daily cheers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows anonymous counts and three cheer buttons for another member', async () => {
    vi.mocked(loadGroupDailyCheerSummary).mockResolvedValue({
      fire: 2,
      clap: 1,
      together: 3,
      mySelection: 'clap',
    });

    render(<GroupMemberDetailModal member={member} groupId="g1" currentUserId="u1" onClose={() => undefined} />);

    expect(await screen.findByText('오늘 받은 응원')).toBeTruthy();
    expect(screen.getByText('🔥 2')).toBeTruthy();
    expect(screen.getByText('👏 1')).toBeTruthy();
    expect(screen.getByText('💪 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: '🔥 불붙여!' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: '👏 잘한다!' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '💪 같이가자!' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('shows received counts but hides send controls on the current users own modal', async () => {
    vi.mocked(loadGroupDailyCheerSummary).mockResolvedValue({ fire: 4, clap: 2, together: 1, mySelection: null });

    render(<GroupMemberDetailModal member={member} groupId="g1" currentUserId="u2" onClose={() => undefined} />);

    expect(await screen.findByText('오늘 받은 응원')).toBeTruthy();
    expect(screen.queryByText('응원 보내기')).toBeNull();
    expect(screen.queryByRole('button', { name: '🔥 불붙여!' })).toBeNull();
  });

  it('replaces the confirmed selection with the updated server summary after send', async () => {
    vi.mocked(loadGroupDailyCheerSummary).mockResolvedValue({ fire: 1, clap: 0, together: 0, mySelection: 'fire' });
    vi.mocked(sendGroupDailyCheer).mockResolvedValue({ fire: 0, clap: 1, together: 0, mySelection: 'clap' });

    render(<GroupMemberDetailModal member={member} groupId="g1" currentUserId="u1" onClose={() => undefined} />);
    await screen.findByText('🔥 1');

    fireEvent.click(screen.getByRole('button', { name: '👏 잘한다!' }));

    await waitFor(() => expect(screen.getByText('👏 1')).toBeTruthy());
    expect(screen.getByText('🔥 0')).toBeTruthy();
    expect(screen.getByRole('button', { name: '👏 잘한다!' }).getAttribute('aria-pressed')).toBe('true');
    expect(sendGroupDailyCheer).toHaveBeenCalledWith('g1', 'u2', 'clap');
  });

  it('keeps the last confirmed state and shows an inline error when send fails', async () => {
    vi.mocked(loadGroupDailyCheerSummary).mockResolvedValue({ fire: 1, clap: 0, together: 0, mySelection: 'fire' });
    vi.mocked(sendGroupDailyCheer).mockRejectedValue(new Error('network'));

    render(<GroupMemberDetailModal member={member} groupId="g1" currentUserId="u1" onClose={() => undefined} />);
    await screen.findByText('🔥 1');

    fireEvent.click(screen.getByRole('button', { name: '👏 잘한다!' }));

    expect(await screen.findByText('응원을 보내지 못했습니다.')).toBeTruthy();
    expect(screen.getByText('🔥 1')).toBeTruthy();
    expect(screen.getByText('👏 0')).toBeTruthy();
    expect(screen.getByRole('button', { name: '🔥 불붙여!' }).getAttribute('aria-pressed')).toBe('true');
  });
});
