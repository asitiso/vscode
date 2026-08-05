import { useState } from 'react';
import './App.css';
import { GameProvider } from './store/GameContext';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { RecordScreen } from './screens/RecordScreen';
import { PackOpeningScreen } from './screens/PackOpeningScreen';
import { CollectionScreen } from './screens/CollectionScreen';
import { RewardsScreen } from './screens/RewardsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export type ScreenId = 'home' | 'record' | 'pack-opening' | 'collection' | 'rewards' | 'settings';

function AppShell() {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [activePackId, setActivePackId] = useState<string | null>(null);

  function navigate(next: ScreenId, params?: { packId?: string }) {
    if (next === 'pack-opening' && params?.packId) {
      setActivePackId(params.packId);
    }
    setScreen(next);
  }

  const showBottomNav = screen !== 'pack-opening';
  // 하단 네비게이션의 5개 탭에 해당하는 화면만 활성 탭으로 표시한다.
  const activeTab: ScreenId = screen === 'pack-opening' ? 'home' : screen;

  return (
    <div className="app-shell">
      <div className="app-shell__screen">
        {screen === 'home' && <HomeScreen onNavigate={navigate} />}
        {screen === 'record' && <RecordScreen onDone={() => navigate('home')} onNavigate={navigate} />}
        {screen === 'pack-opening' && activePackId && (
          <PackOpeningScreen packId={activePackId} onDone={() => navigate('home')} />
        )}
        {screen === 'collection' && <CollectionScreen />}
        {screen === 'rewards' && <RewardsScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </div>
      {showBottomNav && <BottomNav active={activeTab} onSelect={navigate} />}
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
