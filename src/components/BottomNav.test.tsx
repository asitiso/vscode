// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BottomNav } from './BottomNav';

afterEach(() => cleanup());

describe('BottomNav', () => {
  it('활성 탭을 표시하고 다른 탭 선택을 전달한다', () => {
    const onSelect = vi.fn();
    render(<BottomNav active="home" onSelect={onSelect} />);

    const home = screen.getByRole('button', { name: '홈' });
    expect(home).toHaveAttribute('aria-current', 'page');
    expect(home).toHaveClass('bottom-nav__item--active');

    fireEvent.click(screen.getByRole('button', { name: '기록' }));
    expect(onSelect).toHaveBeenCalledWith('record');
  });

  it('그룹 화면용 null 상태에서는 어떤 탭도 활성화하지 않는다', () => {
    render(<BottomNav active={null} onSelect={vi.fn()} />);

    for (const button of screen.getAllByRole('button')) {
      expect(button).not.toHaveAttribute('aria-current');
      expect(button).not.toHaveClass('bottom-nav__item--active');
    }
  });
});
