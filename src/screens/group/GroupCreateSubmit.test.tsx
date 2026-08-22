// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupListScreen } from './GroupListScreen';

const createGroup = vi.fn();
const loadMyGroups = vi.fn().mockResolvedValue([]);

vi.mock('../../group/groupApi', () => ({
  createGroup: (...args: unknown[]) => createGroup(...args),
  joinGroup: vi.fn(),
  loadMyGroups: (...args: unknown[]) => loadMyGroups(...args),
}));

function openCreateForm() {
  fireEvent.click(screen.getByRole('button', { name: '+ 그룹 만들기' }));
  return screen.getByPlaceholderText('그룹 이름');
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
  createGroup.mockReset();
  loadMyGroups.mockReset();
  loadMyGroups.mockResolvedValue([]);
});

describe('GroupListScreen create submission', () => {
  it('creates a valid group with Enter', async () => {
    createGroup.mockResolvedValue({ groupId: 'group-enter', inviteCode: 'ABC123' });
    const onSelectGroup = vi.fn();
    render(<GroupListScreen onSelectGroup={onSelectGroup} />);

    const input = openCreateForm();
    fireEvent.change(input, { target: { value: '운동친구' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(createGroup).toHaveBeenCalledTimes(1));
    expect(createGroup).toHaveBeenCalledWith('운동친구');
    await waitFor(() => expect(onSelectGroup).toHaveBeenCalledWith('group-enter'));
  });

  it('locks create controls and prevents duplicate submissions while the request is pending', async () => {
    const pending = deferred<{ groupId: string; inviteCode: string }>();
    createGroup.mockReturnValue(pending.promise);
    render(<GroupListScreen onSelectGroup={vi.fn()} />);

    const input = openCreateForm();
    fireEvent.change(input, { target: { value: '운동친구' } });
    const createButton = screen.getByRole('button', { name: '만들기' });

    fireEvent.click(createButton);
    fireEvent.click(createButton);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(createGroup).toHaveBeenCalledTimes(1);
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: '만드는 중…' })).toBeDisabled();

    pending.resolve({ groupId: 'group-pending', inviteCode: 'ZXCV12' });
    await waitFor(() => expect(loadMyGroups).toHaveBeenCalled());
  });

  it('keeps the group name and re-enables controls after a failed create', async () => {
    createGroup.mockRejectedValue(new Error('INVALID_GROUP_NAME'));
    render(<GroupListScreen onSelectGroup={vi.fn()} />);

    const input = openCreateForm();
    fireEvent.change(input, { target: { value: '운동친구' } });
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('그룹 이름은 2~30자로 입력해 주세요.');
    expect(input).toHaveValue('운동친구');
    expect(input).toBeEnabled();
    expect(screen.getByRole('button', { name: '만들기' })).toBeEnabled();
  });

  it('keeps the existing successful create navigation behavior', async () => {
    createGroup.mockResolvedValue({ groupId: 'group-success', inviteCode: 'QWER12' });
    const onSelectGroup = vi.fn();
    render(<GroupListScreen onSelectGroup={onSelectGroup} />);

    const input = openCreateForm();
    fireEvent.change(input, { target: { value: '아침운동' } });
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));

    await waitFor(() => expect(loadMyGroups).toHaveBeenCalled());
    await waitFor(() => expect(onSelectGroup).toHaveBeenCalledWith('group-success'));
    expect(createGroup).toHaveBeenCalledWith('아침운동');
  });
});
