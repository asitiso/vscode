import { PlaceholderArt } from '../components/PlaceholderArt';
import { pickDisplayIllustration, type CardDefinition, type OwnedCard } from '../types';

interface CollectionCardProps {
  card: CardDefinition;
  owned?: OwnedCard;
  onSelect: (cardId: string) => void;
}

export function CollectionCard({ card, owned, onSelect }: CollectionCardProps) {
  const accessibleName = owned ? `${card.name} 카드 자세히 보기` : '미발견 카드 자세히 보기';
  const illustration = owned ? pickDisplayIllustration(card, owned.starLevel) : card.illustrationAsset;

  return (
    <button
      type="button"
      className={`card-grid__item card-grid__item--${owned ? card.rarity : 'locked'} ${owned?.starLevel === 4 ? 'card-grid__item--evolved' : ''}`}
      onClick={() => onSelect(card.id)}
      aria-label={accessibleName}
    >
      <span className="card-grid__art" aria-hidden={!owned}>
        <PlaceholderArt
          assetName={illustration}
          emoji={owned ? '🃏' : '❔'}
          label={owned ? card.name : undefined}
          className="card-grid__artwork"
        />
        {owned && <span className="card-grid__rarity">{card.rarity === 'common' ? '일반' : card.rarity === 'rare' ? '레어' : card.rarity === 'super-rare' ? '슈퍼 레어' : '레전드'}</span>}
        {!owned && <span className="card-grid__lock" aria-hidden="true">🔒</span>}
      </span>
      <span className="card-grid__footer">
        <span className="card-grid__name">{owned ? card.name : '미발견'}</span>
        {owned && <span className="card-grid__stars" aria-label={`별 ${owned.starLevel}개`}>{'★'.repeat(owned.starLevel)}</span>}
      </span>
    </button>
  );
}
