import './BottomNav.css';
import { PlaceholderArt } from './PlaceholderArt';
import type { ScreenId } from '../App';

const TABS: { id: ScreenId; label: string; emoji: string; asset: string }[] = [
  { id: 'home', label: '홈', emoji: '🏠', asset: 'nav-home' },
  { id: 'record', label: '기록', emoji: '📝', asset: 'nav-record' },
  { id: 'collection', label: '도감', emoji: '🗂️', asset: 'nav-collection' },
  { id: 'rewards', label: '보상', emoji: '🎁', asset: 'nav-rewards' },
  { id: 'settings', label: '설정', emoji: '⚙️', asset: 'nav-settings' },
];

interface BottomNavProps {
  active: ScreenId;
  onSelect: (id: ScreenId) => void;
}

export function BottomNav({ active, onSelect }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`bottom-nav__item ${isActive ? 'is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              if (!isActive) onSelect(tab.id);
            }}
          >
            <span className="bottom-nav__icon-wrap">
              <PlaceholderArt assetName={tab.asset} emoji={tab.emoji} className="bottom-nav__icon" />
            </span>
            <span className="bottom-nav__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
