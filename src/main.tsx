import { StrictMode, lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ThemeProvider } from './theme'
import { LanguageProvider } from './i18n'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App.tsx'
import { initStorage } from './domain/storage'
import { trackSessionStarted } from './domain/monetizationTelemetry'
import { parseDisplayHash } from './domain/remote'

const hash = window.location.hash;
const isLocalDisplayWindow = hash === '#display';
const displayHashResult = parseDisplayHash(hash);
const isRemoteDisplayWindow = displayHashResult !== null;
const remoteDisplayPeerId = displayHashResult ? displayHashResult.peerId : null;

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
  const TVDisplayWindow = lazy(() =>
    import('./components/display').then(m => ({ default: m.TVDisplayWindow }))
  );
  const CrossDeviceDisplay = lazy(() =>
    import('./components/display').then(m => ({ default: m.CrossDeviceDisplay }))
  );
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

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <LanguageProvider>
            <Suspense fallback={<div style={{ background: '#0a0a0f', width: '100vw', height: '100vh' }} />}>
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
            </Suspense>
          </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
}

// Initialize IndexedDB storage before mounting React.
// Typically completes in <50ms. Falls back to localStorage if unavailable.
initStorage()
  .then(() => {
    trackSessionStarted();
    renderApp();
  })
  .catch((err) => {
    console.warn('[storage] init failed:', err);
    renderApp();
  });
