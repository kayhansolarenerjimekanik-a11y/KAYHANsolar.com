import type { DailyCount } from "@/lib/analytics/types";

interface Props {
  data: DailyCount[];
  label: string;
}

const WIDTH = 600;
const HEIGHT = 160;
const PADDING = { top: 12, right: 12, bottom: 24, left: 32 };

export function AnalyticsChart({ data, label }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-elevated p-6 text-center text-sm text-muted">
        Henüz veri yok.
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.count));
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const total = data.reduce((s, d) => s + d.count, 0);

  const points = data.map((d, i) => {
    const x = PADDING.left + i * stepX;
    const y = PADDING.top + innerH - (d.count / max) * innerH;
    return { x, y, label: d.date, value: d.count };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${path} L ${points[points.length - 1].x.toFixed(1)} ${
    HEIGHT - PADDING.bottom
  } L ${points[0].x.toFixed(1)} ${HEIGHT - PADDING.bottom} Z`;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <header className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{total}</p>
      </header>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-40 w-full"
        aria-label={`${label} grafiği`}
        role="img"
      >
        <path d={areaPath} fill="rgb(199 255 0 / 0.15)" />
        <path d={path} fill="none" stroke="rgb(199 255 0)" strokeWidth={2} />
        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r={2.5} fill="rgb(199 255 0)">
            <title>
              {p.label}: {p.value}
            </title>
          </circle>
        ))}
        <line
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={HEIGHT - PADDING.bottom}
          y2={HEIGHT - PADDING.bottom}
          stroke="currentColor"
          strokeOpacity={0.15}
        />
        <text
          x={PADDING.left}
          y={HEIGHT - 4}
          fontSize="10"
          fill="currentColor"
          fillOpacity={0.5}
        >
          {data[0]?.date}
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - 4}
          textAnchor="end"
          fontSize="10"
          fill="currentColor"
          fillOpacity={0.5}
        >
          {data[data.length - 1]?.date}
        </text>
      </svg>
    </div>
  );
}
