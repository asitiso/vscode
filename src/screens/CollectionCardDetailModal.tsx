import { useEffect, useId, useRef } from 'react';
import { PlaceholderArt } from '../components/PlaceholderArt';
import { findSetForCard } from '../game/cardSets';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { pickDisplayIllustration, type CardDefinition, type CardRarity, type OwnedCard } from '../types';
import './CollectionCardDetailModal.css';

const RARITY_LABEL: Record<CardRarity, string> = {
  common: '일반',
  rare: '레어',
  'super-rare': '슈퍼 레어',
  legendary: '레전드',
};

interface CollectionCardDetailModalProps {
  card: CardDefinition;
  owned?: OwnedCard;
  onClose: () => void;
}

export function CollectionCardDetailModal({ card, owned, onClose }: CollectionCardDetailModalProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const cardSet = owned ? findSetForCard(card.id) : undefined;
  useBodyScrollLock(true);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="collection-card-modal__backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className={`collection-card-modal ${owned ? `collection-card-modal--${card.rarity}` : 'collection-card-modal--locked'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button ref={closeButtonRef} type="button" className="collection-card-modal__close" onClick={onClose} aria-label="카드 상세 닫기">×</button>

        {owned ? (
          <>
            <div className="collection-card-modal__art">
              <PlaceholderArt assetName={pickDisplayIllustration(card, owned.starLevel)} emoji="🃏" label={card.name} className="collection-card-modal__artwork" />
            </div>
            <div className="collection-card-modal__content">
              <span className="collection-card-modal__rarity">{RARITY_LABEL[card.rarity]}</span>
              <h2 id={titleId}>{card.name}</h2>
              <div className="collection-card-modal__stars" aria-label={`별 ${owned.starLevel}개`}>{'★'.repeat(owned.starLevel)}</div>
              <dl className="collection-card-modal__meta">
                <div><dt>소속 세트</dt><dd>{cardSet?.name ?? '세트 없음'}</dd></div>
                <div><dt>획득 상태</dt><dd>획득 완료</dd></div>
                <div><dt>성장 상태</dt><dd>{owned.starLevel === 4 ? '최대 별 달성' : `별 ${owned.starLevel}단계`}</dd></div>
              </dl>
              <p className="collection-card-modal__description">{card.description}</p>
            </div>
          </>
        ) : (
          <div className="collection-card-modal__locked-content">
            <div className="collection-card-modal__question" aria-hidden="true">?</div>
            <h2 id={titleId}>아직 발견하지 못한 카드입니다</h2>
            <p>운동을 기록하고 보상을 받아<br />새로운 카드를 발견해 보세요.</p>
          </div>
        )}
      </section>
    </div>
  );
}
