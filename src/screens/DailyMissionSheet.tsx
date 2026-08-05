import type { DailyMissionDefinition } from '../types';
import './DailyMissionSheet.css';

const DIFFICULTY_LABEL = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
} as const;

interface DailyMissionSheetProps {
  missions: DailyMissionDefinition[];
  onSelect: (missionId: string) => void;
  onClose: () => void;
}

export function DailyMissionSheet({ missions, onSelect, onClose }: DailyMissionSheetProps) {
  return (
    <div className="daily-mission-sheet__backdrop" role="presentation" onClick={onClose}>
      <section
        className="daily-mission-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-mission-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="daily-mission-sheet__handle" />
        <div className="daily-mission-sheet__heading">
          <div>
            <span>DAILY MISSION</span>
            <h2 id="daily-mission-sheet-title">오늘의 미션을 선택하세요</h2>
            <p>선택 후 오늘은 변경할 수 없어요.</p>
          </div>
          <button type="button" aria-label="닫기" onClick={onClose}>×</button>
        </div>

        <div className="daily-mission-sheet__list">
          {missions.map((mission) => (
            <button
              key={mission.id}
              type="button"
              className={`daily-mission-option daily-mission-option--${mission.difficulty}`}
              onClick={() => onSelect(mission.id)}
            >
              <span className="daily-mission-option__difficulty">
                {DIFFICULTY_LABEL[mission.difficulty]}
              </span>
              <strong>{mission.title}</strong>
              <small>{mission.description}</small>
              <b>🎁 보너스팩 1개</b>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
