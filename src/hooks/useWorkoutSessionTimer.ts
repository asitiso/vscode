import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGroupAuth } from '../group/GroupAuthContext';
import { endRemoteWorkoutSession, heartbeatRemoteWorkoutSession, startRemoteWorkoutSession } from '../group/workoutSessionApi';

const STORAGE_KEY = 'workout_session_timer_v1';
const COMPLETED_STORAGE_KEY = 'workout_session_completed_v1';
const HEARTBEAT_MS = 60_000;

type StoredTimer = { startedAt: number; remoteSessionId?: string | null };
type StoredCompletedTimer = { elapsedSeconds: number; endedAt: number };

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readStored(): StoredTimer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as StoredTimer;
    return Number.isFinite(value.startedAt) ? value : null;
  } catch { return null; }
}

function readCompleted(): StoredCompletedTimer | null {
  try {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as StoredCompletedTimer;
    const valid = Number.isFinite(value.elapsedSeconds)
      && value.elapsedSeconds >= 0
      && Number.isFinite(value.endedAt);
    if (!valid || dateKey(new Date(value.endedAt)) !== dateKey()) {
      localStorage.removeItem(COMPLETED_STORAGE_KEY);
      return null;
    }
    return value;
  } catch {
    localStorage.removeItem(COMPLETED_STORAGE_KEY);
    return null;
  }
}

export function useWorkoutSessionTimer() {
  const { user } = useGroupAuth();
  const [stored, setStored] = useState<StoredTimer | null>(() => readStored());
  const [completed, setCompleted] = useState<StoredCompletedTimer | null>(() => readCompleted());
  const [now, setNow] = useState(Date.now());
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!stored) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [stored]);

  const persist = useCallback((value: StoredTimer | null) => {
    setStored(value);
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const persistCompleted = useCallback((value: StoredCompletedTimer | null) => {
    setCompleted(value);
    if (value) localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(COMPLETED_STORAGE_KEY);
  }, []);

  const discardCompleted = useCallback(() => {
    persistCompleted(null);
  }, [persistCompleted]);

  const ensureRemote = useCallback(async (current: StoredTimer): Promise<StoredTimer> => {
    if (!user || current.remoteSessionId || syncingRef.current) return current;
    syncingRef.current = true;
    try {
      const remote = await startRemoteWorkoutSession();
      const next = { ...current, remoteSessionId: remote.id };
      persist(next);
      return next;
    } catch { return current; }
    finally { syncingRef.current = false; }
  }, [user, persist]);

  useEffect(() => {
    if (!stored || !user) return;
    void ensureRemote(stored);
  }, [stored?.startedAt, user?.id, ensureRemote]);

  useEffect(() => {
    if (!stored?.remoteSessionId || !user) return;
    const heartbeat = () => { void heartbeatRemoteWorkoutSession(stored.remoteSessionId!).catch(() => undefined); };
    const timer = window.setInterval(heartbeat, HEARTBEAT_MS);
    const visibility = () => { if (document.visibilityState === 'visible') heartbeat(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [stored?.remoteSessionId, user?.id]);

  const start = useCallback(async () => {
    if (stored) return;
    persistCompleted(null);
    const local: StoredTimer = { startedAt: Date.now(), remoteSessionId: null };
    persist(local);
    setNow(Date.now());
    await ensureRemote(local);
  }, [stored, persist, persistCompleted, ensureRemote]);

  const stop = useCallback(async (): Promise<number> => {
    const current = stored ?? readStored();
    if (!current) return 0;

    const endedAt = Date.now();
    const stoppedSeconds = Math.max(0, Math.floor((endedAt - current.startedAt) / 1000));
    persist(null);
    persistCompleted({ elapsedSeconds: stoppedSeconds, endedAt });

    if (current.remoteSessionId && user) {
      try { await endRemoteWorkoutSession(current.remoteSessionId, dateKey()); } catch { /* local recording must continue */ }
    }
    return stoppedSeconds;
  }, [stored, user, persist, persistCompleted]);

  const elapsedSeconds = useMemo(
    () => stored ? Math.max(0, Math.floor((now - stored.startedAt) / 1000)) : 0,
    [stored, now],
  );
  const lastCompletedSeconds = completed?.elapsedSeconds ?? 0;

  return {
    status: stored ? 'running' as const : 'idle' as const,
    elapsedSeconds,
    lastCompletedSeconds,
    start,
    stop,
    discardCompleted,
  };
}
