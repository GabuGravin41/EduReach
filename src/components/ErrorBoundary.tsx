import React, { ReactNode, Component, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  isChunkError: boolean;
  reloadAttempted: boolean;
}

const isChunkLoadError = (error: Error) =>
  error.name === 'ChunkLoadError' ||
  /Loading chunk \d+ failed/i.test(error.message) ||
  /Failed to fetch dynamically imported module/i.test(error.message) ||
  /Importing a module script failed/i.test(error.message);

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, isChunkError: false, reloadAttempted: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.onError) this.props.onError(error, errorInfo);

    // Auto-reload once for chunk load errors (stale deploy cache) — but only once to avoid infinite loops
    if (isChunkLoadError(error) && !this.state.reloadAttempted) {
      this.setState({ reloadAttempted: true });
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      // Chunk errors: show brief "updating" screen while reloading
      if (this.state.isChunkError && !this.state.reloadAttempted) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
            <div className="text-center">
              <div className="inline-block w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">Updating EduReach…</p>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
          <div className="max-w-sm w-full text-center space-y-5">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40">
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Something went wrong
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {this.state.isChunkError
                  ? 'EduReach was updated. Refresh to load the latest version.'
                  : 'An unexpected error occurred. Refreshing usually fixes this.'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition-colors"
              >
                Go Home
              </button>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500">
              Still seeing this?{' '}
              <a href="mailto:edu.reach.co@gmail.com" className="text-indigo-500 hover:underline">
                Contact support
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
