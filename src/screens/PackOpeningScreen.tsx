import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import './PackOpeningScreen.css';
import { useGame } from '../store/GameContext';
import { PACKS_BY_ID } from '../data/packs';
import { CARDS_BY_ID } from '../data/cards';
import { PlaceholderArt } from '../components/PlaceholderArt';
import { pickDisplayIllustration } from '../types';

interface PackOpeningScreenProps {
  packId: string;
  onDone: () => void;
}

type OpeningPhase = 'ready' | 'charging' | 'burst' | 'reveal';

const RARITY_LABEL: Record<string, string> = {
  common: '일반',
  rare: '레어',
  'super-rare': '슈퍼 레어',
  legendary: '레전드',
};

const PARTICLES = Array.from({ length: 18 }, (_, index) => index);

export function PackOpeningScreen({ packId, onDone }: PackOpeningScreenProps) {
  const { state, openPack } = useGame();
  const [phase, setPhase] = useState<OpeningPhase>('ready');
  const openedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const pack = state.grantedPacks.find((p) => p.id === packId);
  const packDef = pack ? PACKS_BY_ID[pack.packDefId] : undefined;
  const refreshedPack = state.grantedPacks.find((p) => p.id === packId);
  const resultCard = refreshedPack?.resultCardId ? CARDS_BY_ID[refreshedPack.resultCardId] : null;
  const owned = resultCard ? state.ownedCards[resultCard.id] : null;
  const isNewCard = owned?.count === 1;

  useEffect(() => {
    return () => timersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function vibrate(pattern: number | number[]) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }

  function grantRewardOnce() {
    if (openedRef.current) return;
    openedRef.current = true;
    openPack(packId);
  }

  function handleOpen() {
    if (phase !== 'ready') return;

    grantRewardOnce();
    setPhase('charging');
    vibrate(35);

    timersRef.current.push(
      window.setTimeout(() => {
        setPhase('burst');
        vibrate([45, 35, 80]);
      }, 650),
      window.setTimeout(() => {
        setPhase('reveal');
        vibrate([30, 30, 30]);
      }, 1350),
    );
  }

  function handleSkip() {
    grantRewardOnce();
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setPhase('reveal');
  }

  const rarityClass = resultCard?.rarity ?? 'common';

  return (
    <div className={`pack-screen pack-screen--${phase} pack-screen--rarity-${rarityClass}`}>
      <div className="pack-screen__bg-photo">
        <PlaceholderArt assetName="pack-opening-background" emoji="🏋️" />
      </div>
      <div className="pack-screen__dark-bg" />
      <div className="pack-screen__energy-ring" aria-hidden="true" />
      <div className="pack-screen__flash" aria-hidden="true" />

      <div className="pack-screen__particles" aria-hidden="true">
        {PARTICLES.map((particle) => (
          <span key={particle} style={{ '--particle-index': particle } as CSSProperties} />
        ))}
      </div>

      {phase !== 'reveal' || !resultCard ? (
        <div className="pack-screen__opening-stage">
          <p className="pack-screen__eyebrow">
            {phase === 'ready' ? '운동 보상 도착!' : phase === 'charging' ? '보상 에너지 충전 중' : '카드가 깨어납니다!'}
          </p>

          <button type="button" className="pack-screen__pack" onClick={handleOpen} disabled={phase !== 'ready'}>
            <span className="pack-screen__pack-aura" aria-hidden="true" />
            <PlaceholderArt assetName={packDef?.packAsset ?? 'pack-basic'} emoji="🎁" label={packDef?.name} />
          </button>

          <div className="pack-screen__charge-track" aria-hidden="true">
            <span className="pack-screen__charge-fill" />
          </div>

          <p className="pack-screen__hint">
            {phase === 'ready' ? '팩을 터치해서 직접 열어보세요' : phase === 'charging' ? '조금만 더…!' : '두근두근!'}
          </p>
        </div>
      ) : (
        <div className={`pack-screen__card pack-screen__card--${resultCard.rarity}`}>
          <div className="pack-screen__reward-banner">
            <span>{isNewCard ? 'NEW' : 'POWER UP'}</span>
            <strong>{isNewCard ? '새로운 운동 친구 발견!' : '중복 카드가 성장 에너지로 변했어요!'}</strong>
          </div>

          <div className="pack-screen__card-frame">
            <span className="pack-screen__card-rays" aria-hidden="true" />
            <PlaceholderArt
              assetName={owned ? pickDisplayIllustration(resultCard, owned.starLevel) : resultCard.illustrationAsset}
              emoji="🃏"
            />
          </div>

          <div className="pack-screen__result">
            <p className="pack-screen__rarity">{RARITY_LABEL[resultCard.rarity]}</p>
            <h2>{resultCard.name}</h2>
            {owned && <p className="pack-screen__stars">{'★'.repeat(owned.starLevel)} · 총 {owned.count}장</p>}
            {owned && !isNewCard && owned.starLevel < 4 && (
              <p className="pack-screen__growth-message">다음 별 성장에 한 걸음 더 가까워졌어요!</p>
            )}
            {owned?.starLevel === 4 && owned.count === 10 && resultCard.evolvedIllustrationAsset && (
              <p className="pack-screen__evolved-badge">✨ 특별 일러스트 해금!</p>
            )}
          </div>

          <button type="button" className="pack-screen__save-btn" onClick={onDone}>
            도감에 저장하고 확인하기
          </button>
        </div>
      )}

      {phase !== 'reveal' && phase !== 'ready' && (
        <button type="button" className="pack-screen__skip-btn" onClick={handleSkip}>
          연출 건너뛰기
        </button>
      )}
    </div>
  );
}
