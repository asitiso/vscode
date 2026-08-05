import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import './PackOpeningScreen.css';
import './RewardEventsV2.css';
import './RewardEventsV3.css';
import './RewardEventsV4.css';
import { useGame } from '../store/GameContext';
import { PACKS_BY_ID } from '../data/packs';
import { CARDS, CARDS_BY_ID } from '../data/cards';
import { PlaceholderArt } from '../components/PlaceholderArt';
import { calcStarLevel, pickDisplayIllustration } from '../types';
import { playRewardSound } from '../game/rewardAudio';

interface PackOpeningScreenProps {
  packId: string;
  onDone: () => void;
}

type OpeningPhase = 'ready' | 'charging' | 'burst' | 'cinematic' | 'reveal' | 'finale';
type RewardEventKind = 'star' | 'trophy' | 'weekly' | 'collection';

interface RewardEventResult {
  key: string;
  kind: RewardEventKind;
  icon: string;
  title: string;
  description: string;
  detail?: string;
}

const RARITY_LABEL: Record<string, string> = {
  common: '일반', rare: '레어', 'super-rare': '슈퍼 레어', legendary: '레전드',
};
const SPECIAL_PACK_LABEL: Record<string, string> = {
  'weekly-goal': 'WEEKLY CLEAR', 'streak-reward': 'STREAK BONUS', 'special-challenge': 'LIMITED EVENT',
};
const PARTICLES = Array.from({ length: 24 }, (_, index) => index);
const CONFETTI = Array.from({ length: 12 }, (_, index) => index);

export function PackOpeningScreen({ packId, onDone }: PackOpeningScreenProps) {
  const { state, openPack, weeklyProgress } = useGame();
  const [phase, setPhase] = useState<OpeningPhase>('ready');
  const [dragY, setDragY] = useState(0);
  const [rewardIndex, setRewardIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('reward-sound') !== 'off');
  const openedRef = useRef(false);
  const revealScheduledRef = useRef(false);
  const pointerStartYRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);

  const pack = state.grantedPacks.find((p) => p.id === packId);
  const packDef = pack ? PACKS_BY_ID[pack.packDefId] : undefined;
  const relatedLog = state.workoutLogs.find((log) => log.grantedPackIds.includes(packId));
  const refreshedPack = state.grantedPacks.find((p) => p.id === packId);
  const resultCard = refreshedPack?.resultCardId ? CARDS_BY_ID[refreshedPack.resultCardId] : null;
  const owned = resultCard ? state.ownedCards[resultCard.id] : null;
  const isNewCard = owned?.count === 1;
  const previousCount = owned ? Math.max(0, owned.count - 1) : 0;
  const previousStarLevel = previousCount > 0 ? calcStarLevel(previousCount) : 0;
  const starGrew = Boolean(owned && previousCount > 0 && owned.starLevel > previousStarLevel);
  const isPersonalBest = relatedLog?.feeling === 'personal-best';
  const latestWorkout = state.workoutLogs[state.workoutLogs.length - 1];
  const weeklyGoalTarget = state.user.weeklyGoal.targetSessionsPerWeek;
  const weeklyGoalHit = Boolean(relatedLog && latestWorkout?.id === relatedLog.id && weeklyProgress.sessionsThisWeek === weeklyGoalTarget && weeklyProgress.remainingThisWeek === 0);
  const collectionCount = Object.keys(state.ownedCards).length;
  const previousCollectionCount = Math.max(0, collectionCount - (isNewCard ? 1 : 0));
  const collectionPercent = Math.round((collectionCount / CARDS.length) * 100);
  const previousCollectionPercent = Math.round((previousCollectionCount / CARDS.length) * 100);
  const specialPackLabel = packDef ? SPECIAL_PACK_LABEL[packDef.type] : undefined;
  const packTheme = packDef?.type ?? 'basic';

  const rewardEvents = useMemo<RewardEventResult[]>(() => {
    const events: RewardEventResult[] = [];
    if (starGrew) events.push({ key: 'star', kind: 'star', icon: '🌟', title: `${previousStarLevel}성 → ${owned?.starLevel}성 성장!`, description: '중복 카드가 하나로 합쳐져 새로운 별이 켜졌어요.', detail: 'POWER UP' });
    if (isPersonalBest) events.push({ key: 'trophy', kind: 'trophy', icon: '🏆', title: '오늘의 개인 기록 달성!', description: '최고의 운동을 기념하는 특별 트로피가 빛납니다.', detail: 'PERSONAL BEST' });
    if (weeklyGoalHit) events.push({ key: 'weekly', kind: 'weekly', icon: '🎁', title: '주간 목표 보상 상자 개방!', description: `이번 주 ${weeklyGoalTarget}회 운동 목표를 완성했어요.`, detail: 'WEEKLY CLEAR' });
    if (isNewCard) events.push({ key: 'collection', kind: 'collection', icon: '📚', title: `도감 완성도 ${previousCollectionPercent}% → ${collectionPercent}%`, description: `${collectionCount}/${CARDS.length}종 발견 · 새로운 빈칸이 채워졌어요!`, detail: 'COLLECTION UP' });
    return events;
  }, [collectionCount, collectionPercent, isNewCard, isPersonalBest, owned?.starLevel, previousCollectionPercent, previousStarLevel, starGrew, weeklyGoalHit, weeklyGoalTarget]);

  useEffect(() => () => timersRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  useEffect(() => {
    if (phase !== 'burst' || !resultCard || revealScheduledRef.current) return;
    revealScheduledRef.current = true;
    const legendary = resultCard.rarity === 'legendary';
    timersRef.current.push(window.setTimeout(() => {
      if (legendary) {
        setPhase('cinematic');
        playRewardSound('legendary', soundEnabled);
        vibrate([90, 50, 120, 60, 180]);
      } else {
        setPhase('reveal');
        playRewardSound('reveal', soundEnabled);
        vibrate([30, 30, 30]);
      }
    }, 620));
    if (legendary) timersRef.current.push(window.setTimeout(() => {
      setPhase('reveal');
      playRewardSound('reveal', soundEnabled);
      vibrate([80, 40, 160]);
    }, 2450));
  }, [phase, resultCard, soundEnabled]);

  function vibrate(pattern: number | number[]) { if ('vibrate' in navigator) navigator.vibrate(pattern); }
  function grantRewardOnce() { if (!openedRef.current) { openedRef.current = true; openPack(packId); } }

  function beginOpening() {
    if (phase !== 'ready') return;
    grantRewardOnce();
    setDragY(0);
    setPhase('charging');
    playRewardSound('charge', soundEnabled);
    vibrate(35);
    timersRef.current.push(window.setTimeout(() => {
      setPhase('burst');
      playRewardSound('burst', soundEnabled);
      vibrate([45, 35, 80]);
    }, 700));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (phase !== 'ready') return;
    pointerStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
    playRewardSound('tap', soundEnabled);
  }
  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (pointerStartYRef.current === null || phase !== 'ready') return;
    setDragY(Math.max(-90, Math.min(0, event.clientY - pointerStartYRef.current)));
  }
  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (pointerStartYRef.current === null || phase !== 'ready') return;
    const distance = event.clientY - pointerStartYRef.current;
    pointerStartYRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    distance <= -48 ? beginOpening() : setDragY(0);
  }
  function handleSkip() {
    grantRewardOnce();
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    revealScheduledRef.current = true;
    setDragY(0);
    setPhase('reveal');
    playRewardSound('reveal', soundEnabled);
  }
  function handleRewardNext() {
    if (rewardIndex < rewardEvents.length - 1) {
      setRewardIndex((current) => current + 1);
      playRewardSound('reward', soundEnabled);
      vibrate(20);
      return;
    }
    setPhase('finale');
    playRewardSound('complete', soundEnabled);
    vibrate([35, 25, 70]);
  }
  function replayResult() {
    setRewardIndex(0);
    setPhase('reveal');
    playRewardSound('reveal', soundEnabled);
  }
  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('reward-sound', next ? 'on' : 'off');
    playRewardSound('tap', next);
  }

  const rarityClass = resultCard?.rarity ?? 'common';
  const activeReward = rewardEvents[rewardIndex];
  const hasRewardSequence = rewardEvents.length > 0;

  return (
    <div className={`pack-screen pack-screen--${phase} pack-screen--rarity-${rarityClass} reward-v3 reward-v3--pack-${packTheme}`}>
      <div className="pack-screen__bg-photo"><PlaceholderArt assetName="pack-opening-background" emoji="🏋️" /></div>
      <div className="pack-screen__dark-bg" />
      <div className="pack-screen__energy-ring" aria-hidden="true" />
      <div className="pack-screen__flash" aria-hidden="true" />
      <button type="button" className="reward-v4__sound-toggle" onClick={toggleSound} aria-label={soundEnabled ? '보상 소리 끄기' : '보상 소리 켜기'}>{soundEnabled ? '🔊' : '🔇'}</button>
      <div className="pack-screen__particles" aria-hidden="true">{PARTICLES.map((particle) => <span key={particle} style={{ '--particle-index': particle } as CSSProperties} />)}</div>

      {phase === 'cinematic' && <div className="reward-v3__legendary-cinematic" role="status" aria-live="assertive"><span className="reward-v3__legendary-crown">♛</span><p>전설의 기운이 깨어납니다</p><strong>LEGENDARY</strong><div className="reward-v3__legendary-countdown" aria-hidden="true"><span>3</span><span>2</span><span>1</span></div></div>}

      {phase === 'finale' && resultCard && owned && (
        <div className="reward-v4__finale">
          <div className="reward-v4__confetti" aria-hidden="true">{CONFETTI.map((item) => <span key={item} style={{ '--i': item } as CSSProperties} />)}</div>
          <section className="reward-v4__finale-card">
            <h2 className="reward-v4__finale-title">보상 획득 완료!</h2>
            <p className="reward-v4__finale-subtitle">오늘의 운동이 새로운 수집 기록이 되었습니다.</p>
            <div className="reward-v4__finale-card-preview"><PlaceholderArt assetName={pickDisplayIllustration(resultCard, owned.starLevel)} emoji="🃏" /></div>
            <h3 className="reward-v4__finale-name">{resultCard.name}</h3>
            <div className="reward-v4__finale-summary"><div><strong>{RARITY_LABEL[resultCard.rarity]}</strong><span>카드 등급</span></div><div><strong>{owned.starLevel}성</strong><span>성장 단계</span></div><div><strong>{rewardEvents.length}</strong><span>추가 성과</span></div></div>
            <div className="reward-v4__finale-actions"><button type="button" className="reward-v4__replay-btn" onClick={replayResult}>결과 다시보기</button><button type="button" className="reward-v4__done-btn" onClick={onDone}>도감으로 이동</button></div>
          </section>
        </div>
      )}

      {phase !== 'reveal' && phase !== 'finale' || !resultCard ? (
        phase !== 'cinematic' && <div className="pack-screen__opening-stage">
          {specialPackLabel && <span className="reward-v3__season-label">{specialPackLabel}</span>}
          <p className="pack-screen__eyebrow">{phase === 'ready' ? '운동 보상 도착!' : phase === 'charging' ? '보상 에너지 충전 중' : '카드가 깨어납니다!'}</p>
          <button type="button" className="pack-screen__pack reward-v3__swipe-pack" onClick={beginOpening} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={() => { pointerStartYRef.current = null; setDragY(0); }} disabled={phase !== 'ready'} style={{ '--drag-y': `${dragY}px` } as CSSProperties}><span className="pack-screen__pack-aura" aria-hidden="true" /><PlaceholderArt assetName={packDef?.packAsset ?? 'pack-basic'} emoji="🎁" label={packDef?.name} /></button>
          <div className="reward-v3__swipe-guide" aria-hidden="true"><span>↑</span><i /></div>
          <div className="pack-screen__charge-track" aria-hidden="true"><span className="pack-screen__charge-fill" /></div>
          <p className="pack-screen__hint">{phase === 'ready' ? '위를 향해 밀거나 터치해서 개봉하세요' : phase === 'charging' ? '조금만 더…!' : '두근두근!'}</p>
        </div>
      ) : phase === 'reveal' && resultCard && (
        <div className={`pack-screen__card pack-screen__card--${resultCard.rarity} reward-v3__result-stage`}>
          <div className="pack-screen__reward-banner"><span>{isNewCard ? 'NEW' : 'POWER UP'}</span><strong>{isNewCard ? '새로운 운동 친구 발견!' : '중복 카드가 성장 에너지로 변했어요!'}</strong></div>
          <div className="pack-screen__card-frame"><span className="pack-screen__card-rays" aria-hidden="true" /><PlaceholderArt assetName={owned ? pickDisplayIllustration(resultCard, owned.starLevel) : resultCard.illustrationAsset} emoji="🃏" />{starGrew && <div className="reward-v2__star-up"><span>STAR UP!</span><strong>{'★'.repeat(owned?.starLevel ?? 1)}</strong></div>}</div>
          <div className="pack-screen__result"><p className="pack-screen__rarity">{RARITY_LABEL[resultCard.rarity]}</p><h2>{resultCard.name}</h2>{owned && <p className="pack-screen__stars">{'★'.repeat(owned.starLevel)} · 총 {owned.count}장</p>}</div>
          {hasRewardSequence && activeReward && <section className={`reward-v3__sequence-card reward-v3__sequence-card--${activeReward.kind}`} key={activeReward.key}><div className="reward-v3__sequence-icon">{activeReward.icon}</div>{activeReward.detail && <span className="reward-v3__sequence-label">{activeReward.detail}</span>}<strong>{activeReward.title}</strong><p>{activeReward.description}</p>{activeReward.kind === 'collection' && <div className="reward-v3__collection-mini-track"><span style={{ width: `${collectionPercent}%` }} /></div>}<div className="reward-v3__sequence-dots">{rewardEvents.map((event, index) => <i key={event.key} className={index === rewardIndex ? 'is-active' : ''} />)}</div></section>}
          <button type="button" className="pack-screen__save-btn reward-v3__next-btn" onClick={hasRewardSequence ? handleRewardNext : () => { setPhase('finale'); playRewardSound('complete', soundEnabled); }}>{hasRewardSequence && rewardIndex < rewardEvents.length - 1 ? `다음 보상 보기 (${rewardIndex + 1}/${rewardEvents.length})` : '최종 보상 확인'}</button>
        </div>
      )}

      {phase !== 'reveal' && phase !== 'ready' && phase !== 'finale' && <button type="button" className="pack-screen__skip-btn" onClick={handleSkip}>연출 건너뛰기</button>}
    </div>
  );
}
