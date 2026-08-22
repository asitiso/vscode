// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GroupListScreen } from './GroupListScreen';

const createGroup = vi.fn();
const joinGroup = vi.fn();
const loadMyGroups = vi.fn().mockResolvedValue([]);

vi.mock('../../group/groupApi', () => ({
  createGroup: (...args: unknown[]) => createGroup(...args),
  joinGroup: (...args: unknown[]) => joinGroup(...args),
  loadMyGroups: (...args: unknown[]) => loadMyGroups(...args),
}));

function renderScreen() {
  render(<GroupListScreen onSelectGroup={vi.fn()} />);
}

function openCreateForm() {
  fireEvent.click(screen.getByRole('button', { name: '+ 그룹 만들기' }));
  return screen.getByPlaceholderText('그룹 이름');
}

function openJoinForm() {
  fireEvent.click(screen.getByRole('button', { name: '코드로 참가' }));
  return screen.getByPlaceholderText('6자리 초대코드');
}

afterEach(() => {
  cleanup();
  createGroup.mockReset();
  joinGroup.mockReset();
  loadMyGroups.mockReset();
  loadMyGroups.mockResolvedValue([]);
});

describe('GroupListScreen form state isolation', () => {
  it('keeps a group-list loading error visible while switching forms', async () => {
    loadMyGroups.mockRejectedValueOnce(new Error('NETWORK'));
    renderScreen();

    expect(await screen.findByRole('alert')).toHaveTextContent('그룹 목록을 불러오지 못했습니다.');
    openCreateForm();
    expect(screen.getByRole('alert')).toHaveTextContent('그룹 목록을 불러오지 못했습니다.');
    openJoinForm();
    expect(screen.getByRole('alert')).toHaveTextContent('그룹 목록을 불러오지 못했습니다.');
  });

  it('clears a join action error when switching to the create form', async () => {
    joinGroup.mockRejectedValue(new Error('INVALID_INVITE_CODE'));
    renderScreen();

    const input = openJoinForm();
    fireEvent.change(input, { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByRole('button', { name: '참가' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('초대코드를 다시 확인해 주세요.');

    fireEvent.click(screen.getByRole('button', { name: '+ 그룹 만들기' }));
    expect(screen.queryByText('초대코드를 다시 확인해 주세요.')).not.toBeInTheDocument();
  });

  it('clears a create action error when switching to the join form', async () => {
    createGroup.mockRejectedValue(new Error('INVALID_GROUP_NAME'));
    renderScreen();

    const input = openCreateForm();
    fireEvent.change(input, { target: { value: '운동친구' } });
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('그룹 이름은 2~30자로 입력해 주세요.');

    fireEvent.click(screen.getByRole('button', { name: '코드로 참가' }));
    expect(screen.queryByText('그룹 이름은 2~30자로 입력해 주세요.')).not.toBeInTheDocument();
  });

  it('clears a join action error when the invite code changes', async () => {
    joinGroup.mockRejectedValue(new Error('INVALID_INVITE_CODE'));
    renderScreen();

    const input = openJoinForm();
    fireEvent.change(input, { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByRole('button', { name: '참가' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('초대코드를 다시 확인해 주세요.');

    fireEvent.change(input, { target: { value: 'XYZ789' } });
    expect(screen.queryByText('초대코드를 다시 확인해 주세요.')).not.toBeInTheDocument();
  });

  it('clears a create action error when the group name changes', async () => {
    createGroup.mockRejectedValue(new Error('INVALID_GROUP_NAME'));
    renderScreen();

    const input = openCreateForm();
    fireEvent.change(input, { target: { value: '운동친구' } });
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('그룹 이름은 2~30자로 입력해 주세요.');

    fireEvent.change(input, { target: { value: '운동친구들' } });
    expect(screen.queryByText('그룹 이름은 2~30자로 입력해 주세요.')).not.toBeInTheDocument();
  });

  it('does not restore a stale invite parsing error after leaving and reopening the join form', async () => {
    renderScreen();

    const input = openJoinForm();
    fireEvent.paste(input, { clipboardData: { getData: () => '초대코드가 없는 긴 문장입니다' } });
    expect(screen.getByRole('alert')).toHaveTextContent('초대코드를 찾지 못했어요.');

    fireEvent.click(screen.getByRole('button', { name: '+ 그룹 만들기' }));
    fireEvent.click(screen.getByRole('button', { name: '코드로 참가' }));
    expect(screen.queryByText('초대코드를 찾지 못했어요.')).not.toBeInTheDocument();
  });

  it('preserves create and join drafts while switching between forms', async () => {
    renderScreen();

    const nameInput = openCreateForm();
    fireEvent.change(nameInput, { target: { value: '저녁운동단' } });

    const codeInput = openJoinForm();
    fireEvent.change(codeInput, { target: { value: 'ABC123' } });

    fireEvent.click(screen.getByRole('button', { name: '+ 그룹 만들기' }));
    expect(screen.getByPlaceholderText('그룹 이름')).toHaveValue('저녁운동단');

    fireEvent.click(screen.getByRole('button', { name: '코드로 참가' }));
    expect(screen.getByPlaceholderText('6자리 초대코드')).toHaveValue('ABC123');

    await waitFor(() => expect(loadMyGroups).toHaveBeenCalled());
  });
});
