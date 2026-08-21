// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupListScreen } from './GroupListScreen';

const joinGroup = vi.fn();

vi.mock('../../group/groupApi', () => ({
  createGroup: vi.fn(),
  joinGroup: (...args: unknown[]) => joinGroup(...args),
  loadMyGroups: vi.fn().mockResolvedValue([]),
}));

function setClipboard(text: string) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { readText: vi.fn().mockResolvedValue(text) },
  });
}

afterEach(() => {
  cleanup();
  joinGroup.mockReset();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
});

describe('GroupListScreen invite paste', () => {
  it('fills the invite code from a shared clipboard message without joining automatically', async () => {
    setClipboard('운동 그룹 "아침 운동단"에 함께해요!\n초대코드: ABC123');
    render(<GroupListScreen onSelectGroup={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '코드로 참가' }));
    fireEvent.click(screen.getByRole('button', { name: '붙여넣기' }));

    const input = screen.getByPlaceholderText('6자리 초대코드');
    await waitFor(() => expect(input).toHaveValue('ABC123'));
    expect(screen.getByRole('button', { name: '참가' })).toBeEnabled();
    expect(joinGroup).not.toHaveBeenCalled();
  });

  it('extracts the invite code when the full shared message is pasted directly into the input', () => {
    render(<GroupListScreen onSelectGroup={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '코드로 참가' }));

    const input = screen.getByPlaceholderText('6자리 초대코드');
    fireEvent.paste(input, {
      clipboardData: {
        getData: () => '운동 그룹 "RUN CREW"에 함께해요!\n초대코드: xy9z12',
      },
    });

    expect(input).toHaveValue('XY9Z12');
  });

  it('shows guidance when clipboard text has no supported invite code', async () => {
    setClipboard('오늘도 같이 운동하자!');
    render(<GroupListScreen onSelectGroup={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '코드로 참가' }));
    fireEvent.click(screen.getByRole('button', { name: '붙여넣기' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('초대코드를 찾지 못했어요.');
    expect(joinGroup).not.toHaveBeenCalled();
  });
});
