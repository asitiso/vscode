import type { PackSource } from '../types';

function badgeForSource(source: PackSource | undefined): string {
  if (source === 'weekly-goal') return 'WEEK';
  if (source === 'set-completion') return 'SET';
  if (source === 'level-milestone') return 'LV';
  return 'NEW';
}

export function HomeUnopenedPackIndicator({
  count,
  source,
}: {
  count: number;
  source: PackSource | undefined;
}) {
  return (
    <>
      <span className="home-screen__pack-badge">{badgeForSource(source)}</span>
      <span className="home-screen__pack-count">
        <strong>카드팩 {Math.max(0, count)}개</strong>
        <small>열어볼 보상</small>
      </span>
    </>
  );
}
