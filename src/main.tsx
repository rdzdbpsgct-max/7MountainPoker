import { StrictMode, lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ThemeProvider } from './theme'
import { LanguageProvider } from './i18n'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App.tsx'
import { TVDisplayWindow, CrossDeviceDisplay } from './components/display'
import { initStorage } from './domain/storage'
import { trackSessionStarted } from './domain/monetizationTelemetry'

const hash = window.location.hash;
const isLocalDisplayWindow = hash === '#display';
const isRemoteDisplayWindow = hash.startsWith('#display=');
const remoteDisplayPeerId = isRemoteDisplayWindow ? hash.slice('#display='.length) : null;

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn && import.meta.env.PROD && !isLocalDisplayWindow && !isRemoteDisplayWindow) {
  const initSentryOnIdle = () => {
    import('./monitoring/initSentry')
      .then(({ initSentry }) => initSentry({
        dsn: sentryDsn,
        environment: import.meta.env.MODE,
      }))
      .catch(() => {
        // Sentry init failed silently
      });
  };

  const requestIdle = (window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  }).requestIdleCallback;

  if (typeof requestIdle === 'function') {
    requestIdle(() => initSentryOnIdle(), { timeout: 4000 });
  } else {
    window.setTimeout(initSentryOnIdle, 2500);
  }
}

function renderApp() {
  // Lazy-loaded inside renderApp to avoid top-level component declarations
  // in the entry-point file (react-refresh/only-export-components).
  const Analytics = lazy(() => import('@vercel/analytics/react').then((m) => ({ default: m.Analytics })));
  const SpeedInsights = lazy(() => import('@vercel/speed-insights/react').then((m) => ({ default: m.SpeedInsights })));

  function DeferredMonitoring() {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
      if (!import.meta.env.PROD || isLocalDisplayWindow || isRemoteDisplayWindow) return;
      // Delay monitoring bundle loading to protect initial render performance.
      const id = window.setTimeout(() => setEnabled(true), 2000);
      return () => window.clearTimeout(id);
    }, []);

    if (!enabled) return null;
    return (
      <Suspense fallback={null}>
        <Analytics />
        <SpeedInsights />
      </Suspense>
    );
  }

  trackSessionStarted();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <LanguageProvider>
            {isLocalDisplayWindow ? (
              <TVDisplayWindow />
            ) : isRemoteDisplayWindow && remoteDisplayPeerId ? (
              <CrossDeviceDisplay hostPeerId={remoteDisplayPeerId} />
            ) : (
              <>
                <App />
                <DeferredMonitoring />
              </>
            )}
          </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
}

// Initialize IndexedDB storage before mounting React.
// Typically completes in <50ms. Falls back to localStorage if unavailable.
initStorage().then(renderApp).catch(renderApp)
