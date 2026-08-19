import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppState,
  CustomExercise,
  ExerciseLogType,
  FeelingTag,
  GrantedPack,
  OwnedCard,
  WorkoutLog,
  WorkoutSetEntry,
} from '../types';
import { calcStarLevel } from '../types';
import { createInitialState, loadStateEnvelope, saveState } from './storage';
import { loadCloudState, saveCloudState, type CloudSaveRecord } from './cloudStorage';
import {
  AccountRevisionConflictError,
  loadAccountCloudState,
  saveAccountCloudState,
  type AccountCloudSaveMetadata,
  type AccountCloudSaveRecord,
} from './accountCloudStorage';
import {
  isLocalDirty,
  loadAccountSyncMetadata,
  saveAccountSyncMetadata,
  type AccountSyncMetadata,
} from './accountSyncMetadata';
import { createAccountSaveQueue, decideAccountReconciliation } from './accountSyncCoordinator';
import { useGroupAuth } from '../group/GroupAuthContext';
import { categoriesFromEntries, drawCard } from '../game/cardDraw';
import { selectPackForCategories } from '../game/packSelector';
import { computeWeeklyProgress, countSessionsByWeek, getWeekKey } from '../game/weeklyGoal';
import { getMilestoneBadge, getMilestoneCosmetic, isLevelMilestone } from '../game/levelMilestones';
import { detectPersonalBestExerciseIds } from '../game/personalBest';
import { PACKS_BY_ID } from '../data/packs';
import {
  getAllCardSetProgress,
  getDailyCardSet,
  getLocalDateKey,
  selectFeaturedProgress,
} from '../game/cardSets';

export type CustomExerciseInput = { name: string; logType: ExerciseLogType };
export type CloudOperationStatus = 'idle' | 'saving' | 'loading' | 'success' | 'error';
export type AccountSyncStatus = 'signed-out' | 'checking' | 'linked' | 'saving' | 'error' | 'conflict';

export interface AccountSaveConflict {
  server: AccountCloudSaveRecord;
  localSavedAt: string;
}

export type Action =
  | { type: 'COMPLETE_WORKOUT'; entries: WorkoutSetEntry[]; feeling: FeelingTag; memo?: string; durationSeconds?: number }
  | { type: 'OPEN_PACK'; packId: string }
  | { type: 'CLAIM_LEVEL_MILESTONE'; level: number; currentLevel: number }
  | { type: 'CREATE_CUSTOM_EXERCISE'; exercise: CustomExercise }
  | { type: 'UPDATE_CUSTOM_EXERCISE'; id: string; input: CustomExerciseInput; updatedAt: string }
  | { type: 'DELETE_CUSTOM_EXERCISE'; id: string }
  | { type: 'CLEAR_RECENT_COMPLETED_SET' }
  | { type: 'SET_USER_NAME'; name: string }
  | { type: 'SET_WEEKLY_GOAL'; target: number }
  | { type: 'SET_SELECTED_CHARACTER'; characterId: string }
  | { type: 'REPLACE_STATE'; state: AppState };

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function gameReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'COMPLETE_WORKOUT': {
      const now = new Date();
      const today = getLocalDateKey(now);
      const weekKey = getWeekKey(today);
      const categories = categoriesFromEntries(action.entries);
      const grantedPack: GrantedPack = {
        id: uid('pack'),
        packDefId: selectPackForCategories(categories),
        grantedAt: now.toISOString(),
        source: 'workout',
      };

      const sessionsBefore = countSessionsByWeek(state.workoutLogs).get(weekKey) ?? 0;
      const countsAsNewActiveDay = !state.workoutLogs.some((item) => item.date === today);
      const sessionsAfter = sessionsBefore + (countsAsNewActiveDay ? 1 : 0);
      const weeklyTarget = Math.max(1, state.user.weeklyGoal.targetSessionsPerWeek);
      const weeklyAlreadyRewarded = state.grantedPacks.some((pack) => (
        pack.source === 'weekly-goal' && pack.sourceWeekKey === weekKey
      ));
      const completedWeeklyGoalNow = countsAsNewActiveDay
        && sessionsBefore < weeklyTarget
        && sessionsAfter >= weeklyTarget
        && !weeklyAlreadyRewarded;
      const weeklyRewardPack: GrantedPack | null = completedWeeklyGoalNow ? {
        id: `weekly-goal-${weekKey}`,
        packDefId: 'pack-weekly-goal',
        grantedAt: now.toISOString(),
        source: 'weekly-goal',
        sourceWeekKey: weekKey,
      } : null;
      const grantedPackIds = weeklyRewardPack
        ? [grantedPack.id, weeklyRewardPack.id]
        : [grantedPack.id];
      const personalBestExerciseIds = detectPersonalBestExerciseIds(state.workoutLogs, action.entries);

      const log: WorkoutLog = {
        id: uid('log'),
        date: today,
        entries: action.entries,
        feeling: action.feeling,
        memo: action.memo,
        durationSeconds: action.durationSeconds,
        personalBestExerciseIds,
        grantedPackIds,
        createdAt: now.toISOString(),
      };

      return {
        ...state,
        workoutLogs: [...state.workoutLogs, log],
        grantedPacks: weeklyRewardPack
          ? [...state.grantedPacks, grantedPack, weeklyRewardPack]
          : [...state.grantedPacks, grantedPack],
      };
    }

    case 'CLAIM_LEVEL_MILESTONE': {
      if (!isLevelMilestone(action.level)) return state;
      if (action.level > action.currentLevel) return state;
      if (state.claimedLevelMilestones.includes(action.level)) return state;
      if (!PACKS_BY_ID['pack-level-milestone']) return state;

      const badge = getMilestoneBadge(action.level);
      const cosmetic = getMilestoneCosmetic(action.level);
      const pack: GrantedPack = {
        id: `level-milestone-${action.level}`,
        packDefId: 'pack-level-milestone',
        grantedAt: new Date().toISOString(),
        source: 'level-milestone',
        sourceMilestoneLevel: action.level,
      };

      return {
        ...state,
        claimedLevelMilestones: [...state.claimedLevelMilestones, action.level].sort((a, b) => a - b),
        earnedBadges: Array.from(new Set([...state.earnedBadges, badge.id])),
        unlockedCosmetics: Array.from(new Set([...state.unlockedCosmetics, cosmetic.id])),
        grantedPacks: [...state.grantedPacks, pack],
      };
    }

    case 'OPEN_PACK': {
      const pack = state.grantedPacks.find((item) => item.id === action.packId);
      if (!pack || pack.openedAt) return state;

      const relatedLog = state.workoutLogs.find((log) => log.grantedPackIds.includes(pack.id));
      const categories = relatedLog ? categoriesFromEntries(relatedLog.entries) : [];
      const dailySet = getDailyCardSet(getLocalDateKey());
      const { card, pityTriggered } = drawCard(categories, state.user.legendaryPityCounter, {
        dailySetId: dailySet.id,
        completionSetId: pack.source === 'set-completion' ? pack.sourceSetId : undefined,
        milestone: pack.source === 'level-milestone',
      });
      const now = new Date().toISOString();
      const existing = state.ownedCards[card.id];
      const newCount = (existing?.count ?? 0) + 1;
      const updatedOwnedCard: OwnedCard = {
        cardId: card.id,
        count: newCount,
        starLevel: calcStarLevel(newCount),
        firstObtainedAt: existing?.firstObtainedAt ?? now,
        lastObtainedAt: now,
      };
      const ownedCards = { ...state.ownedCards, [card.id]: updatedOwnedCard };
      const rewarded = new Set(state.rewardedSetIds);
      const newlyRewardedSetIds = getAllCardSetProgress(ownedCards)
        .filter((progress) => progress.complete && !rewarded.has(progress.set.id))
        .map((progress) => progress.set.id);
      const rewardPacks: GrantedPack[] = newlyRewardedSetIds.map((setId, index) => ({
        id: `${uid('set-pack')}-${index}`,
        packDefId: 'pack-set-completion',
        grantedAt: now,
        source: 'set-completion',
        sourceSetId: setId,
      }));
      const openedPacks = state.grantedPacks.map((item) =>
        item.id === pack.id ? { ...item, openedAt: now, resultCardId: card.id } : item,
      );
      const legendaryPityCounter = pack.source === 'level-milestone'
        ? state.user.legendaryPityCounter
        : card.rarity === 'legendary' || pityTriggered
          ? 0
          : state.user.legendaryPityCounter + 1;

      return {
        ...state,
        grantedPacks: [...openedPacks, ...rewardPacks],
        ownedCards,
        completedSetIds: Array.from(new Set([...state.completedSetIds, ...newlyRewardedSetIds])),
        rewardedSetIds: Array.from(new Set([...state.rewardedSetIds, ...newlyRewardedSetIds])),
        recentCompletedSetId: newlyRewardedSetIds[0] ?? state.recentCompletedSetId,
        user: { ...state.user, legendaryPityCounter },
      };
    }

    case 'CREATE_CUSTOM_EXERCISE':
      return { ...state, customExercises: [...state.customExercises, action.exercise] };
    case 'UPDATE_CUSTOM_EXERCISE':
      return {
        ...state,
        customExercises: state.customExercises.map((exercise) =>
          exercise.id === action.id
            ? { ...exercise, name: action.input.name, logType: action.input.logType, updatedAt: action.updatedAt }
            : exercise,
        ),
      };
    case 'DELETE_CUSTOM_EXERCISE':
      return { ...state, customExercises: state.customExercises.filter((exercise) => exercise.id !== action.id) };
    case 'CLEAR_RECENT_COMPLETED_SET':
      return { ...state, recentCompletedSetId: undefined };
    case 'SET_USER_NAME':
      return { ...state, user: { ...state.user, name: action.name } };
    case 'SET_WEEKLY_GOAL':
      return { ...state, user: { ...state.user, weeklyGoal: { targetSessionsPerWeek: action.target } } };
    case 'SET_SELECTED_CHARACTER':
      return { ...state, user: { ...state.user, selectedCharacterId: action.characterId } };
    case 'REPLACE_STATE':
      return action.state;
    default:
      return state;
  }
}

interface GameContextValue {
  state: AppState;
  completeWorkout: (entries: WorkoutSetEntry[], feeling: FeelingTag, memo?: string, durationSeconds?: number) => void;
  openPack: (packId: string) => void;
  claimLevelMilestone: (level: number, currentLevel: number) => void;
  createCustomExercise: (input: CustomExerciseInput) => CustomExercise;
  updateCustomExercise: (id: string, input: CustomExerciseInput) => void;
  deleteCustomExercise: (id: string) => void;
  clearRecentCompletedSet: () => void;
  setUserName: (name: string) => void;
  setWeeklyGoal: (target: number) => void;
  setSelectedCharacter: (characterId: string) => void;
  saveManualCloudSlot: () => Promise<string>;
  loadManualCloudSlot: () => Promise<CloudSaveRecord | null>;
  restoreManualCloudSlot: (record: CloudSaveRecord) => void;
  cloudOperationStatus: CloudOperationStatus;
  cloudOperationMessage: string;
  lastCloudSavedAt: string | null;
  accountSyncStatus: AccountSyncStatus;
  accountSyncMessage: string;
  accountLastSavedAt: string | null;
  accountConflict: AccountSaveConflict | null;
  saveAccountNow: () => Promise<void>;
  resolveAccountConflict: (choice: 'server' | 'device') => Promise<void>;
  prepareAccountSignOut: () => Promise<'ready' | 'save-failed'>;
  todayLogged: boolean;
  unopenedPacks: GrantedPack[];
  weeklyProgress: ReturnType<typeof computeWeeklyProgress>;
  cardSetProgress: ReturnType<typeof getAllCardSetProgress>;
  dailyCardSet: ReturnType<typeof getDailyCardSet>;
  featuredCardSetProgress: ReturnType<typeof selectFeaturedProgress>;
}

interface AccountSaveRequest {
  userId: string;
  state: AppState;
  localSavedAt: string;
  expectedRevisionOverride?: number | null;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { user } = useGroupAuth();
  const [initialEnvelope] = useState(() => loadStateEnvelope());
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => initialEnvelope?.state ?? createInitialState(),
  );
  const [cloudOperationStatus, setCloudOperationStatus] = useState<CloudOperationStatus>('idle');
  const [cloudOperationMessage, setCloudOperationMessage] = useState('');
  const [lastCloudSavedAt, setLastCloudSavedAt] = useState<string | null>(null);
  const [accountSyncStatus, setAccountSyncStatus] = useState<AccountSyncStatus>(user ? 'checking' : 'signed-out');
  const [accountSyncMessage, setAccountSyncMessage] = useState('');
  const [accountLastSavedAt, setAccountLastSavedAt] = useState<string | null>(null);
  const [accountConflict, setAccountConflictState] = useState<AccountSaveConflict | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const userIdRef = useRef<string | null>(user?.id ?? null);
  userIdRef.current = user?.id ?? null;
  const localSavedAtRef = useRef<string | null>(initialEnvelope?.savedAt ?? null);
  const metadataRef = useRef<AccountSyncMetadata | null>(null);
  const accountConflictRef = useRef<AccountSaveConflict | null>(null);
  const initialStateEffectSeenRef = useRef(false);
  const skipNextStateSaveRef = useRef(false);
  const pendingImportantSaveRef = useRef(false);

  function setAccountConflict(value: AccountSaveConflict | null): void {
    accountConflictRef.current = value;
    setAccountConflictState(value);
  }

  const saveQueueRef = useRef(
    createAccountSaveQueue<AccountSaveRequest, AccountCloudSaveMetadata>(async (request) => {
      if (userIdRef.current !== request.userId) {
        throw new Error('계정이 변경되어 이전 계정 저장을 중단했습니다.');
      }
      const expectedRevision = Object.prototype.hasOwnProperty.call(request, 'expectedRevisionOverride')
        ? request.expectedRevisionOverride ?? null
        : metadataRef.current?.serverRevision ?? null;
      return saveAccountCloudState(request.state, request.localSavedAt, expectedRevision);
    }),
  );

  const ensureLocalEnvelope = useCallback((snapshot: AppState = stateRef.current): string => {
    if (localSavedAtRef.current) return localSavedAtRef.current;
    const envelope = saveState(snapshot);
    localSavedAtRef.current = envelope.savedAt;
    return envelope.savedAt;
  }, []);

  const persistMetadata = useCallback((metadata: AccountSyncMetadata) => {
    metadataRef.current = metadata;
    saveAccountSyncMetadata(metadata);
  }, []);

  const applyServerRecord = useCallback((record: AccountCloudSaveRecord, userId: string) => {
    skipNextStateSaveRef.current = true;
    dispatch({ type: 'REPLACE_STATE', state: record.state });
    const envelope = saveState(record.state, record.clientSavedAt);
    localSavedAtRef.current = envelope.savedAt;
    persistMetadata({
      userId,
      serverRevision: record.revision,
      lastSyncedLocalSavedAt: envelope.savedAt,
      lastServerUpdatedAt: record.updatedAt,
      linked: true,
    });
    setAccountLastSavedAt(record.clientSavedAt);
    setAccountConflict(null);
    setAccountSyncStatus('linked');
    setAccountSyncMessage('계정 데이터를 불러왔습니다.');
  }, [persistMetadata]);

  const saveAccountSnapshot = useCallback(async (
    snapshot: AppState,
    localSavedAt: string,
    options: { expectedRevisionOverride?: number | null; silentError?: boolean } = {},
  ): Promise<AccountCloudSaveMetadata> => {
    const userId = userIdRef.current;
    if (!userId) throw new Error('로그인이 필요합니다.');
    if (accountConflictRef.current && !Object.prototype.hasOwnProperty.call(options, 'expectedRevisionOverride')) {
      throw new Error('저장 데이터 충돌을 먼저 해결해 주세요.');
    }

    if (!options.silentError) {
      setAccountSyncStatus('saving');
      setAccountSyncMessage('계정에 저장하는 중…');
    }

    const request: AccountSaveRequest = { userId, state: snapshot, localSavedAt };
    if (Object.prototype.hasOwnProperty.call(options, 'expectedRevisionOverride')) {
      request.expectedRevisionOverride = options.expectedRevisionOverride ?? null;
    }

    try {
      const result = await saveQueueRef.current.enqueue(request);
      if (userIdRef.current !== userId) return result;
      persistMetadata({
        userId,
        serverRevision: result.revision,
        lastSyncedLocalSavedAt: localSavedAt,
        lastServerUpdatedAt: result.updatedAt,
        linked: true,
      });
      setAccountLastSavedAt(result.clientSavedAt);
      setAccountSyncStatus('linked');
      setAccountSyncMessage('계정에 저장되었습니다.');
      return result;
    } catch (error) {
      if (error instanceof AccountRevisionConflictError) {
        try {
          const latest = await loadAccountCloudState();
          if (latest && userIdRef.current === userId) {
            const conflictLocalSavedAt = localSavedAtRef.current ?? localSavedAt;
            setAccountConflict({ server: latest, localSavedAt: conflictLocalSavedAt });
            setAccountSyncStatus('conflict');
            setAccountSyncMessage('다른 기기의 최신 저장 데이터가 있습니다.');
          } else if (userIdRef.current === userId) {
            setAccountSyncStatus('error');
            setAccountSyncMessage('최신 계정 저장 데이터를 확인하지 못했습니다.');
          }
        } catch (loadError) {
          if (userIdRef.current === userId) {
            setAccountSyncStatus('error');
            setAccountSyncMessage(loadError instanceof Error ? loadError.message : '최신 계정 저장 데이터를 확인하지 못했습니다.');
          }
        }
      } else if (!options.silentError && userIdRef.current === userId) {
        setAccountSyncStatus('error');
        setAccountSyncMessage(error instanceof Error ? error.message : '계정 저장에 실패했습니다.');
      }
      throw error;
    }
  }, [persistMetadata]);

  const saveCurrentAccountIfDirty = useCallback(async (options: { silentError?: boolean } = {}) => {
    const userId = userIdRef.current;
    if (!userId) return;
    if (accountConflictRef.current) throw new Error('저장 데이터 충돌을 먼저 해결해 주세요.');
    const localSavedAt = ensureLocalEnvelope(stateRef.current);
    if (!isLocalDirty(localSavedAt, metadataRef.current)) return;
    await saveAccountSnapshot(stateRef.current, localSavedAt, options);
  }, [ensureLocalEnvelope, saveAccountSnapshot]);

  useEffect(() => {
    if (!initialStateEffectSeenRef.current) {
      initialStateEffectSeenRef.current = true;
      return;
    }
    if (skipNextStateSaveRef.current) {
      skipNextStateSaveRef.current = false;
      return;
    }

    const envelope = saveState(state);
    localSavedAtRef.current = envelope.savedAt;

    if (pendingImportantSaveRef.current) {
      pendingImportantSaveRef.current = false;
      void saveAccountSnapshot(state, envelope.savedAt).catch(() => undefined);
    }
  }, [state, saveAccountSnapshot]);

  useEffect(() => {
    const userId = user?.id ?? null;
    userIdRef.current = userId;

    if (!userId) {
      metadataRef.current = null;
      setAccountConflict(null);
      setAccountSyncStatus('signed-out');
      setAccountSyncMessage('');
      setAccountLastSavedAt(null);
      return;
    }

    let alive = true;
    setAccountSyncStatus('checking');
    setAccountSyncMessage('계정 저장 데이터를 확인하는 중…');

    void (async () => {
      try {
        const serverRecord = await loadAccountCloudState();
        if (!alive || userIdRef.current !== userId) return;

        const metadata = loadAccountSyncMetadata(userId);
        metadataRef.current = metadata;
        const localSavedAt = localSavedAtRef.current;
        const localDirty = isLocalDirty(localSavedAt, metadata);
        const decision = decideAccountReconciliation({ metadata, serverRecord, localSavedAt, localDirty });

        if (decision === 'upload-local') {
          const savedAt = ensureLocalEnvelope(stateRef.current);
          await saveAccountSnapshot(stateRef.current, savedAt);
          return;
        }

        if (!serverRecord) return;

        if (decision === 'use-server') {
          applyServerRecord(serverRecord, userId);
          return;
        }

        if (decision === 'prompt') {
          const savedAt = ensureLocalEnvelope(stateRef.current);
          setAccountConflict({ server: serverRecord, localSavedAt: savedAt });
          setAccountLastSavedAt(serverRecord.clientSavedAt);
          setAccountSyncStatus('conflict');
          setAccountSyncMessage('계정 데이터와 이 기기 데이터 중 사용할 데이터를 선택해 주세요.');
          return;
        }

        persistMetadata({
          userId,
          serverRevision: serverRecord.revision,
          lastSyncedLocalSavedAt: metadata?.lastSyncedLocalSavedAt ?? serverRecord.clientSavedAt,
          lastServerUpdatedAt: serverRecord.updatedAt,
          linked: true,
        });
        setAccountLastSavedAt(serverRecord.clientSavedAt);
        setAccountSyncStatus('linked');
        setAccountSyncMessage('계정 저장이 연결되어 있습니다.');
      } catch (error) {
        if (!alive || userIdRef.current !== userId) return;
        if (accountConflictRef.current) return;
        setAccountSyncStatus('error');
        setAccountSyncMessage(error instanceof Error ? error.message : '계정 저장 데이터를 확인하지 못했습니다.');
      }
    })();

    return () => {
      alive = false;
    };
  }, [user?.id, applyServerRecord, ensureLocalEnvelope, persistMetadata, saveAccountSnapshot]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== 'hidden') return;
      if (!userIdRef.current || accountConflictRef.current) return;
      const localSavedAt = localSavedAtRef.current;
      if (!isLocalDirty(localSavedAt, metadataRef.current)) return;
      void saveCurrentAccountIfDirty({ silentError: true }).catch(() => undefined);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [saveCurrentAccountIfDirty]);

  const today = getLocalDateKey();
  const todayLogged = state.workoutLogs.some((log) => log.date === today);
  const unopenedPacks = state.grantedPacks.filter((pack) => !pack.openedAt);
  const weeklyProgress = useMemo(
    () => computeWeeklyProgress(state.workoutLogs, state.user.weeklyGoal.targetSessionsPerWeek),
    [state.workoutLogs, state.user.weeklyGoal.targetSessionsPerWeek],
  );
  const cardSetProgress = useMemo(() => getAllCardSetProgress(state.ownedCards), [state.ownedCards]);
  const dailyCardSet = getDailyCardSet(today);
  const featuredCardSetProgress = useMemo(
    () => selectFeaturedProgress(state.ownedCards, dailyCardSet.id),
    [state.ownedCards, dailyCardSet.id],
  );

  async function saveManualCloudSlot(): Promise<string> {
    setCloudOperationStatus('saving');
    setCloudOperationMessage('중간 저장 중…');
    try {
      const savedAt = new Date().toISOString();
      const result = await saveCloudState(stateRef.current, savedAt);
      setLastCloudSavedAt(result.clientSavedAt);
      setCloudOperationStatus('success');
      setCloudOperationMessage('중간 저장이 완료되었습니다.');
      return result.clientSavedAt;
    } catch (error) {
      const message = error instanceof Error ? error.message : '중간 저장에 실패했습니다.';
      setCloudOperationStatus('error');
      setCloudOperationMessage(message);
      throw error;
    }
  }

  async function loadManualCloudSlot(): Promise<CloudSaveRecord | null> {
    setCloudOperationStatus('loading');
    setCloudOperationMessage('중간 저장을 확인하는 중…');
    try {
      const record = await loadCloudState();
      if (!record) {
        setCloudOperationStatus('idle');
        setCloudOperationMessage('불러올 중간 저장이 없습니다.');
        return null;
      }
      setLastCloudSavedAt(record.clientSavedAt);
      setCloudOperationStatus('success');
      setCloudOperationMessage('중간 저장을 찾았습니다.');
      return record;
    } catch (error) {
      const message = error instanceof Error ? error.message : '중간 저장을 불러오지 못했습니다.';
      setCloudOperationStatus('error');
      setCloudOperationMessage(message);
      throw error;
    }
  }

  function restoreManualCloudSlot(record: CloudSaveRecord): void {
    dispatch({ type: 'REPLACE_STATE', state: record.state });
    saveState(record.state, record.clientSavedAt);
    localSavedAtRef.current = record.clientSavedAt;
    setLastCloudSavedAt(record.clientSavedAt);
    setCloudOperationStatus('success');
    setCloudOperationMessage('중간 저장을 불러왔습니다.');
  }

  async function saveAccountNow(): Promise<void> {
    if (!userIdRef.current) {
      setAccountSyncStatus('signed-out');
      setAccountSyncMessage('로그인하면 계정 저장을 사용할 수 있습니다.');
      return;
    }
    if (accountConflictRef.current) {
      setAccountSyncStatus('conflict');
      setAccountSyncMessage('저장 데이터 충돌을 먼저 해결해 주세요.');
      return;
    }
    const localSavedAt = ensureLocalEnvelope(stateRef.current);
    if (!isLocalDirty(localSavedAt, metadataRef.current)) {
      setAccountSyncStatus('linked');
      setAccountSyncMessage('이미 최신 상태입니다.');
      return;
    }
    await saveAccountSnapshot(stateRef.current, localSavedAt);
  }

  async function resolveAccountConflict(choice: 'server' | 'device'): Promise<void> {
    const conflict = accountConflictRef.current;
    const userId = userIdRef.current;
    if (!conflict || !userId) return;

    if (choice === 'server') {
      applyServerRecord(conflict.server, userId);
      return;
    }

    const localSavedAt = ensureLocalEnvelope(stateRef.current);
    await saveAccountSnapshot(stateRef.current, localSavedAt, {
      expectedRevisionOverride: conflict.server.revision,
    });
    setAccountConflict(null);
    setAccountSyncStatus('linked');
    setAccountSyncMessage('이 기기 데이터를 계정에 저장했습니다.');
  }

  async function prepareAccountSignOut(): Promise<'ready' | 'save-failed'> {
    if (!userIdRef.current) return 'ready';
    if (accountConflictRef.current) return 'save-failed';
    const localSavedAt = localSavedAtRef.current;
    if (!isLocalDirty(localSavedAt, metadataRef.current)) return 'ready';
    try {
      await saveCurrentAccountIfDirty();
      return 'ready';
    } catch {
      return 'save-failed';
    }
  }

  const value: GameContextValue = {
    state,
    completeWorkout: (entries, feeling, memo, durationSeconds) => {
      pendingImportantSaveRef.current = Boolean(userIdRef.current);
      dispatch({ type: 'COMPLETE_WORKOUT', entries, feeling, memo, durationSeconds });
    },
    openPack: (packId) => {
      const pack = stateRef.current.grantedPacks.find((item) => item.id === packId);
      pendingImportantSaveRef.current = Boolean(userIdRef.current && pack && !pack.openedAt);
      dispatch({ type: 'OPEN_PACK', packId });
    },
    claimLevelMilestone: (level, currentLevel) => {
      pendingImportantSaveRef.current = Boolean(
        userIdRef.current
        && isLevelMilestone(level)
        && level <= currentLevel
        && !stateRef.current.claimedLevelMilestones.includes(level)
        && PACKS_BY_ID['pack-level-milestone'],
      );
      dispatch({ type: 'CLAIM_LEVEL_MILESTONE', level, currentLevel });
    },
    createCustomExercise: (input) => {
      const now = new Date().toISOString();
      const exercise: CustomExercise = {
        id: uid('custom-exercise'),
        name: input.name,
        category: 'etc',
        logType: input.logType,
        createdAt: now,
        updatedAt: now,
      };
      dispatch({ type: 'CREATE_CUSTOM_EXERCISE', exercise });
      return exercise;
    },
    updateCustomExercise: (id, input) => dispatch({ type: 'UPDATE_CUSTOM_EXERCISE', id, input, updatedAt: new Date().toISOString() }),
    deleteCustomExercise: (id) => dispatch({ type: 'DELETE_CUSTOM_EXERCISE', id }),
    clearRecentCompletedSet: () => dispatch({ type: 'CLEAR_RECENT_COMPLETED_SET' }),
    setUserName: (name) => dispatch({ type: 'SET_USER_NAME', name }),
    setWeeklyGoal: (target) => dispatch({ type: 'SET_WEEKLY_GOAL', target }),
    setSelectedCharacter: (characterId) => dispatch({ type: 'SET_SELECTED_CHARACTER', characterId }),
    saveManualCloudSlot,
    loadManualCloudSlot,
    restoreManualCloudSlot,
    cloudOperationStatus,
    cloudOperationMessage,
    lastCloudSavedAt,
    accountSyncStatus,
    accountSyncMessage,
    accountLastSavedAt,
    accountConflict,
    saveAccountNow,
    resolveAccountConflict,
    prepareAccountSignOut,
    todayLogged,
    unopenedPacks,
    weeklyProgress,
    cardSetProgress,
    dailyCardSet,
    featuredCardSetProgress,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame은 GameProvider 내부에서만 사용할 수 있습니다.');
  return context;
}