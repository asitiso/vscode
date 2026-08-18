// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountSaveConflictModal } from './AccountSaveConflictModal';

const game = vi.hoisted(() => ({
  accountConflict: null as any,
  accountSyncStatus: 'linked' as string,
  resolveAccountConflict: vi.fn(),
}));

vi.mock('../store/GameContext', () => ({
  useGame: () => game,
}));

describe('AccountSaveConflictModal', () => {
  beforeEach(() => {
    game.accountConflict = null;
    game.accountSyncStatus = 'linked';
    game.resolveAccountConflict.mockReset();
  });

  it('renders nothing without a conflict', () => {
    const { container } = render(<AccountSaveConflictModal />);
    expect(container.textContent).toBe('');
  });

  it('offers server and device choices during a conflict', () => {
    game.accountConflict = {
      server: { revision: 2 },
      localSavedAt: '2026-08-18T10:00:00.000Z',
    };
    render(<AccountSaveConflictModal />);
    expect(screen.getByText('계정 데이터 사용')).toBeTruthy();
    expect(screen.getByText('이 기기 데이터 사용')).toBeTruthy();
  });

  it('routes choices to the game context', () => {
    game.accountConflict = {
      server: { revision: 2 },
      localSavedAt: '2026-08-18T10:00:00.000Z',
    };
    render(<AccountSaveConflictModal />);
    fireEvent.click(screen.getByText('계정 데이터 사용'));
    fireEvent.click(screen.getByText('이 기기 데이터 사용'));
    expect(game.resolveAccountConflict).toHaveBeenNthCalledWith(1, 'server');
    expect(game.resolveAccountConflict).toHaveBeenNthCalledWith(2, 'device');
  });

  it('disables choices while saving', () => {
    game.accountConflict = {
      server: { revision: 2 },
      localSavedAt: '2026-08-18T10:00:00.000Z',
    };
    game.accountSyncStatus = 'saving';
    render(<AccountSaveConflictModal />);
    expect((screen.getByText('계정 데이터 사용') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('이 기기 데이터 사용') as HTMLButtonElement).disabled).toBe(true);
  });
});
