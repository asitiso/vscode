import { useState } from 'react';
import './SettingsScreen.css';
import { useGame } from '../store/GameContext';
import { SELECTABLE_CHARACTERS } from '../data/assetManifest';
import { PlaceholderArt } from '../components/PlaceholderArt';

function formatSavedAt(value: string | null): string {
  if (!value) return '아직 중간 저장하지 않았습니다.';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '저장 시각을 확인할 수 없습니다.';
  return `마지막 중간 저장: ${new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)}`;
}

export function SettingsScreen() {
  const {
    state,
    setUserName,
    setWeeklyGoal,
    setSelectedCharacter,
    saveManualCloudSlot,
    loadManualCloudSlot,
    restoreManualCloudSlot,
    cloudOperationStatus,
    cloudOperationMessage,
    lastCloudSavedAt,
  } = useGame();
  const [name, setName] = useState(state.user.name);
  const busy = cloudOperationStatus === 'saving' || cloudOperationStatus === 'loading';

  async function handleSave(): Promise<void> {
    try {
      await saveManualCloudSlot();
    } catch {
      // GameContext가 사용자에게 보여줄 오류 문구를 관리한다.
    }
  }

  async function handleRestore(): Promise<void> {
    try {
      const record = await loadManualCloudSlot();
      if (!record) return;
      const savedAt = formatSavedAt(record.clientSavedAt).replace('마지막 중간 저장: ', '');
      const confirmed = window.confirm(
        `${savedAt}의 중간 저장으로 현재 로컬 데이터를 덮어쓸까요?\n이 작업은 되돌릴 수 없습니다.`,
      );
      if (confirmed) restoreManualCloudSlot(record);
    } catch {
      // GameContext가 사용자에게 보여줄 오류 문구를 관리한다.
    }
  }

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

      <section className="settings-section settings-section--cloud" aria-labelledby="cloud-save-title">
        <div className="cloud-save__heading">
          <div>
            <h2 id="cloud-save-title" className="settings-label cloud-save__title">데이터 관리</h2>
            <p className="cloud-save__description">
              평소 기록은 이 기기에 자동 저장됩니다. 필요할 때만 Supabase에 중간 저장하세요.
            </p>
          </div>
          <span className="cloud-save__badge">로그인 없음</span>
        </div>

        <p className="cloud-save__time">{formatSavedAt(lastCloudSavedAt)}</p>

        <div className="cloud-save__actions">
          <button
            type="button"
            className="cloud-save__button cloud-save__button--primary"
            onClick={handleSave}
            disabled={busy}
          >
            {cloudOperationStatus === 'saving' ? '저장 중…' : '중간 저장'}
          </button>
          <button
            type="button"
            className="cloud-save__button"
            onClick={handleRestore}
            disabled={busy}
          >
            {cloudOperationStatus === 'loading' ? '확인 중…' : '중간 저장 불러오기'}
          </button>
        </div>

        {cloudOperationMessage && (
          <p
            className={`cloud-save__status cloud-save__status--${cloudOperationStatus}`}
            role={cloudOperationStatus === 'error' ? 'alert' : 'status'}
          >
            {cloudOperationMessage}
          </p>
        )}
        <p className="cloud-save__notice">
          브라우저 데이터가 삭제되면 익명 저장키도 함께 삭제되어 이 백업을 다시 찾을 수 없습니다.
        </p>
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
