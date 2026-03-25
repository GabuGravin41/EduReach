import React, { useState } from 'react';

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  title?: string;
  centerLabel?: string;
  centerValue?: string | number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 200,
  title,
  centerLabel,
  centerValue,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 dark:text-slate-500 text-sm">
        No data available
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 8;
  const innerRadius = outerRadius * 0.6;
  const strokeWidth = outerRadius - innerRadius;
  const r = (outerRadius + innerRadius) / 2;
  const circumference = 2 * Math.PI * r;

  // Build arc segments
  let cumulativeAngle = -Math.PI / 2; // start at 12 o'clock

  const segments = data.map((d, i) => {
    const fraction = d.value / total;
    const angle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const startX = cx + r * Math.cos(startAngle);
    const startY = cy + r * Math.sin(startAngle);
    const endX = cx + r * Math.cos(endAngle);
    const endY = cy + r * Math.sin(endAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    const pathD =
      `M ${startX} ${startY}` +
      ` A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;

    // Percentage label position (midpoint of arc)
    const midAngle = startAngle + angle / 2;
    const labelR = r + (outerRadius - r) * 0.2 + 8;
    const pctLabelR = (outerRadius + r) / 2;
    const pctX = cx + pctLabelR * Math.cos(midAngle);
    const pctY = cy + pctLabelR * Math.sin(midAngle);

    return { d, i, fraction, angle, pathD, pctX, pctY, midAngle };
  });

  const isHovered = (i: number) => hoveredIndex === i;

  return (
    <div className="flex flex-col items-center gap-4">
      {title && (
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 self-start">{title}</p>
      )}

      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={title || 'Donut chart'}
          className="overflow-visible"
        >
          {segments.map(({ d, i, fraction, pathD, pctX, pctY }) => {
            const hovered = isHovered(i);
            const dashArray = fraction * circumference;
            const pct = Math.round(fraction * 100);

            return (
              <g key={i}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={hovered ? strokeWidth + 6 : strokeWidth}
                  strokeLinecap="butt"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                    opacity: hoveredIndex !== null && !hovered ? 0.45 : 1,
                    cursor: 'pointer',
                  }}
                />

                {/* Percentage label — only show if slice is big enough */}
                {pct >= 8 && (
                  <text
                    x={pctX}
                    y={pctY + 4}
                    textAnchor="middle"
                    fontSize={10}
                    fill="white"
                    fontWeight="700"
                    style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                  >
                    {pct}%
                  </text>
                )}
              </g>
            );
          })}

          {/* Center content */}
          {(centerValue !== undefined || centerLabel) && (
            <g>
              {centerValue !== undefined && (
                <text
                  x={cx}
                  y={cy + (centerLabel ? -4 : 6)}
                  textAnchor="middle"
                  fontSize={22}
                  fontWeight="700"
                  className="text-slate-800 dark:text-white"
                  style={{ fill: 'currentColor' }}
                >
                  {centerValue}
                </text>
              )}
              {centerLabel && (
                <text
                  x={cx}
                  y={cy + (centerValue !== undefined ? 16 : 6)}
                  textAnchor="middle"
                  fontSize={11}
                  style={{ fill: '#94a3b8' }}
                >
                  {centerLabel}
                </text>
              )}
            </g>
          )}

          {/* Hover tooltip for the selected segment */}
          {hoveredIndex !== null && (() => {
            const seg = segments[hoveredIndex];
            const labelX = cx + (r + strokeWidth / 2 + 22) * Math.cos(seg.midAngle);
            const labelY = cy + (r + strokeWidth / 2 + 22) * Math.sin(seg.midAngle);
            const pct = Math.round(seg.fraction * 100);
            const tooltipW = 76;
            const tooltipH = 32;
            const tx = Math.max(6, Math.min(labelX - tooltipW / 2, size - tooltipW - 6));
            const ty = Math.max(6, Math.min(labelY - tooltipH / 2, size - tooltipH - 6));
            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={tx} y={ty} width={tooltipW} height={tooltipH} rx={5} fill={seg.d.color} />
                <text x={tx + tooltipW / 2} y={ty + 13} textAnchor="middle" fontSize={10} fill="white" fontWeight="600">
                  {seg.d.label}
                </text>
                <text x={tx + tooltipW / 2} y={ty + 25} textAnchor="middle" fontSize={10} fill="white">
                  {seg.d.value} ({pct}%)
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
        {data.map((d, i) => {
          const pct = Math.round((d.value / total) * 100);
          return (
            <button
              key={i}
              className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              type="button"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: d.color }}
              />
              {d.label}
              <span className="text-slate-400 dark:text-slate-500">({pct}%)</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
