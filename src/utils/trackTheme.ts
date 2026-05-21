/**
 * Per-track colour accents. Keeps the unit experience visually varied —
 * engineering, olympiad and courses each carry their own hue instead of the
 * whole app being one shade of indigo. Class strings are written in full so
 * Tailwind's JIT scanner picks them up.
 */
export interface TrackTheme {
  label: string;
  accentText: string;
  headerGradient: string;
  chip: string;
}

export const TRACK_THEME: Record<string, TrackTheme> = {
  engineering: {
    label: 'University',
    accentText: 'text-indigo-600 dark:text-indigo-400',
    headerGradient: 'from-indigo-600 to-violet-700',
    chip: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300',
  },
  olympiad: {
    label: 'Olympiad',
    accentText: 'text-violet-600 dark:text-violet-400',
    headerGradient: 'from-violet-600 to-fuchsia-700',
    chip: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300',
  },
  general: {
    label: 'Course',
    accentText: 'text-teal-600 dark:text-teal-400',
    headerGradient: 'from-teal-600 to-emerald-700',
    chip: 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-300',
  },
};

export const themeForTrack = (track?: string): TrackTheme =>
  TRACK_THEME[track || ''] ?? TRACK_THEME.engineering;
