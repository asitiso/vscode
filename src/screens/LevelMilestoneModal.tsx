import { useEffect } from 'react';
import { getMilestoneBadge, getMilestoneCosmetic, getMilestoneDialogue } from '../game/levelMilestones';
import './LevelMilestoneModal.css';

interface LevelMilestoneModalProps {
  level: number;
  claimed: boolean;
  characterName?: string;
  onClaim: () => void;
  onOpenPack: () => void;
  onClose: () => void;
}

export function LevelMilestoneModal({
  level,
  claimed,
  characterName,
  onClaim,
  onOpenPack,
  onClose,
}: LevelMilestoneModalProps) {
  const badge = getMilestoneBadge(level);
  const cosmetic = getMilestoneCosmetic(level);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="level-milestone-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="level-milestone-modal" role="dialog" aria-modal="true" aria-labelledby="level-milestone-title">
        <button type="button" className="level-milestone-modal__close" onClick={onClose} aria-label="닫기">×</button>
        <p className="level-milestone-modal__eyebrow">LEVEL MILESTONE</p>
        <h2 id="level-milestone-title">🎉 Lv.{level} 달성!</h2>
        <p className="level-milestone-modal__dialogue">{getMilestoneDialogue(level, characterName)}</p>

        <div className="level-milestone-gift" aria-hidden="true">
          <span className="level-milestone-gift__spark level-milestone-gift__spark--one">✦</span>
          <span className="level-milestone-gift__spark level-milestone-gift__spark--two">✦</span>
          <span className="level-milestone-gift__lid" />
          <span className="level-milestone-gift__box" />
          <span className="level-milestone-gift__ribbon" />
        </div>

        <div className="level-milestone-rewards">
          <div><span>🎁</span><strong>특별 카드팩</strong><small>레어 이상 확정</small></div>
          <div><span>🏅</span><strong>{badge.label}</strong><small>프로필 배지</small></div>
          <div><span>✨</span><strong>{cosmetic.label}</strong><small>캐릭터 장식 해금</small></div>
        </div>

        {claimed ? (
          <button type="button" className="level-milestone-modal__primary" onClick={onOpenPack}>특별 카드팩 열기</button>
        ) : (
          <button type="button" className="level-milestone-modal__primary" onClick={onClaim}>보상 받기</button>
        )}
        <button type="button" className="level-milestone-modal__secondary" onClick={onClose}>홈으로 돌아가기</button>
      </section>
    </div>
  );
}
