// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    vi.setSystemTime(new Date('2026-08-18T09:00:00+09:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists the completed elapsed time so the record screen can restore it', async () => {
    const first = renderHook(() => useWorkoutSessionTimer());

    await act(async () => { await first.result.current.start(); });
    expect(first.result.current.status).toBe('running');

    act(() => { vi.advanceTimersByTime(65_000); });
    expect(first.result.current.elapsedSeconds).toBe(65);

    let stoppedSeconds = 0;
    await act(async () => { stoppedSeconds = await first.result.current.stop(); });

    expect(stoppedSeconds).toBe(65);
    expect(first.result.current.status).toBe('idle');
    expect(first.result.current.lastCompletedSeconds).toBe(65);
    expect(localStorage.getItem('workout_session_timer_v1')).toBeNull();
    expect(localStorage.getItem('workout_session_completed_v1')).not.toBeNull();

    first.unmount();
    const restored = renderHook(() => useWorkoutSessionTimer());
    expect(restored.result.current.lastCompletedSeconds).toBe(65);
  });

  it('clears a prior completed session when a new workout starts', async () => {
    const first = renderHook(() => useWorkoutSessionTimer());
    await act(async () => { await first.result.current.start(); });
    act(() => { vi.advanceTimersByTime(30_000); });
    await act(async () => { await first.result.current.stop(); });
    first.unmount();

    const next = renderHook(() => useWorkoutSessionTimer());
    expect(next.result.current.lastCompletedSeconds).toBe(30);

    await act(async () => { await next.result.current.start(); });
    expect(next.result.current.status).toBe('running');
    expect(next.result.current.lastCompletedSeconds).toBe(0);
    expect(localStorage.getItem('workout_session_completed_v1')).toBeNull();
  });

  it('can explicitly discard a completed session', async () => {
    const { result } = renderHook(() => useWorkoutSessionTimer());
    await act(async () => { await result.current.start(); });
    act(() => { vi.advanceTimersByTime(12_000); });
    await act(async () => { await result.current.stop(); });

    act(() => { result.current.discardCompleted(); });

    expect(result.current.lastCompletedSeconds).toBe(0);
    expect(localStorage.getItem('workout_session_completed_v1')).toBeNull();
  });

  it('does not restore a completed session from a previous local day', () => {
    localStorage.setItem('workout_session_completed_v1', JSON.stringify({
      elapsedSeconds: 1800,
      endedAt: new Date('2026-08-17T23:30:00+09:00').getTime(),
    }));

    const { result } = renderHook(() => useWorkoutSessionTimer());

    expect(result.current.lastCompletedSeconds).toBe(0);
    expect(localStorage.getItem('workout_session_completed_v1')).toBeNull();
  });
});
