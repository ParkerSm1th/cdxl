#!/usr/bin/env node
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

const DEFAULT_SITE_URL = 'https://codexl.ink';

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
  const siteUrl = process.env['SITE_URL'] ?? DEFAULT_SITE_URL;
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

export function createProgram(): Command {
  const program = new Command();

  program
    .name('cdxl')
    .description('Publish and track Codex chats')
    .showHelpAfterError()
    .showSuggestionAfterError();

  program
    .command('share')
    .description('Create a public share for one Codex session and print its URL.')
    .argument('<sessionId>', 'Codex session ID to publish')
    .option('--api-url <url>', 'Override the CodexLink API base URL')
    .action(async (sessionId: string, options: { apiUrl?: string }) => {
      await runShare(sessionId, options.apiUrl);
    });

  program
    .command('track')
    .description('Keep one session synced to the same public link as new messages arrive.')
    .argument('<sessionId>', 'Codex session ID to track continuously')
    .option('--api-url <url>', 'Override the CodexLink API base URL')
    .action(async (sessionId: string, options: { apiUrl?: string }) => {
      await runTrack(sessionId, options.apiUrl);
    });

  program
    .command('monitor')
    .description('Watch for new local Codex sessions and offer to start tracking them.')
    .option('--api-url <url>', 'Override the CodexLink API base URL')
    .action(async (options: { apiUrl?: string }) => {
      await runMonitor(options.apiUrl);
    });

  program
    .command('unshare')
    .description('Revoke a public share by share ID or by a locally tracked session ID.')
    .argument('<shareOrSessionId>', 'Share ID or tracked session ID to revoke')
    .option('--api-url <url>', 'Override the CodexLink API base URL')
    .action(async (target: string, options: { apiUrl?: string }) => {
      await runUnshare(target, options.apiUrl);
    });

  return program;
}

export { runMonitor, runShare, runTrack, runUnshare };
