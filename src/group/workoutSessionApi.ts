import { getSupabaseClient } from '../lib/supabaseClient';

export interface RemoteWorkoutSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  lastHeartbeatAt: string;
  durationSeconds: number | null;
}

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error('SUPABASE_UNAVAILABLE');
  return client;
}

function mapSession(row: any): RemoteWorkoutSession {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    lastHeartbeatAt: row.last_heartbeat_at,
    durationSeconds: row.duration_seconds,
  };
}

export async function startRemoteWorkoutSession(): Promise<RemoteWorkoutSession> {
  const client = requireClient();
  const { data, error } = await client.rpc('start_workout_session');
  if (error) throw error;
  return mapSession(data);
}

export async function heartbeatRemoteWorkoutSession(sessionId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('heartbeat_workout_session', { p_session_id: sessionId });
  if (error) throw error;
}

export async function endRemoteWorkoutSession(sessionId: string, activityDate: string): Promise<RemoteWorkoutSession> {
  const client = requireClient();
  const { data, error } = await client.rpc('end_workout_session', { p_session_id: sessionId, p_activity_date: activityDate });
  if (error) throw error;
  return mapSession(data);
}
