import type { ExerciseTrendMetric, ExerciseTrendPoint } from '../game/exerciseAnalysis';

const META: Record<ExerciseTrendMetric, { title: string; unit: string }> = {
  weight: { title: '최근 최고 중량', unit: 'kg' },
  duration: { title: '최근 운동 시간', unit: '분' },
  reps: { title: '최근 총 반복', unit: '회' },
};

export function ExerciseTrendChart({ metric, points }: { metric: ExerciseTrendMetric; points: ExerciseTrendPoint[] }) {
  const meta = META[metric];
  const width = 320;
  const height = 138;
  const paddingX = 24;
  const paddingY = 24;
  const max = Math.max(1, ...points.map((point) => point.value));
  const min = Math.min(0, ...points.map((point) => point.value));
  const span = Math.max(1, max - min);
  const coordinates = points.map((point, index) => ({
    ...point,
    x: points.length <= 1 ? width / 2 : paddingX + (index * (width - paddingX * 2)) / (points.length - 1),
    y: height - paddingY - ((point.value - min) / span) * (height - paddingY * 2),
  }));
  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <section className="exercise-trend" aria-label={`${meta.title} 추세`}>
      <div className="exercise-section-heading">
        <strong>{meta.title}</strong>
        <span>최근 {points.length}회</span>
      </div>
      {points.length > 0 ? (
        <div className="exercise-trend__chart">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${meta.title} 선 그래프`} preserveAspectRatio="none">
            <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} className="exercise-trend__axis" />
            {coordinates.length > 1 && <polyline points={polyline} className="exercise-trend__line" />}
            {coordinates.map((point) => (
              <g key={point.recordId}>
                <circle cx={point.x} cy={point.y} r="5" className="exercise-trend__dot" />
                <text x={point.x} y={Math.max(14, point.y - 11)} textAnchor="middle" className="exercise-trend__value">{point.value}{meta.unit}</text>
                <text x={point.x} y={height - 5} textAnchor="middle" className="exercise-trend__date">{point.date.slice(5).replace('-', '.')}</text>
              </g>
            ))}
          </svg>
        </div>
      ) : <p className="exercise-analysis__empty-inline">표시할 기록이 없어요.</p>}
    </section>
  );
}
