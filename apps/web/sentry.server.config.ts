import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "http://local-public-key@localhost:8000/1",
  tracesSampleRate: 1.0,
  debug: false,
});
