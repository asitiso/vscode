import { useEffect, useId, useRef } from 'react';
import { PlaceholderArt } from '../components/PlaceholderArt';
import { findSetForCard } from '../game/cardSets';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { STAR_THRESHOLDS, pickDisplayIllustration, type CardDefinition, type CardRarity, type OwnedCard } from '../types';
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
  acquisitionLabel?: string;
  onClose: () => void;
}

function getNextGrowthText(owned: OwnedCard): string {
  if (owned.starLevel >= 4) return '최대 레벨을 달성했어요!';
  const nextStar = (owned.starLevel + 1) as 2 | 3 | 4;
  const remaining = Math.max(0, STAR_THRESHOLDS[nextStar] - owned.count);
  return `${remaining}장 더 모으면 ${nextStar}성으로 레벨 업!`;
}

export function CollectionCardDetailModal({ card, owned, acquisitionLabel, onClose }: CollectionCardDetailModalProps) {
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
          <div className="collection-card-modal__layout">
            <div className="collection-card-modal__preview">
              <span className="collection-card-modal__preview-rarity">{RARITY_LABEL[card.rarity]}</span>
              <div className="collection-card-modal__art">
                <PlaceholderArt assetName={pickDisplayIllustration(card, owned.starLevel)} emoji="🃏" label={card.name} className="collection-card-modal__artwork" />
              </div>
              <div className="collection-card-modal__preview-footer">
                <strong>{card.name}</strong>
                <span aria-hidden="true">{'★'.repeat(owned.starLevel)}</span>
              </div>
            </div>

            <div className="collection-card-modal__content">
              <span className="collection-card-modal__rarity">{RARITY_LABEL[card.rarity]}</span>
              <h2 id={titleId}>{card.name}</h2>
              <div className="collection-card-modal__stars" aria-label={`별 ${owned.starLevel}개, 최대 4개`}>
                {Array.from({ length: 4 }, (_, index) => (
                  <span key={index} className={index < owned.starLevel ? 'is-filled' : ''}>★</span>
                ))}
                <small>({owned.starLevel}/4)</small>
              </div>

              <div className="collection-card-modal__set-box">
                <span aria-hidden="true">🛡️</span>
                <div><small>소속 세트</small><strong>{cardSet?.name ?? '세트 없음'}</strong></div>
              </div>

              <section className="collection-card-modal__section">
                <strong>카드 설명</strong>
                <p>{card.description}</p>
              </section>

              <section className="collection-card-modal__section collection-card-modal__acquisition">
                <strong>획득 정보</strong>
                <p>{acquisitionLabel ?? '획득 완료'} · 총 {owned.count}장</p>
              </section>

              <div className="collection-card-modal__growth">
                <span aria-hidden="true">★</span>
                <div><strong>{owned.starLevel >= 4 ? '최대 성장 완료' : '다음 별 레벨까지'}</strong><p>{getNextGrowthText(owned)}</p></div>
              </div>
            </div>
          </div>
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
