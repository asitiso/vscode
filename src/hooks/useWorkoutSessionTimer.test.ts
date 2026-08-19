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

  it('keeps elapsed wall-clock time across a refresh/remount', async () => {
    const startAt = new Date('2026-08-18T09:00:00+09:00').getTime();
    const first = renderHook(() => useWorkoutSessionTimer());
    await act(async () => { await first.result.current.start(); });
    first.unmount();

    vi.setSystemTime(startAt + 95_000);
    const restored = renderHook(() => useWorkoutSessionTimer());

    expect(restored.result.current.status).toBe('running');
    expect(restored.result.current.elapsedSeconds).toBe(95);
  });

  it('keeps the same running session across repeated home and record screen remounts', async () => {
    const startAt = new Date('2026-08-18T09:00:00+09:00').getTime();
    const home = renderHook(() => useWorkoutSessionTimer());
    await act(async () => { await home.result.current.start(); });
    home.unmount();

    vi.setSystemTime(startAt + 40_000);
    const record = renderHook(() => useWorkoutSessionTimer());
    expect(record.result.current.status).toBe('running');
    expect(record.result.current.elapsedSeconds).toBe(40);
    record.unmount();

    vi.setSystemTime(startAt + 75_000);
    const homeAgain = renderHook(() => useWorkoutSessionTimer());
    expect(homeAgain.result.current.status).toBe('running');
    expect(homeAgain.result.current.elapsedSeconds).toBe(75);

    const stored = JSON.parse(localStorage.getItem('workout_session_timer_v1') ?? '{}') as { startedAt?: number };
    expect(stored.startedAt).toBe(startAt);
  });

  it('uses wall-clock time after a background gap instead of resetting or double-counting', async () => {
    const startAt = new Date('2026-08-18T09:00:00+09:00').getTime();
    const { result } = renderHook(() => useWorkoutSessionTimer());
    await act(async () => { await result.current.start(); });

    vi.setSystemTime(startAt + 10 * 60_000);
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(result.current.elapsedSeconds).toBe(601);

    let stoppedSeconds = 0;
    await act(async () => { stoppedSeconds = await result.current.stop(); });
    expect(stoppedSeconds).toBe(601);
  });

  it('serializes rapid duplicate starts so the original start time is never overwritten', async () => {
    const startAt = new Date('2026-08-18T09:00:00+09:00').getTime();
    const { result } = renderHook(() => useWorkoutSessionTimer());

    await act(async () => {
      const first = result.current.start();
      vi.setSystemTime(startAt + 5_000);
      const second = result.current.start();
      await Promise.all([first, second]);
    });

    const stored = JSON.parse(localStorage.getItem('workout_session_timer_v1') ?? '{}') as { startedAt?: number };
    expect(stored.startedAt).toBe(startAt);
  });

  it('serializes rapid duplicate stops so both callers receive the same elapsed time', async () => {
    const startAt = new Date('2026-08-18T09:00:00+09:00').getTime();
    const { result } = renderHook(() => useWorkoutSessionTimer());
    await act(async () => { await result.current.start(); });
    vi.setSystemTime(startAt + 10_000);

    let firstSeconds = -1;
    let secondSeconds = -1;
    await act(async () => {
      const first = result.current.stop();
      vi.setSystemTime(startAt + 15_000);
      const second = result.current.stop();
      [firstSeconds, secondSeconds] = await Promise.all([first, second]);
    });

    expect(firstSeconds).toBe(10);
    expect(secondSeconds).toBe(10);
    expect(result.current.lastCompletedSeconds).toBe(10);
  });

  it('keeps a session duration correct when the workout crosses local midnight', async () => {
    vi.setSystemTime(new Date('2026-08-18T23:59:50+09:00'));
    const { result } = renderHook(() => useWorkoutSessionTimer());
    await act(async () => { await result.current.start(); });
    vi.setSystemTime(new Date('2026-08-19T00:00:10+09:00'));

    let stoppedSeconds = 0;
    await act(async () => { stoppedSeconds = await result.current.stop(); });

    expect(stoppedSeconds).toBe(20);
  });
});
