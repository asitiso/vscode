import { useEffect, useRef, useState } from 'react';
import './HomeScreen.css';
import './HomeLevelXp.css';
import { useGame } from '../store/GameContext';
import { PlaceholderArt } from '../components/PlaceholderArt';
import { HomeCharacterInteraction } from './HomeCharacterInteraction';
import { PACKS_BY_ID } from '../data/packs';
import { CARDS_BY_ID } from '../data/cards';
import { calculateExperienceProgress } from '../game/experience';
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
  } = useGame();
  const [showXp, setShowXp] = useState(false);
  const levelControlRef = useRef<HTMLDivElement>(null);
  const nextPack = unopenedPacks[0];
  const goalTarget = state.user.weeklyGoal.targetSessionsPerWeek;
  const goalProgressPct = Math.min(100, Math.round((weeklyProgress.sessionsThisWeek / goalTarget) * 100));
  const experience = calculateExperienceProgress(state);
  const remaining = featuredCardSetProgress.missingCardIds.length;
  const missingName = remaining === 1 ? CARDS_BY_ID[featuredCardSetProgress.missingCardIds[0]]?.name : undefined;
  const characterDialogueContext = {
    hasUnopenedPack: unopenedPacks.length > 0,
    remainingWeeklySessions: weeklyProgress.remainingThisWeek,
    weeklyGoalComplete: weeklyProgress.remainingThisWeek === 0,
    todayLogged,
    streak: weeklyProgress.streak,
  };

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
            onClick={() => setShowXp((current) => !current)}
          >
            <span className="hud-badge__icon">⭐</span>
            <span className="hud-badge__text">
              <span className="hud-badge__title">Lv.{experience.level}</span>
              <span className="hud-badge__subtitle">{state.user.name}</span>
            </span>
          </button>
          {showXp && (
            <section id="home-level-xp-popover" className="level-xp-popover" role="dialog" aria-labelledby="home-level-xp-title">
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
        <div className="hud-badge hud-badge--streak">
          <span className="hud-badge__icon">🔥</span>
          <div className="hud-badge__text"><span className="hud-badge__title">{weeklyProgress.streak}주 연속</span><span className="hud-badge__subtitle">주간 목표 달성</span></div>
        </div>
      </div>

      <div className="home-screen__layer home-screen__info-panel">
        <div className="info-row"><span>이번 주 운동</span><span className="info-row__value">{weeklyProgress.sessionsThisWeek} / {goalTarget}회</span></div>
        <div className="progress-track"><div className="progress-track__fill" style={{ width: `${goalProgressPct}%` }} /></div>
        <div className={weeklyProgress.remainingThisWeek > 0 ? 'info-row info-row--muted' : 'info-row info-row--success'}>
          {weeklyProgress.remainingThisWeek > 0 ? `다음 보상까지 ${weeklyProgress.remainingThisWeek}회 남음` : '이번 주 목표 달성! 🎉'}
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

      <button type="button" className="home-screen__layer home-screen__cta" onClick={() => onNavigate('record')}>
        <span className="home-screen__cta-icon">💪</span>
        {todayLogged ? '오늘 운동 추가 기록하기' : '오늘 운동 기록하기'}
      </button>

      <div className="home-screen__layer home-screen__character">
        <span className="character-platform" />
        <HomeCharacterInteraction assetName={state.user.selectedCharacterId} dialogueContext={characterDialogueContext} />
      </div>

      {nextPack && (
        <button type="button" className="home-screen__layer home-screen__pack" onClick={() => onNavigate('pack-opening', { packId: nextPack.id })}>
          <span className="home-screen__pack-glow" />
          <span className="home-screen__pack-badge">
            {nextPack.source === 'set-completion' ? 'SET' : 'NEW'}
          </span>
          <PlaceholderArt assetName={PACKS_BY_ID[nextPack.packDefId]?.packAsset ?? 'pack-basic'} emoji="🎁" label={PACKS_BY_ID[nextPack.packDefId]?.name} />
        </button>
      )}
    </div>
  );
}
