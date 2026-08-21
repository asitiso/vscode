export interface GroupProfile {
  userId: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  weeklySeconds: number;
  inviteCode?: string;
}

export interface GroupMemberSummary {
  userId: string;
  nickname: string;
  todaySeconds: number;
  weeklySeconds: number;
  weeklyGoalPercent: number;
  isActive: boolean;
  lastHeartbeatAt?: string | null;
  isOwner?: boolean;
}

export interface GroupDetail extends GroupSummary {
  members: GroupMemberSummary[];
}

export type GroupCheerType = 'fire' | 'clap' | 'together';

export interface GroupCheerSummary {
  fire: number;
  clap: number;
  together: number;
  mySelection: GroupCheerType | null;
}

export type GroupApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'GROUP_LIMIT_REACHED'
  | 'GROUP_FULL'
  | 'INVALID_INVITE_CODE'
  | 'INVALID_GROUP_NAME'
  | 'INVALID_NICKNAME'
  | 'INVALID_CHEER_TYPE'
  | 'SELF_CHEER_NOT_ALLOWED'
  | 'NOT_GROUP_MEMBER'
  | 'OWNER_REQUIRED'
  | 'OWNER_CANNOT_LEAVE'
  | 'OWNER_CANNOT_REMOVE_SELF'
  | 'SESSION_NOT_FOUND'
  | 'SUPABASE_UNAVAILABLE'
  | 'UNKNOWN';
