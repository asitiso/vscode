import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
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
import { createInitialState, loadState, saveState } from './storage';
import { categoriesFromEntries, drawCard } from '../game/cardDraw';
import { selectPackForCategories } from '../game/packSelector';
import { computeWeeklyProgress } from '../game/weeklyGoal';
import {
  getAllCardSetProgress,
  getDailyCardSet,
  getLocalDateKey,
  selectFeaturedProgress,
} from '../game/cardSets';

export type CustomExerciseInput = { name: string; logType: ExerciseLogType };

type Action =
  | { type: 'COMPLETE_WORKOUT'; entries: WorkoutSetEntry[]; feeling: FeelingTag; memo?: string }
  | { type: 'OPEN_PACK'; packId: string }
  | { type: 'CREATE_CUSTOM_EXERCISE'; exercise: CustomExercise }
  | { type: 'UPDATE_CUSTOM_EXERCISE'; id: string; input: CustomExerciseInput; updatedAt: string }
  | { type: 'DELETE_CUSTOM_EXERCISE'; id: string }
  | { type: 'CLEAR_RECENT_COMPLETED_SET' }
  | { type: 'SET_USER_NAME'; name: string }
  | { type: 'SET_WEEKLY_GOAL'; target: number }
  | { type: 'SET_SELECTED_CHARACTER'; characterId: string };

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'COMPLETE_WORKOUT': {
      const now = new Date();
      const today = getLocalDateKey(now);
      const categories = categoriesFromEntries(action.entries);
      const grantedPack: GrantedPack = {
        id: uid('pack'),
        packDefId: selectPackForCategories(categories),
        grantedAt: now.toISOString(),
        source: 'workout',
      };
      const log: WorkoutLog = {
        id: uid('log'),
        date: today,
        entries: action.entries,
        feeling: action.feeling,
        memo: action.memo,
        grantedPackIds: [grantedPack.id],
        createdAt: now.toISOString(),
      };

      return {
        ...state,
        workoutLogs: [...state.workoutLogs, log],
        grantedPacks: [...state.grantedPacks, grantedPack],
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
      const legendaryPityCounter =
        card.rarity === 'legendary' || pityTriggered ? 0 : state.user.legendaryPityCounter + 1;

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
    default:
      return state;
  }
}

interface GameContextValue {
  state: AppState;
  completeWorkout: (entries: WorkoutSetEntry[], feeling: FeelingTag, memo?: string) => void;
  openPack: (packId: string) => void;
  createCustomExercise: (input: CustomExerciseInput) => CustomExercise;
  updateCustomExercise: (id: string, input: CustomExerciseInput) => void;
  deleteCustomExercise: (id: string) => void;
  clearRecentCompletedSet: () => void;
  setUserName: (name: string) => void;
  setWeeklyGoal: (target: number) => void;
  setSelectedCharacter: (characterId: string) => void;
  todayLogged: boolean;
  unopenedPacks: GrantedPack[];
  weeklyProgress: ReturnType<typeof computeWeeklyProgress>;
  cardSetProgress: ReturnType<typeof getAllCardSetProgress>;
  dailyCardSet: ReturnType<typeof getDailyCardSet>;
  featuredCardSetProgress: ReturnType<typeof selectFeaturedProgress>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState() ?? createInitialState());
  useEffect(() => saveState(state), [state]);

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

  const value: GameContextValue = {
    state,
    completeWorkout: (entries, feeling, memo) => dispatch({ type: 'COMPLETE_WORKOUT', entries, feeling, memo }),
    openPack: (packId) => dispatch({ type: 'OPEN_PACK', packId }),
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
