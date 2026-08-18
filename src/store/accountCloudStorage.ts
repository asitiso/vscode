import type { AppState } from '../types';
import { getSupabaseClient } from '../lib/supabaseClient';
import { normalizeAppState, STATE_SCHEMA_VERSION } from './storage';

export interface AccountCloudSaveMetadata {
  schemaVersion: number;
  revision: number;
  clientSavedAt: string;
  updatedAt: string;
}

export interface AccountCloudSaveRecord extends AccountCloudSaveMetadata {
  state: AppState;
}

export class AccountRevisionConflictError extends Error {
  readonly currentRevision: number | null;

  constructor(currentRevision: number | null) {
    super('계정 저장 데이터가 다른 기기에서 변경되었습니다.');
    this.name = 'AccountRevisionConflictError';
    this.currentRevision = currentRevision;
  }
}

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase 설정이 없습니다.');
  return client;
}

function readTimestamp(value: unknown, label: string): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} 형식이 올바르지 않습니다.`);
  }
  return value;
}

function readRevision(value: unknown): number {
  const revision = Number(value);
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new Error('계정 저장 revision 형식이 올바르지 않습니다.');
  }
  return revision;
}

function readSchemaVersion(value: unknown): number {
  const schemaVersion = Number(value ?? STATE_SCHEMA_VERSION);
  if (!Number.isSafeInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error('계정 저장 schema version 형식이 올바르지 않습니다.');
  }
  return schemaVersion;
}

export async function loadAccountCloudState(): Promise<AccountCloudSaveRecord | null> {
  const client = requireClient();
  const { data, error } = await client.rpc('load_user_game_state');
  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    state: normalizeAppState(row.state),
    schemaVersion: readSchemaVersion(row.schema_version),
    revision: readRevision(row.revision),
    clientSavedAt: readTimestamp(row.client_saved_at, '계정 저장 시각'),
    updatedAt: readTimestamp(row.updated_at, '계정 갱신 시각'),
  };
}

export async function saveAccountCloudState(
  state: AppState,
  clientSavedAt: string,
  expectedRevision: number | null,
): Promise<AccountCloudSaveMetadata> {
  const client = requireClient();
  const { data, error } = await client.rpc('save_user_game_state', {
    p_state: state,
    p_client_saved_at: clientSavedAt,
    p_schema_version: STATE_SCHEMA_VERSION,
    p_expected_revision: expectedRevision,
  });
  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.status !== 'string') {
    throw new Error('계정 저장 응답 형식이 올바르지 않습니다.');
  }

  if (row.status === 'conflict') {
    const revision = row.revision == null ? null : Number(row.revision);
    throw new AccountRevisionConflictError(
      revision != null && Number.isSafeInteger(revision) && revision >= 1 ? revision : null,
    );
  }
  if (row.status !== 'saved') throw new Error('알 수 없는 계정 저장 상태입니다.');

  return {
    schemaVersion: readSchemaVersion(row.schema_version),
    revision: readRevision(row.revision),
    clientSavedAt: readTimestamp(row.client_saved_at, '계정 저장 시각'),
    updatedAt: readTimestamp(row.updated_at, '계정 갱신 시각'),
  };
}
