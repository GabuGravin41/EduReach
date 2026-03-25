import React, { useState, useRef, useEffect } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  title?: string;
  unit?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  color = '#3b82f6',
  height = 260,
  title,
  unit = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 dark:text-slate-500 text-sm">
        No data available
      </div>
    );
  }

  const paddingLeft = 48;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 40;
  const viewBoxWidth = 600;
  const viewBoxHeight = height;
  const chartWidth = viewBoxWidth - paddingLeft - paddingRight;
  const chartHeight = viewBoxHeight - paddingTop - paddingBottom;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const yMax = Math.ceil(maxValue * 1.15);
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round((yMax / tickCount) * i)
  );

  const barWidth = Math.min((chartWidth / data.length) * 0.6, 48);
  const barSpacing = chartWidth / data.length;

  const getBarX = (i: number) => paddingLeft + i * barSpacing + (barSpacing - barWidth) / 2;
  const getBarHeight = (value: number) => (value / yMax) * chartHeight;
  const getBarY = (value: number) => paddingTop + chartHeight - getBarHeight(value);

  return (
    <div className="w-full">
      {title && (
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">{title}</p>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={title || 'Bar chart'}
      >
        {/* Y-axis grid lines and tick labels */}
        {ticks.map((tick) => {
          const y = paddingTop + chartHeight - (tick / yMax) * chartHeight;
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
                fill="currentColor"
                className="text-slate-400 dark:text-slate-500"
                style={{ fill: '#94a3b8' }}
              >
                {tick}
                {unit}
              </text>
            </g>
          );
        })}

        {/* X-axis baseline */}
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={viewBoxWidth - paddingRight}
          y2={paddingTop + chartHeight}
          stroke="#cbd5e1"
          strokeWidth={1}
          className="text-slate-300 dark:text-slate-600"
        />

        {/* Bars */}
        {data.map((d, i) => {
          const bx = getBarX(i);
          const bh = getBarHeight(d.value);
          const by = getBarY(d.value);
          const isHovered = hoveredIndex === i;
          const animatedHeight = mounted ? bh : 0;
          const animatedY = mounted ? by : paddingTop + chartHeight;

          return (
            <g key={i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
              {/* Bar shadow/highlight */}
              {isHovered && (
                <rect
                  x={bx - 2}
                  y={paddingTop}
                  width={barWidth + 4}
                  height={chartHeight}
                  rx={4}
                  fill="currentColor"
                  fillOpacity={0.04}
                  className="text-slate-900 dark:text-white"
                />
              )}

              {/* Bar itself */}
              <rect
                x={bx}
                y={animatedY}
                width={barWidth}
                height={animatedHeight}
                rx={4}
                fill={isHovered ? color : color}
                fillOpacity={isHovered ? 1 : 0.82}
                style={{
                  transition: 'height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), y 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), fill-opacity 0.15s',
                  transitionDelay: `${i * 40}ms`,
                }}
              />

              {/* Hover tooltip value */}
              {isHovered && (
                <g>
                  <rect
                    x={bx + barWidth / 2 - 22}
                    y={by - 28}
                    width={44}
                    height={20}
                    rx={4}
                    fill={color}
                  />
                  <text
                    x={bx + barWidth / 2}
                    y={by - 14}
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

              {/* X-axis label */}
              <text
                x={bx + barWidth / 2}
                y={paddingTop + chartHeight + 16}
                textAnchor="middle"
                fontSize={10}
                style={{ fill: '#94a3b8' }}
              >
                {d.label.length > 7 ? d.label.slice(0, 6) + '…' : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
