import { execSync } from 'child_process';
import { join } from 'path';
import './test-env';

/** Recreates the test database from migrations and runs the seed (permissions + plans). */
export default function globalSetup(): void {
  execSync('npx prisma migrate reset --force --skip-generate', {
    cwd: join(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
}
