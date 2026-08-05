import './RewardsScreen.css';
import { useGame } from '../store/GameContext';

export function RewardsScreen() {
  const { weeklyProgress } = useGame();

  const rewards = [
    { id: 'r1', name: '특별 카드 테두리', locked: weeklyProgress.streak < 1 },
    { id: 'r2', name: '홈 화면 배경', locked: weeklyProgress.streak < 2 },
    { id: 'r3', name: '프로필 배지', locked: weeklyProgress.streak < 4 },
    { id: 'r4', name: '카드 뒷면 디자인', locked: weeklyProgress.streak < 8 },
  ];

  return (
    <div className="rewards-screen">
      <div className="rewards-screen__header">
        <h1 className="rewards-screen__title">보상</h1>
        <p className="rewards-screen__desc">연속 주간 목표 달성으로 특별 보상을 해금하세요.</p>
      </div>
      <div className="rewards-list">
        {rewards.map((r) => (
          <div key={r.id} className={`rewards-item ${r.locked ? 'rewards-item--locked' : ''}`}>
            <span className="rewards-item__icon">{r.locked ? '🔒' : '🎁'}</span>
            <span>{r.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
