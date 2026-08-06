import { useMemo, useRef, useState } from 'react';
import './CollectionScreen.css';
import { CARDS } from '../data/cards';
import { useGame } from '../store/GameContext';
import { CARD_SETS } from '../game/cardSets';
import type { CardRarity } from '../types';
import { CollectionCard } from './CollectionCard';
import { CollectionCardDetailModal } from './CollectionCardDetailModal';

const RARITY_LABEL: Record<CardRarity, string> = {
  common: '일반',
  rare: '레어',
  'super-rare': '슈퍼 레어',
  legendary: '레전드',
};
const RARITY_FILTERS: (CardRarity | 'all')[] = ['all', 'common', 'rare', 'super-rare', 'legendary'];

type SetFilter = 'all' | (typeof CARD_SETS)[number]['id'];

export function CollectionScreen() {
  const { state, cardSetProgress, dailyCardSet } = useGame();
  const [rarityFilter, setRarityFilter] = useState<CardRarity | 'all'>('all');
  const [setFilter, setSetFilter] = useState<SetFilter>('all');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const selectedButtonRef = useRef<HTMLElement | null>(null);
  const selectedSet = setFilter === 'all' ? undefined : CARD_SETS.find((set) => set.id === setFilter);
  const selectedProgress = selectedSet
    ? cardSetProgress.find((progress) => progress.set.id === selectedSet.id)
    : undefined;

  const filteredCards = useMemo(
    () => CARDS.filter((card) => {
      const rarityMatches = rarityFilter === 'all' || card.rarity === rarityFilter;
      const setMatches = !selectedSet || selectedSet.cardIds.includes(card.id);
      return rarityMatches && setMatches;
    }),
    [rarityFilter, selectedSet],
  );

  const selectedCard = selectedCardId ? CARDS.find((card) => card.id === selectedCardId) : undefined;
  const selectedOwned = selectedCard ? state.ownedCards[selectedCard.id] : undefined;
  const ownedCount = Object.keys(state.ownedCards).length;
  const completion = Math.round((ownedCount / CARDS.length) * 100);

  const openCard = (cardId: string) => {
    selectedButtonRef.current = document.activeElement as HTMLElement | null;
    setSelectedCardId(cardId);
  };

  const closeCard = () => {
    setSelectedCardId(null);
    window.requestAnimationFrame(() => selectedButtonRef.current?.focus());
  };

  return (
    <div className="collection-screen">
      <div className="collection-screen__header"><h1 className="collection-screen__title">카드 도감</h1></div>

      <div className="collection-stats">
        <div className="collection-stats__item"><span className="collection-stats__value">{ownedCount}</span><span className="collection-stats__label">획득</span></div>
        <div className="collection-stats__item"><span className="collection-stats__value">{CARDS.length}</span><span className="collection-stats__label">전체</span></div>
        <div className="collection-stats__item"><span className="collection-stats__value">{completion}%</span><span className="collection-stats__label">완성률</span></div>
      </div>

      <div className="collection-set-filter" aria-label="카드 세트 필터">
        <button type="button" className={`chip ${setFilter === 'all' ? 'chip--active' : ''}`} onClick={() => setSetFilter('all')}>전체</button>
        {CARD_SETS.map((set) => (
          <button
            key={set.id}
            type="button"
            className={`chip ${setFilter === set.id ? 'chip--active' : ''}`}
            onClick={() => setSetFilter(set.id)}
          >
            {set.shortLabel}{dailyCardSet.id === set.id ? ' UP' : ''}
          </button>
        ))}
      </div>

      {selectedProgress && (
        <section className="collection-set-summary">
          <div className="collection-set-summary__top">
            <strong>{selectedProgress.set.name}</strong>
            <span className="collection-set-summary__badge">
              {selectedProgress.complete ? '완성' : `${selectedProgress.ownedCount} / ${selectedProgress.totalCount}`}
            </span>
          </div>
          <span className="collection-set-summary__title">칭호 · {selectedProgress.set.title}</span>
          <div className="collection-set-summary__track" role="progressbar" aria-label={`${selectedProgress.set.name} 진행률`} aria-valuemin={0} aria-valuemax={4} aria-valuenow={selectedProgress.ownedCount}>
            <span style={{ width: `${selectedProgress.ownedCount * 25}%` }} />
          </div>
        </section>
      )}

      <div className="chip-row">
        {RARITY_FILTERS.map((rarity) => (
          <button key={rarity} type="button" className={`chip ${rarityFilter === rarity ? 'chip--active' : ''}`} onClick={() => setRarityFilter(rarity)}>
            {rarity === 'all' ? '전체 등급' : RARITY_LABEL[rarity]}
          </button>
        ))}
      </div>

      <div className="card-grid">
        {filteredCards.map((card) => (
          <CollectionCard key={card.id} card={card} owned={state.ownedCards[card.id]} onSelect={openCard} />
        ))}
      </div>

      {selectedCard && (
        <CollectionCardDetailModal card={selectedCard} owned={selectedOwned} onClose={closeCard} />
      )}
    </div>
  );
}
