#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { buildPublicShareUrl, readSessionIndex } from '@codexlink/shared';
import {
  MonitorService,
  SessionTracker,
  createCliContext,
  revokeTrackedSession,
  syncSession,
} from './tracker';

async function waitForExit(): Promise<void> {
  await new Promise<void>((resolve) => {
    const handler = () => resolve();
    process.once('SIGINT', handler);
    process.once('SIGTERM', handler);
  });
}

async function runShare(sessionId: string, apiUrl?: string) {
  const context = createCliContext({ apiBaseUrl: apiUrl });
  const tracked = await syncSession(sessionId, context);
  const siteUrl = process.env['SITE_URL'] ?? 'https://codexl.ink';
  context.logger.log(`Share URL: ${buildPublicShareUrl(siteUrl, tracked.shareId)}`);
  context.logger.log(`Manage token: ${tracked.manageToken}`);
}

async function runTrack(sessionId: string, apiUrl?: string) {
  const context = createCliContext({ apiBaseUrl: apiUrl });
  const tracker = new SessionTracker(sessionId, context);
  await tracker.start();
  context.logger.log(`Tracking ${sessionId}`);
  await waitForExit();
  await tracker.dispose();
}

async function runMonitor(apiUrl?: string) {
  const context = createCliContext({ apiBaseUrl: apiUrl });
  const service = new MonitorService(context);
  const codexHome = context.codexHome ?? process.env['CODEX_HOME'];
  const indexPath = join(codexHome ?? join(process.env['HOME'] ?? '', '.codex'), 'session_index.jsonl');

  const syncIndex = async () => {
    const entries = await readSessionIndex(context.codexHome);
    await service.handleSessionIndex(entries);
  };

  await syncIndex();
  const watcher = watch(indexPath, () => {
    void syncIndex().catch((error) => context.logger.error(error));
  });
  context.logger.log(`Monitoring ${indexPath}`);
  await waitForExit();
  watcher.close();
  await service.dispose();
}

async function runUnshare(target: string, apiUrl?: string) {
  const context = createCliContext({ apiBaseUrl: apiUrl });
  await revokeTrackedSession(target, context);
  context.logger.log(`Revoked ${target}`);
}

const program = new Command();
program.name('cdxl').description('Publish and track Codex chats');

program
  .command('share')
  .argument('<sessionId>')
  .option('--api-url <url>')
  .action(async (sessionId: string, options: { apiUrl?: string }) => {
    await runShare(sessionId, options.apiUrl);
  });

program
  .command('track')
  .argument('<sessionId>')
  .option('--api-url <url>')
  .action(async (sessionId: string, options: { apiUrl?: string }) => {
    await runTrack(sessionId, options.apiUrl);
  });

program
  .command('monitor')
  .option('--api-url <url>')
  .action(async (options: { apiUrl?: string }) => {
    await runMonitor(options.apiUrl);
  });

program
  .command('unshare')
  .argument('<shareOrSessionId>')
  .option('--api-url <url>')
  .action(async (target: string, options: { apiUrl?: string }) => {
    await runUnshare(target, options.apiUrl);
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export { runMonitor, runShare, runTrack, runUnshare };
