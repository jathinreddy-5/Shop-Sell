import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || 'https://20aefdcd9703df9c911c9b4fc6cc4e00@o4512231873708032.ingest.us.sentry.io/4512231886290944',
  tracesSampleRate: 1.0,
});
