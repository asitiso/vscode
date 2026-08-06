import './CardSetCompletionModal.css';
import { CARD_SETS_BY_ID } from '../game/cardSets';
import { CARDS_BY_ID } from '../data/cards';
import { useGame } from '../store/GameContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export function CardSetCompletionModal() {
  const { state, clearRecentCompletedSet } = useGame();
  const setId = state.recentCompletedSetId;
  const set = setId ? CARD_SETS_BY_ID[setId] : undefined;
  useBodyScrollLock(Boolean(set));

  if (!set) return null;

  return (
    <div className="set-complete-modal" role="dialog" aria-modal="true" aria-labelledby="set-complete-title">
      <div className="set-complete-modal__panel">
        <div className="set-complete-modal__header">
          <span className="set-complete-modal__sparkle">✨</span>
          <span className="set-complete-modal__kicker">COLLECTION COMPLETE</span>
          <h2 id="set-complete-title">세트 완성!</h2>
          <strong>{set.name}</strong>
        </div>
        <div className="set-complete-modal__content">
          <div className="set-complete-modal__cards">
            {set.cardIds.map((cardId) => <span key={cardId}>{CARDS_BY_ID[cardId]?.name}</span>)}
          </div>
          <p>칭호 <b>“{set.title}”</b>와 특별상자가 도착했어요!</p>
          <button type="button" onClick={clearRecentCompletedSet}>특별상자 확인하기</button>
        </div>
      </div>
    </div>
  );
}
