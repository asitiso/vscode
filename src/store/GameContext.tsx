import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type {
  AppState,
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

// ── 액션 정의 ────────────────────────────────────────────────

type Action =
  | { type: 'COMPLETE_WORKOUT'; entries: WorkoutSetEntry[]; feeling: FeelingTag; memo?: string }
  | { type: 'OPEN_PACK'; packId: string }
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
      const today = now.toISOString().slice(0, 10);
      const categories = categoriesFromEntries(action.entries);
      const packDefId = selectPackForCategories(categories);

      const grantedPack: GrantedPack = {
        id: uid('pack'),
        packDefId,
        grantedAt: now.toISOString(),
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
      const pack = state.grantedPacks.find((p) => p.id === action.packId);
      if (!pack || pack.openedAt) return state;

      // 이 팩이 지급된 운동 기록의 카테고리를 찾아 카드 가중치에 사용한다.
      const relatedLog = state.workoutLogs.find((l) => l.grantedPackIds.includes(pack.id));
      const categories = relatedLog ? categoriesFromEntries(relatedLog.entries) : [];

      const { card, pityTriggered } = drawCard(categories, state.user.legendaryPityCounter);
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

      const updatedPacks = state.grantedPacks.map((p) =>
        p.id === pack.id ? { ...p, openedAt: now, resultCardId: card.id } : p,
      );

      const legendaryPityCounter =
        card.rarity === 'legendary' || pityTriggered ? 0 : state.user.legendaryPityCounter + 1;

      return {
        ...state,
        grantedPacks: updatedPacks,
        ownedCards: { ...state.ownedCards, [card.id]: updatedOwnedCard },
        user: { ...state.user, legendaryPityCounter },
      };
    }

    case 'SET_USER_NAME':
      return { ...state, user: { ...state.user, name: action.name } };

    case 'SET_WEEKLY_GOAL':
      return {
        ...state,
        user: { ...state.user, weeklyGoal: { targetSessionsPerWeek: action.target } },
      };

    case 'SET_SELECTED_CHARACTER':
      return { ...state, user: { ...state.user, selectedCharacterId: action.characterId } };

    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────

interface GameContextValue {
  state: AppState;
  completeWorkout: (entries: WorkoutSetEntry[], feeling: FeelingTag, memo?: string) => void;
  openPack: (packId: string) => void;
  setUserName: (name: string) => void;
  setWeeklyGoal: (target: number) => void;
  setSelectedCharacter: (characterId: string) => void;
  todayLogged: boolean;
  unopenedPacks: GrantedPack[];
  weeklyProgress: ReturnType<typeof computeWeeklyProgress>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState() ?? createInitialState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const today = new Date().toISOString().slice(0, 10);
  const todayLogged = state.workoutLogs.some((l) => l.date === today);
  const unopenedPacks = state.grantedPacks.filter((p) => !p.openedAt);
  const weeklyProgress = useMemo(
    () => computeWeeklyProgress(state.workoutLogs, state.user.weeklyGoal.targetSessionsPerWeek),
    [state.workoutLogs, state.user.weeklyGoal.targetSessionsPerWeek],
  );

  const value: GameContextValue = {
    state,
    completeWorkout: (entries, feeling, memo) =>
      dispatch({ type: 'COMPLETE_WORKOUT', entries, feeling, memo }),
    openPack: (packId) => dispatch({ type: 'OPEN_PACK', packId }),
    setUserName: (name) => dispatch({ type: 'SET_USER_NAME', name }),
    setWeeklyGoal: (target) => dispatch({ type: 'SET_WEEKLY_GOAL', target }),
    setSelectedCharacter: (characterId) => dispatch({ type: 'SET_SELECTED_CHARACTER', characterId }),
    todayLogged,
    unopenedPacks,
    weeklyProgress,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame은 GameProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
