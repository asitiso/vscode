export type BottomNavTabId = 'home' | 'record' | 'collection' | 'rewards' | 'settings';
export type AppNavigationScreenId = BottomNavTabId | 'pack-opening' | 'group';

export interface BottomNavState {
  visible: boolean;
  active: BottomNavTabId | null;
}

export function getBottomNavState(
  screen: AppNavigationScreenId,
  isKeyboardOpen: boolean,
): BottomNavState {
  return {
    visible: screen !== 'pack-opening' && !isKeyboardOpen,
    active: screen === 'group'
      ? null
      : screen === 'pack-opening'
        ? 'home'
        : screen,
  };
}
