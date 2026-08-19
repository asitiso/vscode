// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomeUnopenedPackIndicator } from './HomeUnopenedPackIndicator';

describe('HomeUnopenedPackIndicator', () => {
  it('shows the total unopened count and weekly reward badge', () => {
    render(<HomeUnopenedPackIndicator count={3} source="weekly-goal" />);

    expect(screen.getByText('WEEK')).toBeInTheDocument();
    expect(screen.getByText('카드팩 3개')).toBeInTheDocument();
    expect(screen.getByText('열어볼 보상')).toBeInTheDocument();
  });

  it('keeps existing source badges for normal, set and level packs', () => {
    const { rerender } = render(<HomeUnopenedPackIndicator count={1} source="workout" />);
    expect(screen.getByText('NEW')).toBeInTheDocument();

    rerender(<HomeUnopenedPackIndicator count={1} source="set-completion" />);
    expect(screen.getByText('SET')).toBeInTheDocument();

    rerender(<HomeUnopenedPackIndicator count={1} source="level-milestone" />);
    expect(screen.getByText('LV')).toBeInTheDocument();
  });
});
