import { serve } from '@hono/node-server';
import { createMemoryRepository, createPostgresRepository } from '@codexlink/db';
import { loadCodexLinkEnv } from '@codexlink/shared';
import { createApp } from './app';

loadCodexLinkEnv();

const port = Number(process.env['PORT'] ?? 8787);
const siteUrl = process.env['SITE_URL'] ?? 'https://codexl.ink';
const databaseUrl = process.env['DATABASE_URL'];
const allowMemoryStorage = process.env['CODEXLINK_ALLOW_MEMORY'] === '1';

if (!databaseUrl && !allowMemoryStorage) {
  throw new Error(
    'DATABASE_URL is required to start the API. Set CODEXLINK_ALLOW_MEMORY=1 to opt into ephemeral memory storage.',
  );
}

const storage = databaseUrl ? 'postgres' : 'memory';
const repository = databaseUrl
  ? createPostgresRepository(databaseUrl)
  : createMemoryRepository();

const app = createApp(repository, { siteUrl, storage });

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`codexlink api listening on http://localhost:${info.port} (${storage})`);
  },
);
