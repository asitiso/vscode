import { useState } from 'react';
import './App.css';
import { GameProvider, useGame } from './store/GameContext';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { RecordScreen } from './screens/RecordScreen';
import { ComboPackOpeningScreen } from './screens/ComboPackOpeningScreen';
import { CollectionScreen } from './screens/CollectionScreen';
import { RewardsScreen } from './screens/RewardsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CardSetCompletionModal } from './screens/CardSetCompletionModal';

export type ScreenId = 'home' | 'record' | 'pack-opening' | 'collection' | 'rewards' | 'settings';

function AppShell() {
  const { canSelectDailyMission } = useGame();
  const [screen, setScreen] = useState<ScreenId>('home');
  const [activePackId, setActivePackId] = useState<string | null>(null);

  function navigate(next: ScreenId, params?: { packId?: string }) {
    if (next === 'pack-opening' && params?.packId) setActivePackId(params.packId);
    setScreen(next);
  }

  function navigateFromBottomNav(next: ScreenId) {
    if (next === 'record' && canSelectDailyMission) {
      setScreen('home');
      return;
    }
    navigate(next);
  }

  const showBottomNav = screen !== 'pack-opening';
  const activeTab: ScreenId = screen === 'pack-opening' ? 'home' : screen;

  return (
    <div className="app-shell">
      <div className="app-shell__screen">
        {screen === 'home' && <HomeScreen onNavigate={navigate} />}
        {screen === 'record' && <RecordScreen onDone={() => navigate('home')} onNavigate={navigate} />}
        {screen === 'pack-opening' && activePackId && (
          <ComboPackOpeningScreen packId={activePackId} onDone={() => navigate('home')} />
        )}
        {screen === 'collection' && <CollectionScreen />}
        {screen === 'rewards' && <RewardsScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </div>
      {showBottomNav && <BottomNav active={activeTab} onSelect={navigateFromBottomNav} />}
      <CardSetCompletionModal />
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <AppShell />
    </GameProvider>
  );
}

export default App;
