import { useRef, useState } from 'react';
import './styles/GameUiTokens.css';
import './styles/GameUiPrimitives.css';
import './App.css';
import './MobileViewport.css';
import './ScreenStability.css';
import './MobileInputLayout.css';
import './styles/GameUiScreens.css';
import './screens/RecordSessionTimer.css';
import { GameProvider } from './store/GameContext';
import { GroupAuthProvider } from './group/GroupAuthContext';
import { BottomNav } from './components/BottomNav';
import { AccountSaveConflictModal } from './components/AccountSaveConflictModal';
import { HomeScreen } from './screens/HomeScreen';
import { RecordScreen } from './screens/RecordScreen';
import { ComboPackOpeningScreen } from './screens/ComboPackOpeningScreen';
import { CollectionScreen } from './screens/CollectionScreen';
import { RewardsScreen } from './screens/RewardsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { GroupEntryScreen } from './screens/group/GroupEntryScreen';
import { CardSetCompletionModal } from './screens/CardSetCompletionModal';
import { useViewportState } from './hooks/useViewportState';
import { useFocusedFieldVisibility } from './hooks/useFocusedFieldVisibility';

export type ScreenId = 'home' | 'record' | 'pack-opening' | 'collection' | 'rewards' | 'settings' | 'group';

function AppShell() {
  const viewport = useViewportState();
  const shellRef = useRef<HTMLDivElement>(null);
  useFocusedFieldVisibility(shellRef);
  const [screen, setScreen] = useState<ScreenId>('home');
  const [activePackId, setActivePackId] = useState<string | null>(null);

  function navigate(next: ScreenId, params?: { packId?: string }) {
    if (next === 'pack-opening' && params?.packId) setActivePackId(params.packId);
    setScreen(next);
  }

  function navigateFromBottomNav(next: ScreenId) {
    if (next === screen) return;
    navigate(next);
  }

  const showBottomNav = screen !== 'pack-opening' && screen !== 'group' && !viewport.isKeyboardOpen;
  const activeTab: ScreenId = screen === 'pack-opening' ? 'home' : screen === 'group' ? 'settings' : screen;

  return (
    <div ref={shellRef} className="app-shell" data-keyboard-open={viewport.isKeyboardOpen ? 'true' : 'false'}>
      <div className="app-shell__screen">
        {screen === 'home' && <HomeScreen onNavigate={navigate} />}
        {screen === 'record' && <RecordScreen onDone={() => navigate('home')} onNavigate={navigate} />}
        {screen === 'pack-opening' && activePackId && (
          <ComboPackOpeningScreen packId={activePackId} onDone={() => navigate('home')} />
        )}
        {screen === 'collection' && <CollectionScreen />}
        {screen === 'rewards' && <RewardsScreen />}
        {screen === 'settings' && <SettingsScreen onNavigate={navigate} />}
        {screen === 'group' && <GroupEntryScreen onBack={() => navigate('settings')} />}
      </div>
      {showBottomNav && <BottomNav active={activeTab} onSelect={navigateFromBottomNav} />}
      <CardSetCompletionModal />
      <AccountSaveConflictModal />
    </div>
  );
}

function App() {
  return (
    <GroupAuthProvider>
      <GameProvider>
        <AppShell />
      </GameProvider>
    </GroupAuthProvider>
  );
}

export default App;
