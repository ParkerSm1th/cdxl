import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import type { Config } from 'drizzle-kit';

const schemaPath = fileURLToPath(new URL('./packages/db/src/schema.ts', import.meta.url));
const outPath = fileURLToPath(new URL('./drizzle', import.meta.url));
const envPath = fileURLToPath(new URL('./.env', import.meta.url));
const envLocalPath = fileURLToPath(new URL('./.env.local', import.meta.url));

if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}

if (existsSync(envLocalPath)) {
  loadEnv({ override: true, path: envLocalPath });
}

export default {
  dialect: 'postgresql',
  out: outPath,
  schema: schemaPath,
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? '',
  },
} satisfies Config;
