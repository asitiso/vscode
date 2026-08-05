import { useState } from 'react';
import './SettingsScreen.css';
import { useGame } from '../store/GameContext';
import { SELECTABLE_CHARACTERS } from '../data/assetManifest';
import { PlaceholderArt } from '../components/PlaceholderArt';

export function SettingsScreen() {
  const { state, setUserName, setWeeklyGoal, setSelectedCharacter } = useGame();
  const [name, setName] = useState(state.user.name);

  return (
    <div className="settings-screen">
      <div className="settings-screen__header">
        <h1 className="settings-screen__title">설정</h1>
      </div>

      <section className="settings-section">
        <label className="settings-label" htmlFor="user-name">
          사용자 이름
        </label>
        <div className="settings-row">
          <input
            id="user-name"
            className="settings-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="button" className="settings-save-btn" onClick={() => setUserName(name.trim() || state.user.name)}>
            저장
          </button>
        </div>
      </section>

      <section className="settings-section">
        <label className="settings-label">캐릭터 선택</label>
        <div className="character-picker">
          {SELECTABLE_CHARACTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`character-picker__item ${state.user.selectedCharacterId === c.id ? 'character-picker__item--active' : ''}`}
              onClick={() => setSelectedCharacter(c.id)}
            >
              <PlaceholderArt assetName={c.id} emoji="🐾" />
              <span>{c.label}</span>
              {state.user.selectedCharacterId === c.id && <span className="character-picker__badge">✓</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <label className="settings-label">주간 운동 목표 (회/주)</label>
        <div className="chip-row">
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              className={`chip ${state.user.weeklyGoal.targetSessionsPerWeek === n ? 'chip--active' : ''}`}
              onClick={() => setWeeklyGoal(n)}
            >
              {n}회
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
