import './HomeScreen.css';
import { useGame } from '../store/GameContext';
import { PlaceholderArt } from '../components/PlaceholderArt';
import { CARDS_BY_ID } from '../data/cards';
import { PACKS_BY_ID } from '../data/packs';
import { pickDisplayIllustration } from '../types';
import type { ScreenId } from '../App';

interface HomeScreenProps {
  onNavigate: (screen: ScreenId, params?: { packId?: string }) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { state, todayLogged, unopenedPacks, weeklyProgress } = useGame();

  const recentCards = Object.values(state.ownedCards)
    .sort((a, b) => b.lastObtainedAt.localeCompare(a.lastObtainedAt))
    .slice(0, 3);

  const nextPack = unopenedPacks[0];
  const goalTarget = state.user.weeklyGoal.targetSessionsPerWeek;
  const goalProgressPct = Math.min(100, Math.round((weeklyProgress.sessionsThisWeek / goalTarget) * 100));

  return (
    <div className="home-screen">
      {/* z-index 0: 배경 */}
      <div className="home-screen__layer home-screen__bg">
        <PlaceholderArt assetName="home-background" emoji="🌤️" />
      </div>

      {/* z-index 40: 상단 정보 패널 */}
      <div className="home-screen__layer home-screen__top-panel">
        <div className="hud-badge hud-badge--level">
          <span className="hud-badge__icon">⭐</span>
          <div className="hud-badge__text">
            <span className="hud-badge__title">Lv.{state.user.level}</span>
            <span className="hud-badge__subtitle">{state.user.name}</span>
          </div>
        </div>
        <div className="hud-badge hud-badge--streak">
          <span className="hud-badge__icon">🔥</span>
          <div className="hud-badge__text">
            <span className="hud-badge__title">{weeklyProgress.streak}주 연속</span>
            <span className="hud-badge__subtitle">주간 목표 달성</span>
          </div>
        </div>
      </div>

      {/* z-index 40: 이번 주 운동 정보 패널 (상단) */}
      <div className="home-screen__layer home-screen__info-panel">
        <div className="info-row">
          <span>이번 주 운동</span>
          <span className="info-row__value">
            {weeklyProgress.sessionsThisWeek} / {goalTarget}회
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-track__fill" style={{ width: `${goalProgressPct}%` }} />
        </div>
        {weeklyProgress.remainingThisWeek > 0 ? (
          <div className="info-row info-row--muted">
            다음 보상까지 {weeklyProgress.remainingThisWeek}회 남음
          </div>
        ) : (
          <div className="info-row info-row--success">이번 주 목표 달성! 🎉</div>
        )}

        {recentCards.length > 0 && (
          <div className="recent-cards">
            {recentCards.map((owned) => {
              const card = CARDS_BY_ID[owned.cardId];
              return (
                <div key={owned.cardId} className={`recent-card recent-card--${card.rarity}`}>
                  <PlaceholderArt assetName={pickDisplayIllustration(card, owned.starLevel)} emoji="🃏" />
                  <span className="recent-card__stars">{'★'.repeat(owned.starLevel)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* z-index 50: 오늘 운동 기록하기 버튼 (상단) */}
      <button
        type="button"
        className="home-screen__layer home-screen__cta"
        onClick={() => onNavigate('record')}
      >
        <span className="home-screen__cta-icon">💪</span>
        {todayLogged ? '오늘 운동 추가 기록하기' : '오늘 운동 기록하기'}
      </button>

      {/* z-index 20: 메인 캐릭터 (하단) */}
      <div className="home-screen__layer home-screen__character">
        <span className="character-platform" />
        <PlaceholderArt assetName={state.user.selectedCharacterId} emoji="🏃" label="오늘의 캐릭터" />
      </div>

      {/* z-index 30: 오늘의 카드팩 (하단) */}
      {nextPack && (
        <button
          type="button"
          className="home-screen__layer home-screen__pack"
          onClick={() => onNavigate('pack-opening', { packId: nextPack.id })}
        >
          <span className="home-screen__pack-glow" />
          <span className="home-screen__pack-badge">NEW</span>
          <PlaceholderArt
            assetName={PACKS_BY_ID[nextPack.packDefId]?.packAsset ?? 'pack-basic'}
            emoji="🎁"
            label={PACKS_BY_ID[nextPack.packDefId]?.name}
          />
        </button>
      )}
    </div>
  );
}
