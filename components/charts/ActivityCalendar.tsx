import React, { useState, useMemo } from 'react';

interface ActivityDay {
  date: string; // ISO: "YYYY-MM-DD"
  count: number;
}

interface ActivityCalendarProps {
  data: ActivityDay[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CELL = 13;
const GAP = 3;
const STEP = CELL + GAP;
const WEEKS = 13;

// Returns Tailwind-compatible color class or inline style based on count
const getColor = (count: number, isDark: boolean): string => {
  if (count === 0) return isDark ? '#1e293b' : '#f1f5f9';
  if (count <= 2) return isDark ? '#166534' : '#bbf7d0';
  if (count <= 4) return isDark ? '#15803d' : '#4ade80';
  if (count <= 7) return isDark ? '#16a34a' : '#22c55e';
  return isDark ? '#22c55e' : '#15803d';
};

const LEGEND = [
  { label: '0', count: 0 },
  { label: '1–2', count: 1 },
  { label: '3–4', count: 3 },
  { label: '5–7', count: 5 },
  { label: '8+', count: 8 },
];

export const ActivityCalendar: React.FC<ActivityCalendarProps> = ({ data }) => {
  const [hovered, setHovered] = useState<{ date: string; count: number; x: number; y: number } | null>(null);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  // Listen for dark mode changes
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Build a map of date -> count
  const countMap = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(({ date, count }) => {
      map[date] = count;
    });
    return map;
  }, [data]);

  // Build 13-week grid ending today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from the Sunday WEEKS weeks ago
  const gridStart = new Date(today);
  gridStart.setDate(today.getDate() - today.getDay() - (WEEKS - 1) * 7);

  // Build cells: 13 cols × 7 rows
  const cells: { date: string; count: number; col: number; row: number }[] = [];
  for (let col = 0; col < WEEKS; col++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + col * 7 + row);
      const iso = d.toISOString().slice(0, 10);
      const count = countMap[iso] ?? 0;
      cells.push({ date: iso, count, col, row });
    }
  }

  // Month labels: find first occurrence of each month in the grid
  const monthLabels: { label: string; col: number }[] = [];
  const seenMonths = new Set<string>();
  for (let col = 0; col < WEEKS; col++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + col * 7 + row);
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      if (!seenMonths.has(monthKey)) {
        seenMonths.add(monthKey);
        monthLabels.push({
          label: d.toLocaleString('default', { month: 'short' }),
          col,
        });
      }
    }
  }

  const dayLabelWidth = 28;
  const svgWidth = dayLabelWidth + WEEKS * STEP + GAP;
  const headerHeight = 18;
  const svgHeight = headerHeight + 7 * STEP + 2;

  const formatDate = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="relative inline-block min-w-full">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="overflow-visible"
          role="img"
          aria-label="Activity calendar"
          onMouseLeave={() => setHovered(null)}
        >
          {/* Month labels */}
          {monthLabels.map(({ label, col }) => (
            <text
              key={`${label}-${col}`}
              x={dayLabelWidth + col * STEP}
              y={12}
              fontSize={10}
              style={{ fill: '#94a3b8' }}
            >
              {label}
            </text>
          ))}

          {/* Day-of-week labels (Mon, Wed, Fri) */}
          {[1, 3, 5].map((row) => (
            <text
              key={row}
              x={dayLabelWidth - 4}
              y={headerHeight + row * STEP + CELL - 2}
              textAnchor="end"
              fontSize={9}
              style={{ fill: '#94a3b8' }}
            >
              {DAYS[row].slice(0, 3)}
            </text>
          ))}

          {/* Cells */}
          {cells.map(({ date, count, col, row }) => {
            const x = dayLabelWidth + col * STEP;
            const y = headerHeight + row * STEP;
            const isFuture = date > today.toISOString().slice(0, 10);
            const fill = isFuture ? (isDark ? '#0f172a' : '#f8fafc') : getColor(count, isDark);

            return (
              <rect
                key={date}
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx={2.5}
                fill={fill}
                style={{ cursor: isFuture ? 'default' : 'pointer', transition: 'fill 0.15s' }}
                onMouseEnter={() => {
                  if (!isFuture) {
                    setHovered({ date, count, x, y });
                  }
                }}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>

        {/* Tooltip — rendered in HTML for proper positioning */}
        {hovered && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              left: hovered.x + dayLabelWidth - 8,
              top: hovered.y + headerHeight - 44,
            }}
          >
            <div className="bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
              <span className="font-semibold">{hovered.count} activities</span>
              <span className="text-slate-300 ml-1">on {formatDate(hovered.date)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">Less</span>
        {LEGEND.map(({ label, count }) => (
          <div
            key={label}
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: getColor(count, isDark) }}
            title={label}
          />
        ))}
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">More</span>
      </div>
    </div>
  );
};
