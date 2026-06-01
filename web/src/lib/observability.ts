import * as Sentry from '@sentry/react';

let configured = false;

export function configureFrontendObservability() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (configured || !dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: (import.meta.env.VITE_STACKCERT_RELEASE_VERSION as string | undefined) ?? undefined,
    tracesSampleRate: 0,
    sendDefaultPii: false
  });
  configured = true;
}
