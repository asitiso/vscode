import { describe, expect, it } from 'vitest';
import type { OwnedCard } from '../types';
import {
  CARD_SETS,
  getAllCardSetProgress,
  getDailyCardSet,
  getNewlyCompletedSetIds,
  selectFeaturedProgress,
} from './cardSets';

function owned(...cardIds: string[]): Record<string, OwnedCard> {
  return Object.fromEntries(
    cardIds.map((cardId) => [
      cardId,
      {
        cardId,
        count: 1,
        starLevel: 1 as const,
        firstObtainedAt: '2026-08-05T00:00:00.000Z',
        lastObtainedAt: '2026-08-05T00:00:00.000Z',
      },
    ]),
  );
}

describe('CARD_SETS', () => {
  it('24장의 기본 카드를 중복 없이 6세트로 구성한다', () => {
    expect(CARD_SETS).toHaveLength(6);
    expect(CARD_SETS.every((set) => set.cardIds.length === 4)).toBe(true);
    const ids = CARD_SETS.flatMap((set) => set.cardIds);
    expect(new Set(ids).size).toBe(24);
  });

  it('보유 카드에서 세트 진행률을 계산한다', () => {
    const progress = getAllCardSetProgress(owned('card-treadmill', 'card-stationary-bike'))[0];
    expect(progress.ownedCount).toBe(2);
    expect(progress.complete).toBe(false);
    expect(progress.missingCardIds).toHaveLength(2);
  });

  it('획득 전에는 미완성이고 획득 후 완성된 세트만 찾는다', () => {
    const set = CARD_SETS[0];
    const before = owned(...set.cardIds.slice(0, 3));
    const after = owned(...set.cardIds);
    expect(getNewlyCompletedSetIds(before, after, [])).toEqual([set.id]);
    expect(getNewlyCompletedSetIds(before, after, [set.id])).toEqual([]);
  });

  it('같은 날짜에는 같은 오늘의 세트를 반환한다', () => {
    expect(getDailyCardSet('2026-08-05').id).toBe(getDailyCardSet('2026-08-05').id);
  });

  it('완성까지 가장 적게 남은 세트를 홈 추천으로 고른다', () => {
    const target = CARD_SETS[3];
    const cards = owned(...target.cardIds.slice(0, 3), ...CARD_SETS[0].cardIds.slice(0, 1));
    expect(selectFeaturedProgress(cards, CARD_SETS[0].id).set.id).toBe(target.id);
  });
});
