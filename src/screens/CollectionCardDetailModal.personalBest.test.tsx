// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CARDS } from '../data/cards';
import { CollectionCardDetailModal } from './CollectionCardDetailModal';

const card = CARDS[0];
const owned = {
  cardId: card.id,
  count: 1,
  starLevel: 1 as const,
  firstObtainedAt: '2026-08-18T00:00:00.000Z',
  lastObtainedAt: '2026-08-18T00:00:00.000Z',
};

describe('CollectionCardDetailModal personal best', () => {
  it('shows the exercise personal best for an owned card', () => {
    render(
      <CollectionCardDetailModal
        card={card}
        owned={owned}
        personalBestLabel="최고 중량 65kg"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('내 최고 기록')).toBeInTheDocument();
    expect(screen.getByText('최고 중량 65kg')).toBeInTheDocument();
  });
});
