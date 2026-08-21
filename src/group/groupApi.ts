import { getSupabaseClient } from '../lib/supabaseClient';
import type {
  GroupApiErrorCode,
  GroupCheerSummary,
  GroupCheerType,
  GroupDetail,
  GroupMemberSummary,
  GroupProfile,
  GroupSummary,
} from './groupTypes';
import { rankGroupMembers } from './groupSelectors';

const ACTIVE_HEARTBEAT_MS = 2 * 60 * 1000;

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error('SUPABASE_UNAVAILABLE');
  return client;
}

function mapError(message?: string): GroupApiErrorCode {
  const value = message ?? '';
  const known: GroupApiErrorCode[] = [
    'AUTH_REQUIRED','GROUP_LIMIT_REACHED','GROUP_FULL','INVALID_INVITE_CODE','INVALID_GROUP_NAME','INVALID_NICKNAME',
    'INVALID_CHEER_TYPE','SELF_CHEER_NOT_ALLOWED','NOT_GROUP_MEMBER','OWNER_REQUIRED','OWNER_CANNOT_LEAVE',
    'OWNER_CANNOT_REMOVE_SELF','SESSION_NOT_FOUND','SUPABASE_UNAVAILABLE',
  ];
  return known.find((code) => value.includes(code)) ?? 'UNKNOWN';
}

function throwMapped(error: { message?: string } | null) {
  if (!error) return;
  const code = mapError(error.message);
  const mapped = new Error(code);
  mapped.name = 'GroupApiError';
  throw mapped;
}

async function currentUserId() {
  const client = requireClient();
  const { data, error } = await client.auth.getUser();
  throwMapped(error);
  if (!data.user) throw new Error('AUTH_REQUIRED');
  return data.user.id;
}

export async function loadGroupProfile(): Promise<GroupProfile | null> {
  const client = requireClient();
  const uid = await currentUserId();
  const { data, error } = await client.from('group_profiles').select('*').eq('user_id', uid).maybeSingle();
  throwMapped(error);
  if (!data) return null;
  return { userId: data.user_id, nickname: data.nickname, createdAt: data.created_at, updatedAt: data.updated_at };
}

export async function upsertGroupProfile(nickname: string): Promise<GroupProfile> {
  const client = requireClient();
  const { data, error } = await client.rpc('upsert_group_profile', { p_nickname: nickname.trim() });
  throwMapped(error);
  return { userId: data.user_id, nickname: data.nickname, createdAt: data.created_at, updatedAt: data.updated_at };
}

export async function updateGroupWeeklyGoalProgress(percent: number): Promise<number> {
  const client = requireClient();
  const { data, error } = await client.rpc('update_group_weekly_goal_progress', { p_percent: Math.round(percent) });
  throwMapped(error);
  return Number(data ?? 0);
}

export async function createGroup(name: string): Promise<{ groupId: string; inviteCode: string }> {
  const client = requireClient();
  const { data, error } = await client.rpc('create_group', { p_name: name.trim() });
  throwMapped(error);
  const row = Array.isArray(data) ? data[0] : data;
  return { groupId: row.group_id, inviteCode: String(row.invite_code).trim() };
}

export async function joinGroup(code: string): Promise<string> {
  const client = requireClient();
  const { data, error } = await client.rpc('join_group_by_invite_code', { p_code: code.trim().toUpperCase() });
  throwMapped(error);
  return String(data);
}

export async function leaveGroup(groupId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('leave_group', { p_group_id: groupId });
  throwMapped(error);
}

export async function removeGroupMember(groupId: string, memberId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('remove_group_member', { p_group_id: groupId, p_member_id: memberId });
  throwMapped(error);
}

function normalizeCheerCount(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function isCheerType(value: unknown): value is GroupCheerType {
  return value === 'fire' || value === 'clap' || value === 'together';
}

function normalizeCheerSummary(data: unknown): GroupCheerSummary {
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null | undefined;
  return {
    fire: normalizeCheerCount(row?.fire_count),
    clap: normalizeCheerCount(row?.clap_count),
    together: normalizeCheerCount(row?.together_count),
    mySelection: isCheerType(row?.my_selection) ? row.my_selection : null,
  };
}

export async function loadGroupDailyCheerSummary(groupId: string, receiverId: string): Promise<GroupCheerSummary> {
  const client = requireClient();
  const { data, error } = await client.rpc('get_group_daily_cheer_summary', {
    p_group_id: groupId,
    p_receiver_id: receiverId,
  });
  throwMapped(error);
  return normalizeCheerSummary(data);
}

export async function sendGroupDailyCheer(
  groupId: string,
  receiverId: string,
  type: GroupCheerType,
): Promise<GroupCheerSummary> {
  const client = requireClient();
  const { data, error } = await client.rpc('send_group_daily_cheer', {
    p_group_id: groupId,
    p_receiver_id: receiverId,
    p_cheer_type: type,
  });
  throwMapped(error);
  return normalizeCheerSummary(data);
}

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function weekStartKey() {
  const date = new Date();
  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + delta);
  return localDateKey(date);
}

export async function loadMyGroups(): Promise<GroupSummary[]> {
  const client = requireClient();
  const uid = await currentUserId();
  const { data: mine, error: membershipError } = await client.from('group_members').select('group_id').eq('user_id', uid);
  throwMapped(membershipError);
  const groupIds = (mine ?? []).map((row) => row.group_id);
  if (!groupIds.length) return [];

  const [{ data: groups, error: groupsError }, { data: members, error: membersError }, { data: activity, error: activityError }] = await Promise.all([
    client.from('groups').select('id,name,owner_id,invite_code').in('id', groupIds),
    client.from('group_members').select('group_id,user_id').in('group_id', groupIds),
    client.from('group_activity_daily').select('user_id,activity_date,workout_seconds').gte('activity_date', weekStartKey()),
  ]);
  throwMapped(groupsError); throwMapped(membersError); throwMapped(activityError);

  const memberIdsByGroup = new Map<string, Set<string>>();
  for (const row of members ?? []) {
    const set = memberIdsByGroup.get(row.group_id) ?? new Set<string>();
    set.add(row.user_id); memberIdsByGroup.set(row.group_id, set);
  }
  const weeklyByUser = new Map<string, number>();
  for (const row of activity ?? []) weeklyByUser.set(row.user_id, (weeklyByUser.get(row.user_id) ?? 0) + Number(row.workout_seconds ?? 0));

  return (groups ?? []).map((group) => {
    const memberIds = memberIdsByGroup.get(group.id) ?? new Set<string>();
    let weeklySeconds = 0;
    memberIds.forEach((id) => { weeklySeconds += weeklyByUser.get(id) ?? 0; });
    return {
      id: group.id,
      name: group.name,
      ownerId: group.owner_id,
      inviteCode: group.owner_id === uid ? String(group.invite_code).trim() : undefined,
      memberCount: memberIds.size,
      weeklySeconds,
    };
  });
}

export async function loadGroupDetail(groupId: string): Promise<GroupDetail> {
  const client = requireClient();
  const uid = await currentUserId();
  const today = localDateKey();
  const weekStart = weekStartKey();

  const [{ data: group, error: groupError }, { data: memberships, error: membershipsError }] = await Promise.all([
    client.from('groups').select('id,name,owner_id,invite_code').eq('id', groupId).single(),
    client.from('group_members').select('user_id').eq('group_id', groupId),
  ]);
  throwMapped(groupError); throwMapped(membershipsError);
  if (!group) throw new Error('NOT_GROUP_MEMBER');
  const userIds = (memberships ?? []).map((row) => row.user_id);
  if (!userIds.length) throw new Error('NOT_GROUP_MEMBER');

  const [{ data: profiles, error: profileError }, { data: activity, error: activityError }, { data: sessions, error: sessionError }] = await Promise.all([
    client.from('group_profiles').select('user_id,nickname,weekly_goal_percent').in('user_id', userIds),
    client.from('group_activity_daily').select('user_id,activity_date,workout_seconds').in('user_id', userIds).gte('activity_date', weekStart),
    client.from('workout_sessions').select('user_id,last_heartbeat_at,ended_at').in('user_id', userIds).is('ended_at', null),
  ]);
  throwMapped(profileError); throwMapped(activityError); throwMapped(sessionError);

  const profileByUser = new Map((profiles ?? []).map((row) => [row.user_id, row]));
  const todayByUser = new Map<string, number>();
  const weekByUser = new Map<string, number>();
  for (const row of activity ?? []) {
    const seconds = Number(row.workout_seconds ?? 0);
    weekByUser.set(row.user_id, (weekByUser.get(row.user_id) ?? 0) + seconds);
    if (row.activity_date === today) todayByUser.set(row.user_id, (todayByUser.get(row.user_id) ?? 0) + seconds);
  }
  const activeByUser = new Map<string, string>();
  for (const row of sessions ?? []) if (row.last_heartbeat_at) activeByUser.set(row.user_id, row.last_heartbeat_at);
  const now = Date.now();

  const members: GroupMemberSummary[] = userIds.map((userId) => {
    const profile = profileByUser.get(userId);
    const heartbeat = activeByUser.get(userId);
    return {
      userId,
      nickname: profile?.nickname ?? '사용자',
      todaySeconds: todayByUser.get(userId) ?? 0,
      weeklySeconds: weekByUser.get(userId) ?? 0,
      weeklyGoalPercent: Number(profile?.weekly_goal_percent ?? 0),
      lastHeartbeatAt: heartbeat ?? null,
      isActive: Boolean(heartbeat && now - new Date(heartbeat).getTime() <= ACTIVE_HEARTBEAT_MS),
      isOwner: userId === group.owner_id,
    };
  });

  return {
    id: group.id,
    name: group.name,
    ownerId: group.owner_id,
    inviteCode: group.owner_id === uid ? String(group.invite_code).trim() : undefined,
    memberCount: members.length,
    weeklySeconds: members.reduce((sum, member) => sum + member.weeklySeconds, 0),
    members: rankGroupMembers(members),
  };
}
