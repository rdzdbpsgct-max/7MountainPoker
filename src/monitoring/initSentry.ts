interface InitSentryOptions {
  dsn: string;
  environment: string;
}

export async function initSentry({ dsn, environment }: InitSentryOptions): Promise<void> {
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    environment,
    release: import.meta.env.VITE_RELEASE ?? undefined,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter(
          (b) => b.category !== 'console' || b.level === 'error'
        );
      }
      return event;
    },
  });
}
