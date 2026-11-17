/**
 * Environment for e2e tests. Uses a dedicated database (never the dev one).
 * Override with DATABASE_URL_TEST if your Postgres runs elsewhere.
 * Default matches docker-compose.yml (`pnpm db:test:up`).
 */
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://dentalflow:dentalflow_secret@localhost:5434/dentalflow_test';
process.env.JWT_ACCESS_SECRET = 'e2e-access-secret';
process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret';
process.env.NODE_ENV = 'test';
// Clinical attachments go to a throwaway folder during tests
process.env.UPLOADS_DIR = require('path').join(require('os').tmpdir(), 'dentalflow-test-uploads');
