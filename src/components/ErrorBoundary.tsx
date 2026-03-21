import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Full-screen error boundary — wraps the entire app in main.tsx */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
    // Report to Sentry if available (dynamic import — no bundle impact when DSN not set)
    if (import.meta.env.VITE_SENTRY_DSN) {
      void import('@sentry/react').then((Sentry) => {
        Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
      }).catch(() => { /* Sentry not available */ });
    }
  }

  render() {
    if (this.state.hasError) {
      let lang = 'de'; try { lang = localStorage.getItem('poker-timer-language') ?? 'de'; } catch { /* SSR/test */ }
      const isDE = lang === 'de';
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
          <div className="text-center space-y-4 max-w-md">
            <p className="text-4xl">♠</p>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {isDE ? 'Etwas ist schiefgelaufen' : 'Something went wrong'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isDE ? 'Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu.' : 'An unexpected error occurred. Please reload the page.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 text-white rounded-lg font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent-600, #059669)' }}
            >
              {isDE ? 'Neu laden' : 'Reload'}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface SectionState {
  hasError: boolean;
  retryCount: number;
}

/** Compact inline error boundary — wraps lazy-loaded sections within a page */
export class SectionErrorBoundary extends Component<Props, SectionState> {
  state: SectionState = { hasError: false, retryCount: 0 };

  static getDerivedStateFromError(): Partial<SectionState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SectionErrorBoundary caught:', error, info.componentStack);
    if (import.meta.env.VITE_SENTRY_DSN) {
      void import('@sentry/react').then((Sentry) => {
        Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
      }).catch(() => { /* Sentry not available */ });
    }
  }

  render() {
    if (this.state.hasError) {
      let lang = 'de'; try { lang = localStorage.getItem('poker-timer-language') ?? 'de'; } catch { /* SSR/test */ }
      const isDE = lang === 'de';
      if (this.state.retryCount >= 3) {
        return (
          <div className="flex items-center justify-center p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isDE ? 'Dieser Bereich konnte nicht geladen werden. Bitte lade die Seite neu.' : 'This section could not be loaded. Please reload the page.'}
            </p>
          </div>
        );
      }
      return (
        <div className="flex items-center justify-center p-8 text-center">
          <div className="space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isDE ? 'Dieser Bereich konnte nicht geladen werden.' : 'Failed to load this section.'}
            </p>
            <button
              onClick={() => this.setState((prev) => ({ hasError: false, retryCount: prev.retryCount + 1 }))}
              className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
            >
              {isDE ? 'Erneut versuchen' : 'Retry'}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
