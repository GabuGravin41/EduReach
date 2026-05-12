/** Onboarding preferences stored in localStorage for both guest and logged-in users. */

export interface OnboardingPrefs {
  fields: string[];          // e.g. ['medicine', 'nursing']
  level: string;             // 'secondary' | 'diploma' | 'undergraduate' | 'postgraduate' | 'professional'
  goals: string[];           // e.g. ['exam_prep', 'past_papers']
  completedAt: string;       // ISO timestamp
}

const KEY = 'edureach:onboarding-done';
const DATA_KEY = 'edureach:onboarding-prefs';

/** Map from field slug → tags used in Assessment.tags */
export const FIELD_TO_TAGS: Record<string, string[]> = {
  medicine:        ['medicine', 'clinical', 'healthcare', 'mbbs', 'anatomy', 'physiology', 'pharmacology'],
  nursing:         ['nursing', 'patient care', 'midwifery', 'healthcare', 'clinical'],
  pharmacy:        ['pharmacy', 'pharmaceutics', 'drug delivery', 'healthcare'],
  engineering:     ['engineering', 'ku', 'circuit', 'mechanical', 'electrical', 'civil'],
  computer_science:['computer science', 'programming', 'data structures', 'algorithms', 'databases', 'networks'],
  architecture:    ['architecture', 'design', 'construction', 'structural engineering', 'built environment'],
  law:             ['law', 'legal', 'constitutional', 'contract', 'criminal', 'kenya'],
  business:        ['business', 'management', 'marketing', 'strategy', 'entrepreneurship'],
  accounting:      ['accounting', 'finance', 'taxation', 'financial accounting', 'KRA'],
  chemistry:       ['chemistry', 'organic chemistry', 'analytical chemistry', 'physical chemistry'],
  biology:         ['biology', 'cell biology', 'genetics', 'microbiology', 'ecology'],
  agriculture:     ['agriculture', 'crop science', 'animal science', 'soil science', 'farming'],
  education:       ['education', 'pedagogy', 'curriculum', 'teaching', 'learning theories'],
  mathematics:     ['mathematics', 'math', 'olympiad', 'calculus', 'algebra', 'statistics'],
  physics:         ['physics', 'mechanics', 'electromagnetism', 'thermodynamics'],
  other:           [],
};

export const FIELD_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  medicine:        { label: 'Medicine',          emoji: '🏥', color: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300' },
  nursing:         { label: 'Nursing',            emoji: '💊', color: 'bg-pink-50 border-pink-200 text-pink-700 dark:bg-pink-900/20 dark:border-pink-700 dark:text-pink-300' },
  pharmacy:        { label: 'Pharmacy',           emoji: '💉', color: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300' },
  engineering:     { label: 'Engineering',        emoji: '⚙️',  color: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300' },
  computer_science:{ label: 'Computer Science',   emoji: '💻', color: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' },
  architecture:    { label: 'Architecture',       emoji: '🏛️',  color: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300' },
  law:             { label: 'Law',                emoji: '⚖️',  color: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300' },
  business:        { label: 'Business',           emoji: '📊', color: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300' },
  accounting:      { label: 'Accounting',         emoji: '💰', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300' },
  chemistry:       { label: 'Chemistry',          emoji: '🧪', color: 'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-900/20 dark:border-cyan-700 dark:text-cyan-300' },
  biology:         { label: 'Biology',            emoji: '🔬', color: 'bg-lime-50 border-lime-200 text-lime-700 dark:bg-lime-900/20 dark:border-lime-700 dark:text-lime-300' },
  agriculture:     { label: 'Agriculture',        emoji: '🌾', color: 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300' },
  education:       { label: 'Education',          emoji: '📚', color: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-300' },
  mathematics:     { label: 'Mathematics',        emoji: '∑',  color: 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-300' },
  physics:         { label: 'Physics',            emoji: '⚡', color: 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-900/20 dark:border-sky-700 dark:text-sky-300' },
  other:           { label: 'Other',              emoji: '🎯', color: 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400' },
};

export const hasCompletedOnboarding = (): boolean => {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
};

export const getOnboardingPrefs = (): OnboardingPrefs | null => {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const saveOnboardingPrefs = (prefs: OnboardingPrefs): void => {
  try {
    localStorage.setItem(KEY, '1');
    localStorage.setItem(DATA_KEY, JSON.stringify(prefs));
  } catch {}
};

export const clearOnboardingPrefs = (): void => {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(DATA_KEY);
  } catch {}
};

/** Returns all tag strings relevant to the user's chosen fields — used for filtering assessments. */
export const getPreferredTags = (): string[] => {
  const prefs = getOnboardingPrefs();
  if (!prefs?.fields?.length) return [];
  const tags = new Set<string>();
  for (const field of prefs.fields) {
    for (const tag of (FIELD_TO_TAGS[field] ?? [])) {
      tags.add(tag.toLowerCase());
    }
  }
  return Array.from(tags);
};

/** Score an assessment's relevance to the user's field preferences. Higher = more relevant. */
export const scoreAssessmentRelevance = (assessmentTags: string[]): number => {
  const preferred = getPreferredTags();
  if (!preferred.length) return 0;
  const lowerTags = assessmentTags.map(t => t.toLowerCase());
  return lowerTags.filter(t => preferred.includes(t)).length;
};

const useOnboardingPrefs = () => {
  return {
    prefs: getOnboardingPrefs(),
    hasCompleted: hasCompletedOnboarding(),
    preferredTags: getPreferredTags(),
    scoreRelevance: scoreAssessmentRelevance,
  };
};

export default useOnboardingPrefs;
