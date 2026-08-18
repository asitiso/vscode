// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkoutSessionTimer } from './useWorkoutSessionTimer';

vi.mock('../group/GroupAuthContext', () => ({ useGroupAuth: () => ({ user: null }) }));
vi.mock('../group/workoutSessionApi', () => ({
  startRemoteWorkoutSession: vi.fn(),
  heartbeatRemoteWorkoutSession: vi.fn(),
  endRemoteWorkoutSession: vi.fn(),
}));

describe('useWorkoutSessionTimer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-18T00:00:00Z'));
  });

  it('runs locally without requiring login', async () => {
    const { result } = renderHook(() => useWorkoutSessionTimer());
    await act(async () => { await result.current.start(); });
    expect(result.current.status).toBe('running');
    act(() => { vi.advanceTimersByTime(65_000); });
    expect(result.current.elapsedSeconds).toBe(65);
    await act(async () => { await result.current.stop(); });
    expect(result.current.status).toBe('idle');
    expect(localStorage.getItem('workout_session_timer_v1')).toBeNull();
  });
});
