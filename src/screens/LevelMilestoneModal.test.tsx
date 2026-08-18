/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LevelMilestoneModal } from './LevelMilestoneModal';

afterEach(() => cleanup());

describe('LevelMilestoneModal', () => {
  it('renders an accessible reward dialog and claims once per click', async () => {
    const user = userEvent.setup();
    const onClaim = vi.fn();
    render(
      <LevelMilestoneModal
        level={10}
        claimed={false}
        characterName="헬스 초보"
        onClaim={onClaim}
        onOpenPack={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('🎉 Lv.10 달성!')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '보상 받기' }));
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it('opens the granted pack after claiming', async () => {
    const user = userEvent.setup();
    const onOpenPack = vi.fn();
    render(
      <LevelMilestoneModal
        level={20}
        claimed
        onClaim={vi.fn()}
        onOpenPack={onOpenPack}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '특별 카드팩 열기' }));
    expect(onOpenPack).toHaveBeenCalledTimes(1);
  });

  it('closes with Escape and restores body scrolling', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { unmount } = render(
      <LevelMilestoneModal
        level={30}
        claimed={false}
        onClaim={vi.fn()}
        onOpenPack={vi.fn()}
        onClose={onClose}
      />,
    );

    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
