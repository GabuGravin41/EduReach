import React, { useState } from 'react';
import { authService } from '../src/services/authService';
import { FIELD_LABELS } from '../src/hooks/useOnboardingPrefs';

const ALL_FIELDS = Object.entries(FIELD_LABELS).map(([key, val]) => ({ key, ...val }));

const LEVELS = [
  { value: 'secondary',     label: 'Secondary School',      sub: 'KCSE / Form 1–4' },
  { value: 'diploma',       label: 'Diploma / Certificate', sub: 'TVET, college diploma' },
  { value: 'undergraduate', label: 'Undergraduate',         sub: "Bachelor's degree" },
  { value: 'postgraduate',  label: 'Postgraduate',          sub: "Master's / PhD" },
  { value: 'professional',  label: 'Professional / Other',  sub: 'Working, self-study' },
];

const GOALS = [
  { value: 'exam_prep',      label: '📝  Prepare for upcoming exams' },
  { value: 'past_papers',    label: '📄  Practice past papers' },
  { value: 'concepts',       label: '🧠  Understand difficult concepts' },
  { value: 'general',        label: '🌱  Learn at my own pace' },
  { value: 'improve_grades', label: '📈  Improve my grades' },
  { value: 'career',         label: '💼  Advance my career' },
];

interface Props {
  initialFirstName?: string;
  initialLastName?: string;
  onComplete: () => void;
  refreshUser: () => Promise<void>;
}

export const PostAuthOnboardingModal: React.FC<Props> = ({
  initialFirstName = '',
  initialLastName = '',
  onComplete,
  refreshUser,
}) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const TOTAL = 4;

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');

  const [fields, setFields] = useState<string[]>([]);

  const [level, setLevel] = useState('');
  const [degreeCourse, setDegreeCourse] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');

  const [goals, setGoals] = useState<string[]>([]);
  const [bio, setBio] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const goTo = (next: number, dir: 'forward' | 'back' = 'forward') => {
    setDirection(dir);
    setStep(next);
  };

  const toggleField = (key: string) =>
    setFields(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]);

  const toggleGoal = (val: string) =>
    setGoals(prev => prev.includes(val) ? prev.filter(g => g !== val) : [...prev, val]);

  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (/^254\d{9}$/.test(digits)) return digits;
    if (/^0\d{9}$/.test(digits)) return '254' + digits.slice(1);
    if (/^[71]\d{8}$/.test(digits)) return '254' + digits;
    return digits;
  };

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        onboarding_completed: true,
      };
      if (phone.trim()) payload.phone_number = normalizePhone(phone.trim());
      if (country.trim()) payload.country = country.trim();
      if (fields.length) {
        payload.interests = fields.join(', ');
        payload.learning_goal = fields[0];
      }
      if (level) payload.learner_type = level;
      if (degreeCourse.trim()) payload.degree_course = degreeCourse.trim();
      if (yearOfStudy.trim()) payload.year_of_study = yearOfStudy.trim();
      if (goals.length) {
        const goalStr = goals.join(', ');
        payload.interests = payload.interests ? `${payload.interests}, ${goalStr}` : goalStr;
      }
      if (bio.trim()) payload.bio = bio.trim();

      await authService.updateProfile(payload);
      await refreshUser();
      onComplete();
    } catch {
      setError('Could not save your profile — you can update it later in Settings.');
      // Still refresh and dismiss so the user isn't stuck
      try { await refreshUser(); } catch { /* ignore */ }
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white text-sm transition-all';

  const CheckMark = () => (
    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );

  const slide0 = (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">What should we call you?</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your name helps personalise your experience.</p>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              First name <span className="text-rose-500">*</span>
            </label>
            <input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className={inputCls}
              placeholder="e.g. Amina"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Last name <span className="text-rose-500">*</span>
            </label>
            <input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className={inputCls}
              placeholder="e.g. Wanjiku"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Phone number <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className={inputCls}
            placeholder="07xx xxx xxx or 254xxx"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Country <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            value={country}
            onChange={e => setCountry(e.target.value)}
            className={inputCls}
            placeholder="e.g. Kenya"
          />
        </div>
      </div>
      <button
        disabled={!firstName.trim() || !lastName.trim()}
        onClick={() => goTo(1)}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-sm transition-colors"
      >
        Next →
      </button>
    </div>
  );

  const slide1 = (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">What are you studying?</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pick one or more — we'll show you relevant content.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1 -mr-1">
        {ALL_FIELDS.map(({ key, label, emoji, color }) => {
          const selected = fields.includes(key);
          return (
            <button
              key={key}
              onClick={() => toggleField(key)}
              className={`rounded-xl border px-3 py-2.5 text-sm text-left transition-all flex items-center gap-2 ${
                selected
                  ? `${color} ring-2 ring-inset ring-current/30 font-semibold`
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 bg-white dark:bg-slate-800'
              }`}
            >
              <span className="text-base leading-none">{emoji}</span>
              <span className="leading-tight">{label}</span>
              {selected && <span className="ml-auto text-xs">✓</span>}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => goTo(0, 'back')}
          className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => goTo(2)}
          className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors"
        >
          {fields.length === 0 ? 'Skip →' : 'Next →'}
        </button>
      </div>
    </div>
  );

  const slide2 = (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your studies</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Helps us explain things at the right depth.</p>
      </div>
      <div className="space-y-2">
        {LEVELS.map(l => (
          <button
            key={l.value}
            onClick={() => setLevel(level === l.value ? '' : l.value)}
            className={`w-full rounded-xl border px-4 py-3 text-left transition-all flex items-center justify-between ${
              level === l.value
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:border-indigo-300'
            }`}
          >
            <div>
              <div className="text-sm font-medium">{l.label}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{l.sub}</div>
            </div>
            {level === l.value && <CheckMark />}
          </button>
        ))}
      </div>
      <div className="space-y-3 pt-1">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Specific degree / course <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            value={degreeCourse}
            onChange={e => setDegreeCourse(e.target.value)}
            className={inputCls}
            placeholder="e.g. BSc Computer Science, KCSE 2026"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Year / form <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            value={yearOfStudy}
            onChange={e => setYearOfStudy(e.target.value)}
            className={inputCls}
            placeholder="e.g. Year 2, Form 3, Final year"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => goTo(1, 'back')}
          className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => goTo(3)}
          className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors"
        >
          {!level ? 'Skip →' : 'Next →'}
        </button>
      </div>
    </div>
  );

  const slide3 = (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Almost done!</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">What are you hoping to achieve with EduReach?</p>
      </div>
      <div className="space-y-2">
        {GOALS.map(g => {
          const selected = goals.includes(g.value);
          return (
            <button
              key={g.value}
              onClick={() => toggleGoal(g.value)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all flex items-center gap-3 ${
                selected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500 font-medium'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:border-indigo-300'
              }`}
            >
              <span className="flex-1">{g.label}</span>
              {selected && <CheckMark />}
            </button>
          );
        })}
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          Short bio <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          rows={2}
          className={`${inputCls} resize-none`}
          placeholder="e.g. 2nd year med student at UoN, preparing for finals"
        />
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={() => goTo(2, 'back')}
          className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          ← Back
        </button>
        <button
          disabled={saving}
          onClick={handleFinish}
          className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {saving
            ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>
            : "Let's go! 🚀"}
        </button>
      </div>
    </div>
  );

  const slides = [slide0, slide1, slide2, slide3];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        <div className="px-6 pt-5 pb-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎓</span>
              <span className="text-xs font-semibold tracking-widest text-slate-400 dark:text-slate-500 uppercase">EduReach</span>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: TOTAL }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-6 h-1.5 bg-indigo-500'
                      : i < step
                      ? 'w-3 h-1.5 bg-indigo-300 dark:bg-indigo-600'
                      : 'w-3 h-1.5 bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-hidden px-6 pb-6">
          <div
            key={step}
            style={{ animation: `slideIn${direction} 0.25s ease-out` }}
          >
            {slides[step]}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideInforward { from { opacity:0; transform:translateX(24px);  } to { opacity:1; transform:translateX(0); } }
        @keyframes slideInback    { from { opacity:0; transform:translateX(-24px); } to { opacity:1; transform:translateX(0); } }
      `}</style>
    </div>
  );
};
