import { useState } from 'react';
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

const RARITY_LABEL: Record<string, string> = {
  common: '일반',
  rare: '레어',
  'super-rare': '슈퍼 레어',
  legendary: '레전드',
};

export function PackOpeningScreen({ packId, onDone }: PackOpeningScreenProps) {
  const { state, openPack } = useGame();
  const [opened, setOpened] = useState(false);

  const pack = state.grantedPacks.find((p) => p.id === packId);
  const packDef = pack ? PACKS_BY_ID[pack.packDefId] : undefined;

  function handleTap() {
    if (opened) return;
    openPack(packId);
    setOpened(true);
  }

  // openPack 이후 최신 상태에서 결과 카드를 다시 찾는다.
  const refreshedPack = state.grantedPacks.find((p) => p.id === packId);
  const resultCard = refreshedPack?.resultCardId ? CARDS_BY_ID[refreshedPack.resultCardId] : null;
  const owned = resultCard ? state.ownedCards[resultCard.id] : null;

  return (
    <div className="pack-screen">
      <div className="pack-screen__bg-photo">
        <PlaceholderArt assetName="pack-opening-background" emoji="🏋️" />
      </div>
      <div className="pack-screen__dark-bg" />

      {!opened || !resultCard ? (
        <button type="button" className="pack-screen__pack" onClick={handleTap}>
          <PlaceholderArt assetName={packDef?.packAsset ?? 'pack-basic'} emoji="🎁" label={packDef?.name} />
          <p className="pack-screen__hint">탭해서 카드팩 개봉하기</p>
        </button>
      ) : (
        <div className={`pack-screen__card pack-screen__card--${resultCard.rarity}`}>
          <PlaceholderArt
            assetName={owned ? pickDisplayIllustration(resultCard, owned.starLevel) : resultCard.illustrationAsset}
            emoji="🃏"
          />
          <div className="pack-screen__result">
            <p className="pack-screen__rarity">{RARITY_LABEL[resultCard.rarity]}</p>
            <h2>{resultCard.name}</h2>
            {owned && <p className="pack-screen__stars">{'★'.repeat(owned.starLevel)} ({owned.count}장)</p>}
            {owned?.starLevel === 4 && owned.count === 10 && resultCard.evolvedIllustrationAsset && (
              <p className="pack-screen__evolved-badge">✨ 업그레이드 일러스트 해금!</p>
            )}
          </div>
          <button type="button" className="pack-screen__save-btn" onClick={onDone}>
            도감에 저장
          </button>
        </div>
      )}
    </div>
  );
}
