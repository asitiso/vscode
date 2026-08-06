import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExerciseTrendChart } from './ExerciseTrendChart';

describe('ExerciseTrendChart', () => {
  it('renders an accessible chart and point values', () => {
    render(<ExerciseTrendChart metric="weight" points={[
      { recordId: 'a', date: '2026-08-01', value: 40 },
      { recordId: 'b', date: '2026-08-03', value: 50 },
    ]} />);
    expect(screen.getByLabelText('최근 최고 중량 선 그래프')).toBeInTheDocument();
    expect(screen.getByText('40kg')).toBeInTheDocument();
    expect(screen.getByText('50kg')).toBeInTheDocument();
  });

  it('supports a single point without an invalid polyline', () => {
    render(<ExerciseTrendChart metric="duration" points={[{ recordId: 'a', date: '2026-08-01', value: 20 }]} />);
    expect(screen.getByText('20분')).toBeInTheDocument();
  });
});
