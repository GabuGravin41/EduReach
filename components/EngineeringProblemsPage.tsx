import { useState, useEffect, useCallback } from 'react';
import apiClient from '../src/services/api';
import { EngineeringProblemCard } from './EngineeringProblemCard';

interface EngineeringProblem {
  id: number;
  unit_code: string;
  unit_name: string;
  year: number | null;
  semester: number | null;
  paper_type: string;
  question_number: string;
  question_text: string;
  marks: string;
  question_type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  has_diagram: boolean;
  diagram_url: string | null;
  diagram_description: string;
  model_solution: string;
  solution_status: 'pending' | 'generated' | 'verified';
}

interface UnitOption {
  unit_code: string;
  unit_name: string;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: EngineeringProblem[];
}

const DIFFICULTIES = ['', 'easy', 'medium', 'hard'] as const;
const QUESTION_TYPES = ['', 'calculation', 'derivation', 'explanation', 'design', 'proof', 'sketch', 'mcq'] as const;

interface EngineeringProblemsPageProps {
  /** When set, papers are filtered to this curriculum unit and the unit
   *  picker + standalone page header are hidden (embedded in UnitDetailPage). */
  unitId?: number;
}

export function EngineeringProblemsPage({ unitId }: EngineeringProblemsPageProps = {}) {
  const [problems, setProblems] = useState<EngineeringProblem[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    apiClient.get('engineering/problems/units/').then((r) => setUnits(r.data)).catch(() => {});
  }, []);

  const fetchProblems = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError('');

    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (unitId) params.unit = String(unitId);
    else if (unitFilter) params.unit_code = unitFilter;
    if (difficultyFilter) params.difficulty = difficultyFilter;
    if (typeFilter) params.question_type = typeFilter;

    try {
      const res = await apiClient.get<PaginatedResponse>('engineering/problems/', { params });
      const data = res.data;
      if (reset) {
        setProblems(data.results);
      } else {
        setProblems((prev) => [...prev, ...data.results]);
      }
      setTotal(data.count);
      setNextUrl(data.next);
    } catch {
      setError('Failed to load problems. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, unitFilter, unitId, difficultyFilter, typeFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchProblems(true), 300);
    return () => clearTimeout(t);
  }, [fetchProblems]);

  const loadMore = async () => {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await apiClient.get<PaginatedResponse>(nextUrl);
      setProblems((prev) => [...prev, ...res.data.results]);
      setNextUrl(res.data.next);
    } catch {
      // silently fail — user can retry
    } finally {
      setLoadingMore(false);
    }
  };

  const embedded = unitId != null;

  return (
    <div className={embedded ? '' : 'min-h-screen bg-gray-50'}>
      <div className={embedded ? '' : 'max-w-4xl mx-auto px-4 py-8'}>
        {/* Page header — hidden when embedded inside a unit page */}
        {!embedded && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Engineering Past Papers</h1>
            <p className="text-sm text-gray-500 mt-1">
              Kenyatta University past paper questions — browse, search, and study with step-by-step solutions.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />

          {!embedded && (
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option value="">All units</option>
              {units.map((u) => (
                <option key={u.unit_code} value={u.unit_code}>
                  {u.unit_code} — {u.unit_name}
                </option>
              ))}
            </select>
          )}

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          >
            <option value="">All difficulties</option>
            {DIFFICULTIES.filter(Boolean).map((d) => (
              <option key={d} value={d} className="capitalize">{d}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          >
            <option value="">All types</option>
            {QUESTION_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t} className="capitalize">{t}</option>
            ))}
          </select>
        </div>

        {/* Count */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-4">
            {total === 0 ? 'No questions found' : `${total} question${total !== 1 ? 's' : ''} found`}
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* Problem list */}
        {!loading && problems.length > 0 && (
          <div className="space-y-4">
            {problems.map((problem) => (
              <EngineeringProblemCard key={problem.id} problem={problem} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && problems.length === 0 && !error && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📐</p>
            <p className="text-sm">No questions match your filters. Try broadening your search.</p>
          </div>
        )}

        {/* Load more */}
        {nextUrl && !loading && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
