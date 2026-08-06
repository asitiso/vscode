import { describe, expect, it } from 'vitest';
import { drawCard } from './cardDraw';

describe('milestone card draw', () => {
  it('draws only rare or better cards using milestone boundaries', () => {
    expect(drawCard([], 12, { milestone: true }, () => 0.10).card.rarity).toBe('rare');
    expect(drawCard([], 12, { milestone: true }, () => 0.80).card.rarity).toBe('super-rare');
    expect(drawCard([], 12, { milestone: true }, () => 0.99).card.rarity).toBe('legendary');
  });

  it('does not mark pity as triggered for milestone draws', () => {
    expect(drawCard([], 999, { milestone: true }, () => 0.10).pityTriggered).toBe(false);
  });
});
