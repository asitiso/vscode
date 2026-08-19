import { useEffect, useRef, useState } from 'react';
import './HomeScreen.css';
import './HomeHudPopover.css';
import './HomeLevelXp.css';
import { useGame } from '../store/GameContext';
import { useWorkoutSessionTimer } from '../hooks/useWorkoutSessionTimer';
import { PlaceholderArt } from '../components/PlaceholderArt';
import { HomeCharacterInteraction } from './HomeCharacterInteraction';
import { HomeWorkoutTimerButton } from './HomeWorkoutTimerButton';
import { HomeWorkoutCta } from './HomeWorkoutCta';
import { HomeWeeklyGoalControl } from './HomeWeeklyGoalControl';
import { HomeUnopenedPackIndicator } from './HomeUnopenedPackIndicator';
import { LevelMilestoneModal } from './LevelMilestoneModal';
import { getHomeGroupShortcutCopy } from './homeGroupShortcut';
import { PACKS_BY_ID } from '../data/packs';
import { CARDS_BY_ID } from '../data/cards';
import { calculateExperienceProgress } from '../game/experience';
import { getHighestEarnedMilestoneBadge, getPendingLevelMilestone } from '../game/levelMilestones';
import type { ScreenId } from '../App';

interface HomeScreenProps {
  onNavigate: (screen: ScreenId, params?: { packId?: string }) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const {
    state,
    todayLogged,
    unopenedPacks,
    weeklyProgress,
    dailyCardSet,
    featuredCardSetProgress,
    claimLevelMilestone,
  } = useGame();
  const workoutTimer = useWorkoutSessionTimer();
  const [showXp, setShowXp] = useState(false);
  const [showWeeklyGoal, setShowWeeklyGoal] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null);
  const [dismissedMilestone, setDismissedMilestone] = useState<number | null>(null);
  const levelControlRef = useRef<HTMLDivElement>(null);
  const weeklyGoalControlRef = useRef<HTMLDivElement>(null);
  const nextPack = unopenedPacks[0];
  const goalTarget = state.user.weeklyGoal.targetSessionsPerWeek;
  const experience = calculateExperienceProgress(state);
  const pendingMilestone = getPendingLevelMilestone(experience.level, state.claimedLevelMilestones);
  const highestBadge = getHighestEarnedMilestoneBadge(state.claimedLevelMilestones);
  const remaining = featuredCardSetProgress.missingCardIds.length;
  const missingName = remaining === 1 ? CARDS_BY_ID[featuredCardSetProgress.missingCardIds[0]]?.name : undefined;
  const groupShortcut = getHomeGroupShortcutCopy();
  const characterDialogueContext = {
    hasUnopenedPack: unopenedPacks.length > 0,
    remainingWeeklySessions: weeklyProgress.remainingThisWeek,
    weeklyGoalComplete: weeklyProgress.remainingThisWeek === 0,
    todayLogged,
    streak: weeklyProgress.streak,
  };

  useEffect(() => {
    if (activeMilestone === null && pendingMilestone !== null && dismissedMilestone !== pendingMilestone) {
      setActiveMilestone(pendingMilestone);
    }
  }, [activeMilestone, dismissedMilestone, pendingMilestone]);

  useEffect(() => {
    if (!showXp) return;
    function handlePointerDown(event: PointerEvent) {
      if (!levelControlRef.current?.contains(event.target as Node)) setShowXp(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowXp(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showXp]);

  useEffect(() => {
    if (!showWeeklyGoal) return;
    function handlePointerDown(event: PointerEvent) {
      if (!weeklyGoalControlRef.current?.contains(event.target as Node)) setShowWeeklyGoal(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowWeeklyGoal(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showWeeklyGoal]);

  const closeMilestone = () => {
    setDismissedMilestone(activeMilestone);
    setActiveMilestone(null);
  };

  return (
    <div className="home-screen">
      <div className="home-screen__layer home-screen__bg">
        <PlaceholderArt assetName="home-background" emoji="🌤️" />
      </div>

      <div className="home-screen__layer home-screen__top-panel">
        <div className="hud-level-control" ref={levelControlRef}>
          <button
            type="button"
            className="hud-badge hud-badge--level hud-badge--button"
            aria-expanded={showXp}
            aria-controls="home-level-xp-popover"
            onClick={() => {
              setShowWeeklyGoal(false);
              setShowXp((current) => !current);
            }}
          >
            <span className="hud-badge__icon">⭐</span>
            <span className="hud-badge__text">
              <span className="hud-badge__title">Lv.{experience.level}</span>
              <span className="hud-badge__subtitle">{state.user.name}</span>
            </span>
            {highestBadge && <span className="hud-level-milestone-badge">{highestBadge.label}</span>}
          </button>
          {showXp && (
            <section id="home-level-xp-popover" className="home-hud-popover home-hud-popover--left level-xp-popover" role="dialog" aria-labelledby="home-level-xp-title">
              <div className="level-xp-popover__heading">
                <span className="level-xp-popover__star">⭐</span>
                <div><strong id="home-level-xp-title">Lv.{experience.level}</strong><span>다음 레벨 진행도</span></div>
                <b>{experience.progressPercent}%</b>
              </div>
              <div className="level-xp-popover__numbers">
                <span>현재 경험치</span>
                <strong>{experience.currentLevelXp.toLocaleString()} / {experience.requiredXp.toLocaleString()} XP</strong>
              </div>
              <div className="level-xp-progress" role="progressbar" aria-label="다음 레벨 경험치 진행률" aria-valuemin={0} aria-valuemax={experience.requiredXp} aria-valuenow={experience.currentLevelXp}>
                <span style={{ width: `${experience.progressPercent}%` }} />
              </div>
              <p className="level-xp-popover__remaining">
                {experience.remainingXp > 0 ? `다음 레벨까지 ${experience.remainingXp.toLocaleString()} XP 남았어요` : '다음 레벨 조건을 달성했어요!'}
              </p>
            </section>
          )}
        </div>
        <button type="button" className="hud-badge hud-badge--group" onClick={() => onNavigate('group')} aria-label="내 그룹 열기">
          <span className="hud-badge__icon">👥</span>
          <span className="hud-badge__text">
            <span className="hud-badge__title">{groupShortcut.title}</span>
            <span className="hud-badge__subtitle">{groupShortcut.subtitle}</span>
          </span>
        </button>
        <HomeWorkoutTimerButton
          status={workoutTimer.status}
          elapsedSeconds={workoutTimer.elapsedSeconds}
          onStart={workoutTimer.start}
          onStop={workoutTimer.stop}
        />
        <div className="hud-weekly-control" ref={weeklyGoalControlRef}>
          <HomeWeeklyGoalControl
            open={showWeeklyGoal}
            sessionsThisWeek={weeklyProgress.sessionsThisWeek}
            goalTarget={goalTarget}
            remainingThisWeek={weeklyProgress.remainingThisWeek}
            streak={weeklyProgress.streak}
            onToggle={() => {
              setShowXp(false);
              setShowWeeklyGoal((current) => !current);
            }}
          />
        </div>
      </div>

      <button type="button" className="home-screen__layer home-screen__set-progress" onClick={() => onNavigate('collection')}>
        <span className="home-screen__set-kicker">{featuredCardSetProgress.complete ? '세트 완성!' : `다음 완성까지 ${remaining}장`}</span>
        <span className="home-screen__set-main">
          <strong>{featuredCardSetProgress.set.name}</strong>
          <b>{featuredCardSetProgress.ownedCount} / {featuredCardSetProgress.totalCount}</b>
        </span>
        <span className="home-screen__set-detail">
          {missingName ? `${missingName} 카드만 남았어요` : `오늘의 집중 세트: ${dailyCardSet.name} · 등장 확률 UP`}
        </span>
      </button>

      <HomeWorkoutCta
        status={workoutTimer.status}
        elapsedSeconds={workoutTimer.elapsedSeconds}
        onStart={workoutTimer.start}
        onStop={workoutTimer.stop}
        onNavigate={() => onNavigate('record')}
      />

      <div className="home-screen__layer home-screen__character">
        <span className="character-platform" />
        <HomeCharacterInteraction assetName={state.user.selectedCharacterId} dialogueContext={characterDialogueContext} />
      </div>

      {nextPack && (
        <button
          type="button"
          className="home-screen__layer home-screen__pack"
          onClick={() => onNavigate('pack-opening', { packId: nextPack.id })}
          aria-label={`미개봉 카드팩 ${unopenedPacks.length}개, 다음 보상 열기`}
        >
          <span className="home-screen__pack-glow" />
          <HomeUnopenedPackIndicator count={unopenedPacks.length} source={nextPack.source} />
          <PlaceholderArt assetName={PACKS_BY_ID[nextPack.packDefId]?.packAsset ?? 'pack-basic'} emoji="🎁" label={PACKS_BY_ID[nextPack.packDefId]?.name} />
        </button>
      )}

      {activeMilestone !== null && (
        <LevelMilestoneModal
          level={activeMilestone}
          claimed={state.claimedLevelMilestones.includes(activeMilestone)}
          characterName={state.user.name}
          onClaim={() => claimLevelMilestone(activeMilestone, experience.level)}
          onOpenPack={() => onNavigate('pack-opening', { packId: `level-milestone-${activeMilestone}` })}
          onClose={closeMilestone}
        />
      )}
    </div>
  );
}
