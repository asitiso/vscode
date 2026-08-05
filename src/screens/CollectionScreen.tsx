import { useMemo, useState } from 'react';
import './CollectionScreen.css';
import { CARDS } from '../data/cards';
import { useGame } from '../store/GameContext';
import { PlaceholderArt } from '../components/PlaceholderArt';
import { pickDisplayIllustration, type CardRarity } from '../types';

const RARITY_LABEL: Record<CardRarity, string> = {
  common: '일반',
  rare: '레어',
  'super-rare': '슈퍼 레어',
  legendary: '레전드',
};

const RARITY_FILTERS: (CardRarity | 'all')[] = ['all', 'common', 'rare', 'super-rare', 'legendary'];

export function CollectionScreen() {
  const { state } = useGame();
  const [rarityFilter, setRarityFilter] = useState<CardRarity | 'all'>('all');

  const filteredCards = useMemo(
    () => CARDS.filter((c) => rarityFilter === 'all' || c.rarity === rarityFilter),
    [rarityFilter],
  );

  const ownedCount = Object.keys(state.ownedCards).length;
  const completion = Math.round((ownedCount / CARDS.length) * 100);

  return (
    <div className="collection-screen">
      <div className="collection-screen__header">
        <h1 className="collection-screen__title">카드 도감</h1>
      </div>

      <div className="collection-stats">
        <div className="collection-stats__item">
          <span className="collection-stats__value">{ownedCount}</span>
          <span className="collection-stats__label">획득</span>
        </div>
        <div className="collection-stats__item">
          <span className="collection-stats__value">{CARDS.length}</span>
          <span className="collection-stats__label">전체</span>
        </div>
        <div className="collection-stats__item">
          <span className="collection-stats__value">{completion}%</span>
          <span className="collection-stats__label">완성률</span>
        </div>
      </div>

      <div className="chip-row">
        {RARITY_FILTERS.map((r) => (
          <button
            key={r}
            type="button"
            className={`chip ${rarityFilter === r ? 'chip--active' : ''}`}
            onClick={() => setRarityFilter(r)}
          >
            {r === 'all' ? '전체' : RARITY_LABEL[r]}
          </button>
        ))}
      </div>

      <div className="card-grid">
        {filteredCards.map((card) => {
          const owned = state.ownedCards[card.id];
          return (
            <div
              key={card.id}
              className={`card-grid__item card-grid__item--${card.rarity} ${!owned ? 'card-grid__item--locked' : ''} ${owned?.starLevel === 4 ? 'card-grid__item--evolved' : ''}`}
            >
              <PlaceholderArt
                assetName={owned ? pickDisplayIllustration(card, owned.starLevel) : card.illustrationAsset}
                emoji={owned ? '🃏' : '❔'}
                label={owned ? card.name : undefined}
              />
              {owned && <span className="card-grid__stars">{'★'.repeat(owned.starLevel)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
