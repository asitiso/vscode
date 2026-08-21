// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupInviteActions } from './GroupInviteActions';

function setNavigator(overrides: { writeText?: ReturnType<typeof vi.fn>; share?: ReturnType<typeof vi.fn> }) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: overrides.writeText ? { writeText: overrides.writeText } : undefined,
  });
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: overrides.share,
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setNavigator({});
});

describe('GroupInviteActions', () => {
  it('copies only the invite code and shows success feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({ writeText });

    render(<GroupInviteActions groupName="아침 운동단" inviteCode="ABC123" />);
    fireEvent.click(screen.getByRole('button', { name: '코드 복사' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('ABC123'));
    expect(screen.getByText('복사됨 ✓')).toBeInTheDocument();
  });

  it('opens the native share sheet with the group name and invite code when supported', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator({ writeText, share });

    render(<GroupInviteActions groupName="아침 운동단" inviteCode="ABC123" />);
    fireEvent.click(screen.getByRole('button', { name: '친구에게 공유' }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      text: '운동 그룹 "아침 운동단"에 함께해요!\n초대코드: ABC123',
    }));
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the full invite message when native sharing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({ writeText });

    render(<GroupInviteActions groupName="아침 운동단" inviteCode="ABC123" />);
    fireEvent.click(screen.getByRole('button', { name: '친구에게 공유' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(
      '운동 그룹 "아침 운동단"에 함께해요!\n초대코드: ABC123',
    ));
    expect(screen.getByText('초대문구 복사됨 ✓')).toBeInTheDocument();
  });

  it('does not show an error when the user cancels the native share sheet', async () => {
    const cancelled = new DOMException('Share canceled', 'AbortError');
    const share = vi.fn().mockRejectedValue(cancelled);
    setNavigator({ share });

    render(<GroupInviteActions groupName="아침 운동단" inviteCode="ABC123" />);
    fireEvent.click(screen.getByRole('button', { name: '친구에게 공유' }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
