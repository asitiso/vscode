import type { AppState } from '../types';
import { getSupabaseClient } from '../lib/supabaseClient';
import { getAnonymousDeviceHash } from './anonymousDevice';
import { normalizeAppState, STATE_SCHEMA_VERSION } from './storage';

export interface CloudSaveMetadata {
  clientSavedAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface CloudSaveRecord extends CloudSaveMetadata {
  state: AppState;
}

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase 설정이 없습니다.');
  return client;
}

export async function saveCloudState(
  state: AppState,
  clientSavedAt = new Date().toISOString(),
): Promise<CloudSaveMetadata> {
  const client = requireClient();
  const deviceHash = await getAnonymousDeviceHash();
  const { data, error } = await client.rpc('save_anonymous_game_state', {
    p_device_key_hash: deviceHash,
    p_state: state,
    p_client_saved_at: clientSavedAt,
    p_schema_version: STATE_SCHEMA_VERSION,
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.client_saved_at !== 'string' || typeof row.updated_at !== 'string') {
    throw new Error('중간 저장 응답 형식이 올바르지 않습니다.');
  }

  return {
    clientSavedAt: row.client_saved_at,
    updatedAt: row.updated_at,
    schemaVersion: Number(row.schema_version ?? STATE_SCHEMA_VERSION),
  };
}

export async function loadCloudState(): Promise<CloudSaveRecord | null> {
  const client = requireClient();
  const deviceHash = await getAnonymousDeviceHash();
  const { data, error } = await client.rpc('load_anonymous_game_state', {
    p_device_key_hash: deviceHash,
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  if (typeof row.client_saved_at !== 'string' || typeof row.updated_at !== 'string') {
    throw new Error('중간 저장 데이터 형식이 올바르지 않습니다.');
  }

  return {
    state: normalizeAppState(row.state),
    clientSavedAt: row.client_saved_at,
    updatedAt: row.updated_at,
    schemaVersion: Number(row.schema_version ?? STATE_SCHEMA_VERSION),
  };
}
