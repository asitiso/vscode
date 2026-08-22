// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupListScreen } from './GroupListScreen';

const joinGroup = vi.fn();
const loadMyGroups = vi.fn().mockResolvedValue([]);

vi.mock('../../group/groupApi', () => ({
  createGroup: vi.fn(),
  joinGroup: (...args: unknown[]) => joinGroup(...args),
  loadMyGroups: (...args: unknown[]) => loadMyGroups(...args),
}));

function openJoinForm() {
  fireEvent.click(screen.getByRole('button', { name: '코드로 참가' }));
  return screen.getByPlaceholderText('6자리 초대코드');
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  cleanup();
  joinGroup.mockReset();
  loadMyGroups.mockReset();
  loadMyGroups.mockResolvedValue([]);
});

describe('GroupListScreen join submission', () => {
  it('submits a valid invite code with Enter', async () => {
    joinGroup.mockResolvedValue('group-enter');
    const onSelectGroup = vi.fn();
    render(<GroupListScreen onSelectGroup={onSelectGroup} />);

    const input = openJoinForm();
    fireEvent.change(input, { target: { value: 'abc123' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(joinGroup).toHaveBeenCalledTimes(1));
    expect(joinGroup).toHaveBeenCalledWith('ABC123');
    await waitFor(() => expect(onSelectGroup).toHaveBeenCalledWith('group-enter'));
  });

  it('locks join controls and prevents duplicate submissions while the request is pending', async () => {
    const pending = deferred<string>();
    joinGroup.mockReturnValue(pending.promise);
    render(<GroupListScreen onSelectGroup={vi.fn()} />);

    const input = openJoinForm();
    fireEvent.change(input, { target: { value: 'ABC123' } });
    const pasteButton = screen.getByRole('button', { name: '붙여넣기' });
    const joinButton = screen.getByRole('button', { name: '참가' });

    fireEvent.click(joinButton);
    fireEvent.click(joinButton);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(joinGroup).toHaveBeenCalledTimes(1);
    expect(input).toBeDisabled();
    expect(pasteButton).toBeDisabled();
    expect(screen.getByRole('button', { name: '참가 중…' })).toBeDisabled();

    pending.resolve('group-pending');
    await waitFor(() => expect(loadMyGroups).toHaveBeenCalled());
  });

  it('keeps the invite code and re-enables controls after a failed join', async () => {
    joinGroup.mockRejectedValue(new Error('INVALID_INVITE_CODE'));
    render(<GroupListScreen onSelectGroup={vi.fn()} />);

    const input = openJoinForm();
    fireEvent.change(input, { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByRole('button', { name: '참가' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('초대코드를 다시 확인해 주세요.');
    expect(input).toHaveValue('ABC123');
    expect(input).toBeEnabled();
    expect(screen.getByRole('button', { name: '붙여넣기' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '참가' })).toBeEnabled();
  });

  it('keeps the existing successful join navigation behavior', async () => {
    joinGroup.mockResolvedValue('group-success');
    const onSelectGroup = vi.fn();
    render(<GroupListScreen onSelectGroup={onSelectGroup} />);

    const input = openJoinForm();
    fireEvent.change(input, { target: { value: 'ZXCV12' } });
    fireEvent.click(screen.getByRole('button', { name: '참가' }));

    await waitFor(() => expect(loadMyGroups).toHaveBeenCalled());
    await waitFor(() => expect(onSelectGroup).toHaveBeenCalledWith('group-success'));
    expect(joinGroup).toHaveBeenCalledWith('ZXCV12');
  });
});
