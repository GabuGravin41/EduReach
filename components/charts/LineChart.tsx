import React, { useState, useId } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  title?: string;
  unit?: string;
  fill?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  color = '#3b82f6',
  height = 260,
  title,
  unit = '',
  fill = true,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const uid = useId().replace(/:/g, '');
  const gradientId = `linechart-grad-${uid}`;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 dark:text-slate-500 text-sm">
        No data available
      </div>
    );
  }

  // Single-point: render a simple dot, no line or area path needed
  if (data.length === 1) {
    return (
      <div className="w-full">
        {title && (
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">{title}</p>
        )}
        <div className="flex flex-col items-center justify-center" style={{ height }}>
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: color }}
          />
          <p className="text-xs text-slate-400 mt-2">
            {data[0].label}: {data[0].value}{unit}
          </p>
        </div>
      </div>
    );
  }

  const paddingLeft = 48;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const viewBoxWidth = 600;
  const viewBoxHeight = height;
  const chartWidth = viewBoxWidth - paddingLeft - paddingRight;
  const chartHeight = viewBoxHeight - paddingTop - paddingBottom;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;
  const yMax = maxValue + range * 0.12;
  const yMin = Math.max(0, minValue - range * 0.1);
  const yRange = yMax - yMin;

  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round(yMin + (yRange / tickCount) * i)
  );

  const getX = (i: number) =>
    paddingLeft + (i / Math.max(data.length - 1, 1)) * chartWidth;
  const getY = (value: number) =>
    paddingTop + chartHeight - ((value - yMin) / yRange) * chartHeight;

  // Smooth cubic bezier path
  const buildPath = (pts: { x: number; y: number }[]): string => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cp1x = prev.x + (curr.x - prev.x) * 0.4;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) * 0.4;
      const cp2y = curr.y;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
    }
    return d;
  };

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value) }));
  const linePath = buildPath(points);

  // Area path: line path + close down to baseline
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x},${paddingTop + chartHeight}` +
    ` L ${points[0].x},${paddingTop + chartHeight} Z`;

  return (
    <div className="w-full">
      {title && (
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">{title}</p>
      )}
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full overflow-visible"
        style={{ height }}
        role="img"
        aria-label={title || 'Line chart'}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {ticks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={viewBoxWidth - paddingRight}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={1}
                className="text-slate-900 dark:text-white"
              />
              <text
                x={paddingLeft - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                style={{ fill: '#94a3b8' }}
              >
                {tick}
                {unit}
              </text>
            </g>
          );
        })}

        {/* X axis */}
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={viewBoxWidth - paddingRight}
          y2={paddingTop + chartHeight}
          stroke="#cbd5e1"
          strokeWidth={1}
        />

        {/* Area fill */}
        {fill && (
          <path
            d={areaPath}
            fill={`url(#${gradientId})`}
            style={{ transition: 'opacity 0.3s' }}
          />
        )}

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />

        {/* Data point dots + hover areas */}
        {data.map((d, i) => {
          const x = points[i].x;
          const y = points[i].y;
          const isHovered = hoveredIndex === i;
          return (
            <g key={i}>
              {/* Invisible wide hit area */}
              <rect
                x={x - 16}
                y={paddingTop}
                width={32}
                height={chartHeight + 10}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: 'crosshair' }}
              />

              {/* Dot */}
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 6 : 4}
                fill={color}
                stroke="white"
                strokeWidth={isHovered ? 2.5 : 2}
                style={{ transition: 'r 0.15s' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* Tooltip */}
              {isHovered && (
                <g>
                  {/* Vertical guide line */}
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + chartHeight}
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray="4,3"
                    strokeOpacity={0.5}
                  />
                  <rect
                    x={Math.min(x - 28, viewBoxWidth - paddingRight - 60)}
                    y={y - 34}
                    width={56}
                    height={22}
                    rx={5}
                    fill={color}
                  />
                  <text
                    x={Math.min(x, viewBoxWidth - paddingRight - 32)}
                    y={y - 19}
                    textAnchor="middle"
                    fontSize={11}
                    fill="white"
                    fontWeight="600"
                  >
                    {d.value}
                    {unit}
                  </text>
                </g>
              )}

              {/* X-axis labels */}
              <text
                x={x}
                y={paddingTop + chartHeight + 16}
                textAnchor="middle"
                fontSize={10}
                style={{ fill: '#94a3b8' }}
              >
                {d.label.length > 6 ? d.label.slice(0, 5) + '…' : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
