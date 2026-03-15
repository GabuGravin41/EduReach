import React from 'react';
import { AssessmentAttempt } from '../src/services/assessmentService';

interface Props {
  attempts: AssessmentAttempt[];
  questions: any[];
  isLoading: boolean;
}

// ── helpers ────────────────────────────────────────────────────────────────

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function scoreColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 60) return 'text-indigo-600 dark:text-indigo-400';
  if (pct >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

function barColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-indigo-500';
  if (pct >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
}

// ── sub-components ──────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  color?: string;
}> = ({ label, value, sub, color = 'text-slate-800 dark:text-white' }) => (
  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700">
    <p className={`text-xl font-black ${color}`}>{value}</p>
    <p className="text-xs font-semibold text-slate-500 mt-0.5">{label}</p>
    {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

// Inline SVG bar chart — no library required
const ScoreDistribution: React.FC<{ graded: AssessmentAttempt[] }> = ({ graded }) => {
  const BUCKETS = [
    { label: '0–20', min: 0, max: 20, color: '#f43f5e' },
    { label: '20–40', min: 20, max: 40, color: '#f59e0b' },
    { label: '40–60', min: 40, max: 60, color: '#f59e0b' },
    { label: '60–80', min: 60, max: 80, color: '#6366f1' },
    { label: '80–100', min: 80, max: 101, color: '#10b981' },
  ];

  const counts = BUCKETS.map(b => ({
    ...b,
    count: graded.filter(a => {
      const p = a.percentage ?? 0;
      return p >= b.min && p < b.max;
    }).length,
  }));
  const max = Math.max(...counts.map(c => c.count), 1);

  const W = 260, H = 80, BAR_W = 36, GAP = 16;
  const startX = (W - BUCKETS.length * (BAR_W + GAP) + GAP) / 2;

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Score Distribution</p>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" aria-label="Score distribution chart">
        {counts.map((b, i) => {
          const barH = Math.max(4, (b.count / max) * H);
          const x = startX + i * (BAR_W + GAP);
          const y = H - barH;
          return (
            <g key={b.label}>
              <rect x={x} y={y} width={BAR_W} height={barH} rx={4} fill={b.color} fillOpacity={0.85} />
              {b.count > 0 && (
                <text x={x + BAR_W / 2} y={y - 3} textAnchor="middle" fontSize={9} fill={b.color} fontWeight="700">
                  {b.count}
                </text>
              )}
              <text x={x + BAR_W / 2} y={H + 14} textAnchor="middle" fontSize={8} fill="#94a3b8" fontWeight="600">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-[10px] text-slate-400 text-center -mt-1">Score % range</p>
    </div>
  );
};

// Horizontal bars showing per-question correct rate
const QuestionDifficulty: React.FC<{
  questions: any[];
  graded: AssessmentAttempt[];
}> = ({ questions, graded }) => {
  const rows = questions
    .map(q => {
      const qType = (q.question_type || q.type || '').toLowerCase();
      if (!['mcq', 'true_false', 'multiple_choice'].includes(qType)) return null;
      const correctAnswer = q.correct_answer ?? (Array.isArray(q.correct_answers) ? q.correct_answers[0] : null);
      if (!correctAnswer) return null;

      const answered = graded.filter(
        a => a.answers?.[q.id] !== undefined || a.answers?.[String(q.id)] !== undefined,
      );
      if (answered.length === 0) return null;

      const numCorrect = answered.filter(a => {
        const ans = (a.answers?.[q.id] ?? a.answers?.[String(q.id)] ?? '').toString().trim().toLowerCase();
        return ans === correctAnswer.toString().trim().toLowerCase();
      }).length;

      return {
        id: q.id,
        text: (q.question_text ?? 'Question').slice(0, 55) + ((q.question_text ?? '').length > 55 ? '…' : ''),
        rate: Math.round((numCorrect / answered.length) * 100),
        total: answered.length,
      };
    })
    .filter(Boolean) as { id: number; text: string; rate: number; total: number }[];

  if (rows.length === 0) return null;

  // Sort hardest first
  const sorted = rows.slice().sort((a, b) => a.rate - b.rate);

  return (
    <div className="mt-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
        Question Difficulty
        <span className="ml-1 font-normal normal-case text-slate-400">(MCQ/T-F only)</span>
      </p>
      <div className="space-y-2">
        {sorted.map(row => (
          <div key={row.id}>
            <div className="flex justify-between items-baseline mb-0.5">
              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[190px]" title={row.text}>
                {row.text}
              </p>
              <span className={`text-[11px] font-black ml-2 shrink-0 ${scoreColor(row.rate)}`}>
                {row.rate}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor(row.rate)}`}
                style={{ width: `${row.rate}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── main component ──────────────────────────────────────────────────────────

export const AssessmentAnalytics: React.FC<Props> = ({ attempts, questions, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Loading analytics…</p>
      </div>
    );
  }

  const graded = attempts.filter(
    a => (a.status === 'graded' || (a.percentage !== undefined && a.percentage > 0)) && a.percentage !== undefined,
  );

  if (graded.length === 0) {
    return (
      <div className="py-10 text-center text-slate-400">
        <p className="text-3xl mb-2">📊</p>
        <p className="text-sm font-medium">No graded attempts yet.</p>
        <p className="text-xs mt-1">Analytics will appear once students submit.</p>
      </div>
    );
  }

  const avg = graded.reduce((s, a) => s + (a.percentage ?? 0), 0) / graded.length;
  const passCount = graded.filter(a => (a.percentage ?? 0) >= 60).length;
  const passRate = (passCount / graded.length) * 100;

  const timedAttempts = graded.filter(a => a.time_taken_seconds && a.time_taken_seconds > 0);
  const avgTimeSecs = timedAttempts.length > 0
    ? Math.round(timedAttempts.reduce((s, a) => s + (a.time_taken_seconds ?? 0), 0) / timedAttempts.length)
    : null;

  const scores = graded.map(a => a.percentage ?? 0).sort((a, b) => a - b);
  const median = scores.length % 2 === 0
    ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
    : scores[Math.floor(scores.length / 2)];

  return (
    <div className="space-y-5">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Attempts" value={String(graded.length)} />
        <StatCard
          label="Avg Score"
          value={`${avg.toFixed(1)}%`}
          color={scoreColor(avg)}
        />
        <StatCard
          label="Pass Rate"
          value={`${passRate.toFixed(0)}%`}
          sub="≥ 60%"
          color={scoreColor(passRate)}
        />
        <StatCard
          label={avgTimeSecs ? 'Avg Time' : 'Median'}
          value={avgTimeSecs ? fmtTime(avgTimeSecs) : `${median.toFixed(1)}%`}
          color="text-slate-700 dark:text-slate-300"
        />
      </div>

      {/* Score distribution */}
      <ScoreDistribution graded={graded} />

      {/* Per-question breakdown */}
      <QuestionDifficulty questions={questions} graded={graded} />
    </div>
  );
};
