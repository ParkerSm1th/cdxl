import { fileURLToPath } from 'node:url';
import { loadCodexLinkEnv } from '@codexlink/shared';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

loadCodexLinkEnv();

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run migrations.');
}

const migrationsFolder = fileURLToPath(
  new URL('../../../drizzle', import.meta.url),
);

const pool = new Pool({
  connectionString: databaseUrl,
});

try {
  await migrate(drizzle(pool), { migrationsFolder });
  console.log(`Applied migrations from ${migrationsFolder}`);
} finally {
  await pool.end();
}
