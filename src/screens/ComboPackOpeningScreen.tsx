import { useMemo, useRef, useState } from 'react';
import './RewardEventsV6.css';
import { useGame } from '../store/GameContext';
import { CARDS, CARDS_BY_ID } from '../data/cards';
import { EXERCISES, EXERCISE_CATEGORY_LABELS } from '../data/exercises';
import { PlaceholderArt } from '../components/PlaceholderArt';
import { PackOpeningScreen } from './PackOpeningScreen';
import { calcStarLevel, pickDisplayIllustration } from '../types';
import {
  getComboPresentation,
  getCompletedCategoryForCard,
  summarizeComboResults,
  type ComboResultItem,
  type CompletedCategory,
} from '../game/rewardCombo';

interface ComboPackOpeningScreenProps {
  packId: string;
  onDone: () => void;
}

type ComboStage = 'opening' | 'evolution' | 'category' | 'transition' | 'summary';

const RARITY_LABEL = {
  common: '일반',
  rare: '레어',
  'super-rare': '슈퍼 레어',
  legendary: '레전드',
} as const;

export function ComboPackOpeningScreen({ packId, onDone }: ComboPackOpeningScreenProps) {
  const { state, unopenedPacks } = useGame();
  const [queue] = useState(() => {
    const ids = unopenedPacks.map((pack) => pack.id);
    return [packId, ...ids.filter((id) => id !== packId)];
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stage, setStage] = useState<ComboStage>('opening');
  const [results, setResults] = useState<ComboResultItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<CompletedCategory | null>(null);
  const [activeResult, setActiveResult] = useState<ComboResultItem | null>(null);
  const recordedRef = useRef(new Set<string>());

  const currentPackId = queue[currentIndex] ?? packId;
  const combo = getComboPresentation(currentIndex);
  const summary = useMemo(() => summarizeComboResults(results), [results]);
  const multiplePacks = queue.length > 1;

  function moveToNextOrSummary() {
    if (currentIndex < queue.length - 1) {
      setStage('transition');
      window.setTimeout(() => {
        setCurrentIndex((index) => index + 1);
        setActiveResult(null);
        setActiveCategory(null);
        setStage('opening');
      }, 650);
      return;
    }
    setStage('summary');
  }

  function finishCurrentPack() {
    if (!multiplePacks) {
      onDone();
      return;
    }

    const openedPack = state.grantedPacks.find((pack) => pack.id === currentPackId);
    const card = openedPack?.resultCardId ? CARDS_BY_ID[openedPack.resultCardId] : null;
    const owned = card ? state.ownedCards[card.id] : null;
    if (!openedPack || !card || !owned) {
      moveToNextOrSummary();
      return;
    }

    const previousCount = Math.max(0, owned.count - 1);
    const previousStarLevel = previousCount > 0 ? calcStarLevel(previousCount) : 0;
    const item: ComboResultItem = {
      packId: currentPackId,
      cardId: card.id,
      rarity: card.rarity,
      isNew: owned.count === 1,
      previousStarLevel,
      currentStarLevel: owned.starLevel,
      evolved: owned.starLevel === 4 && previousStarLevel < 4 && Boolean(card.evolvedIllustrationAsset),
    };

    if (!recordedRef.current.has(currentPackId)) {
      recordedRef.current.add(currentPackId);
      setResults((current) => [...current, item]);
    }
    setActiveResult(item);

    const category = getCompletedCategoryForCard(
      card,
      CARDS,
      EXERCISES,
      state.ownedCards,
      item.isNew,
      EXERCISE_CATEGORY_LABELS,
    );
    setActiveCategory(category);

    if (item.currentStarLevel > item.previousStarLevel && item.previousStarLevel > 0) {
      setStage('evolution');
    } else if (category) {
      setStage('category');
    } else {
      moveToNextOrSummary();
    }
  }

  function continueAfterEvolution() {
    if (activeCategory) setStage('category');
    else moveToNextOrSummary();
  }

  const activeCard = activeResult ? CARDS_BY_ID[activeResult.cardId] : null;

  return (
    <div className={`reward-v6 reward-v6--combo-${combo.level} ${combo.isMax ? 'reward-v6--max' : ''}`}>
      {multiplePacks && stage !== 'summary' && (
        <header className="reward-v6__combo-head">
          <div><span>연속 개봉 {currentIndex + 1}/{queue.length}</span><strong>{combo.label}</strong></div>
          <div className="reward-v6__combo-track"><span style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }} /></div>
        </header>
      )}

      {stage === 'opening' && (
        <PackOpeningScreen key={currentPackId} packId={currentPackId} onDone={finishCurrentPack} />
      )}

      {stage === 'transition' && (
        <section className="reward-v6__transition" role="status">
          <span>⚡</span><strong>{getComboPresentation(currentIndex + 1).label}</strong><p>다음 카드팩이 도착합니다!</p>
        </section>
      )}

      {stage === 'evolution' && activeCard && activeResult && (
        <section className={`reward-v6__celebration reward-v6__evolution reward-v6__evolution--${activeResult.currentStarLevel}`}>
          <p>{activeResult.evolved ? 'FINAL EVOLUTION' : 'STAR EVOLUTION'}</p>
          <div className="reward-v6__evolution-art">
            <PlaceholderArt assetName={pickDisplayIllustration(activeCard, activeResult.currentStarLevel)} emoji="🃏" />
          </div>
          <h2>{activeCard.name}</h2>
          <strong>{activeResult.previousStarLevel}성 → {activeResult.currentStarLevel}성</strong>
          <span>{activeResult.evolved ? '특별 일러스트 해금!' : activeResult.currentStarLevel === 3 ? '강화된 카드 테두리가 열렸어요!' : '새로운 별이 빛나기 시작했어요!'}</span>
          <button type="button" onClick={continueAfterEvolution}>축하 결과 계속 보기</button>
        </section>
      )}

      {stage === 'category' && activeCategory && (
        <section className="reward-v6__celebration reward-v6__category">
          <span className="reward-v6__category-icon">🏅</span>
          <p>COLLECTION COMPLETE</p>
          <h2>{activeCategory.label} 도감 완성!</h2>
          <strong>{activeCategory.owned}/{activeCategory.total}</strong>
          <div className="reward-v6__category-cards">
            {activeCategory.cards.map((card) => (
              <div key={card.id}><PlaceholderArt assetName={card.illustrationAsset} emoji="🃏" /><span>{card.name}</span></div>
            ))}
          </div>
          <button type="button" onClick={moveToNextOrSummary}>다음 결과 보기</button>
        </section>
      )}

      {stage === 'summary' && (
        <section className="reward-v6__summary">
          <p>COMBO COMPLETE</p>
          <h2>{results.length}개 카드팩 연속 개봉 완료!</h2>
          <div className="reward-v6__summary-stats">
            <div><strong>{summary.newCards}</strong><span>신규</span></div>
            <div><strong>{summary.duplicates}</strong><span>중복 성장</span></div>
            <div><strong>{summary.starUps}</strong><span>별 성장</span></div>
            <div><strong>{summary.highestRarity ? RARITY_LABEL[summary.highestRarity] : '-'}</strong><span>최고 등급</span></div>
          </div>
          <div className="reward-v6__result-strip">
            {results.map((item) => {
              const card = CARDS_BY_ID[item.cardId];
              const owned = state.ownedCards[item.cardId];
              if (!card || !owned) return null;
              return <div key={item.packId}><PlaceholderArt assetName={pickDisplayIllustration(card, owned.starLevel)} emoji="🃏" /><strong>{card.name}</strong><span>{item.isNew ? 'NEW' : `★${item.currentStarLevel}`}</span></div>;
            })}
          </div>
          <div className="reward-v6__summary-actions">
            <button type="button" onClick={() => setStage('summary')}>결과 다시보기</button>
            <button type="button" onClick={onDone}>도감으로 이동</button>
          </div>
        </section>
      )}
    </div>
  );
}
