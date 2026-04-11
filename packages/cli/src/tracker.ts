import { watch, type FSWatcher } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { platform } from 'node:os';
import {
  buildShareSnapshot,
  expandHomePath,
  loadCodexLinkEnv,
  resolveSessionById,
  type ShareSnapshotInput,
} from '@codexlink/shared';
import {
  ApiRequestError,
  CodexLinkApiClient,
  type FetchLike,
} from './api-client';
import {
  getDefaultStateRoot,
  loadAppState,
  saveAppState,
  type AppState,
  type TrackedSessionState,
} from './state';
import { createProgressReporter, type ProgressReporter } from './loader';

const execFileAsync = promisify(execFile);
const DEFAULT_API_BASE_URL = 'https://api.codexl.ink';

export type CliContext = {
  apiBaseUrl: string;
  codexHome?: string;
  fetchImpl: FetchLike;
  logger: Pick<Console, 'error' | 'log'>;
  stateRoot: string;
};

export type PromptHandler = (input: {
  sessionId: string;
  title: string;
}) => Promise<boolean>;

function shouldRecreateShare(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    [401, 403, 404, 410].includes(error.status)
  );
}

export function createCliContext(overrides: Partial<CliContext> = {}): CliContext {
  loadCodexLinkEnv();

  return {
    apiBaseUrl:
      overrides.apiBaseUrl ??
      process.env['CODEXLINK_API_URL'] ??
      process.env['API_BASE_URL'] ??
      DEFAULT_API_BASE_URL,
    codexHome:
      expandHomePath(overrides.codexHome) ??
      expandHomePath(process.env['CODEX_HOME']),
    fetchImpl: overrides.fetchImpl ?? fetch,
    logger: overrides.logger ?? console,
    stateRoot: expandHomePath(overrides.stateRoot) ?? getDefaultStateRoot(),
  };
}

async function upsertTrackedSession(
  context: CliContext,
  snapshot: ShareSnapshotInput,
  resolvedFilePath: string,
  progress: ProgressReporter,
): Promise<TrackedSessionState> {
  const state = await progress.step(
    'Loading local share state',
    () => loadAppState(context.stateRoot),
    'Loaded local share state',
  );
  const existing = state.trackedSessions[snapshot.sourceSessionId];
  const client = new CodexLinkApiClient(context.apiBaseUrl, context.fetchImpl);

  if (existing) {
    progress.note(`Found existing tracked share ${existing.shareId}`);

    try {
      if (existing.lastContentHash !== snapshot.contentHash) {
        await progress.step(
          'Uploading updated session snapshot',
          () => client.updateShare(existing.shareId, existing.manageToken, snapshot),
          'Updated existing share',
        );
      } else {
        await progress.step(
          'Checking existing shared session',
          () => client.getShare(existing.shareId),
          'Existing shared session is still available',
        );
      }
    } catch (error) {
      if (!shouldRecreateShare(error)) {
        throw error;
      }

      progress.note('Existing share is no longer available; creating a new one');
      const created = await progress.step(
        'Uploading new shared session',
        () => client.createShare(snapshot),
        'Uploaded new shared session',
      );
      const recreatedTracked: TrackedSessionState = {
        filePath: resolvedFilePath,
        lastContentHash: snapshot.contentHash,
        manageToken: created.manageToken,
        sessionId: snapshot.sourceSessionId,
        shareId: created.shareId,
        title: snapshot.title,
      };
      state.trackedSessions[snapshot.sourceSessionId] = recreatedTracked;
      await progress.step(
        'Saving local share state',
        () => saveAppState(context.stateRoot, state),
        'Saved local share state',
      );
      return recreatedTracked;
    }

    const tracked: TrackedSessionState = {
      ...existing,
      filePath: resolvedFilePath,
      lastContentHash: snapshot.contentHash,
      title: snapshot.title,
    };

    state.trackedSessions[snapshot.sourceSessionId] = tracked;
    await progress.step(
      'Saving local share state',
      () => saveAppState(context.stateRoot, state),
      'Saved local share state',
    );
    return tracked;
  }

  progress.note('No tracked share found for this session');
  const created = await progress.step(
    'Uploading new shared session',
    () => client.createShare(snapshot),
    'Uploaded new shared session',
  );
  const tracked: TrackedSessionState = {
    filePath: resolvedFilePath,
    lastContentHash: snapshot.contentHash,
    manageToken: created.manageToken,
    sessionId: snapshot.sourceSessionId,
    shareId: created.shareId,
    title: snapshot.title,
  };
  state.trackedSessions[snapshot.sourceSessionId] = tracked;
  await progress.step(
    'Saving local share state',
    () => saveAppState(context.stateRoot, state),
    'Saved local share state',
  );
  return tracked;
}

export async function syncSession(
  sessionId: string,
  context: CliContext,
): Promise<TrackedSessionState> {
  const progress = createProgressReporter(context.logger);
  const resolved = await progress.step(
    'Resolving local Codex session',
    () => resolveSessionById(sessionId, context.codexHome),
    'Resolved local Codex session',
  );
  const snapshot = await progress.step(
    'Preparing share snapshot',
    () =>
      buildShareSnapshot({
        rawText: resolved.rawText,
        sessionId: resolved.id,
        sourceUpdatedAt: resolved.sourceUpdatedAt,
        title: resolved.title,
      }),
    'Prepared share snapshot',
  );
  return upsertTrackedSession(context, snapshot, resolved.filePath, progress);
}

export class SessionTracker {
  private debounceHandle: NodeJS.Timeout | null = null;
  private filePath = '';
  private watcher: FSWatcher | null = null;

  constructor(
    private readonly sessionId: string,
    private readonly context: CliContext,
    private readonly debounceMs = 800,
  ) {}

  async start(): Promise<void> {
    const tracked = await syncSession(this.sessionId, this.context);
    this.filePath = tracked.filePath;
    this.watcher = watch(this.filePath, () => {
      this.scheduleSync();
    });
  }

  scheduleSync(): void {
    if (this.debounceHandle) {
      clearTimeout(this.debounceHandle);
    }

    this.debounceHandle = setTimeout(() => {
      void this.runSync().catch((error) => this.context.logger.error(error));
    }, this.debounceMs);
  }

  async runSync(): Promise<void> {
    const state = await loadAppState(this.context.stateRoot);
    const existing = state.trackedSessions[this.sessionId];
    if (!existing) {
      await syncSession(this.sessionId, this.context);
      return;
    }
    const nextTracked = await syncSession(this.sessionId, this.context);
    this.filePath = nextTracked.filePath;
  }

  async dispose(): Promise<void> {
    if (this.debounceHandle) {
      clearTimeout(this.debounceHandle);
      this.debounceHandle = null;
    }
    this.watcher?.close();
    this.watcher = null;
  }
}

export async function revokeTrackedSession(
  target: string,
  context: CliContext,
): Promise<void> {
  const state = await loadAppState(context.stateRoot);
  const tracked =
    state.trackedSessions[target] ??
    Object.values(state.trackedSessions).find((entry) => entry.shareId === target);

  if (!tracked) {
    throw new Error(`No tracked session or share found for ${target}`);
  }

  const client = new CodexLinkApiClient(context.apiBaseUrl, context.fetchImpl);
  await client.revokeShare(tracked.shareId, tracked.manageToken);
  delete state.trackedSessions[tracked.sessionId];
  await saveAppState(context.stateRoot, state);
}

export async function defaultPromptHandler(input: {
  sessionId: string;
  title: string;
}): Promise<boolean> {
  if (platform() !== 'darwin') {
    return false;
  }

  const script = `
    set response to button returned of (display dialog "Track this Codex chat on codexl.ink?\n\n${input.title}\n${input.sessionId}" buttons {"Ignore", "Track"} default button "Track")
    return response
  `;
  const { stdout } = await execFileAsync('osascript', ['-e', script]);
  return stdout.trim() === 'Track';
}

export class MonitorService {
  private trackers = new Map<string, SessionTracker>();

  constructor(
    private readonly context: CliContext,
    private readonly prompt: PromptHandler = defaultPromptHandler,
  ) {}

  async handleSessionIndex(indexEntries: Array<{ id: string; thread_name?: string }>) {
    const state = await loadAppState(this.context.stateRoot);
    const seen = new Set(state.seenSessionIds);

    for (const entry of indexEntries) {
      if (seen.has(entry.id)) {
        continue;
      }

      seen.add(entry.id);
      const accepted = await this.prompt({
        sessionId: entry.id,
        title: entry.thread_name ?? 'Untitled Codex Session',
      });

      if (accepted) {
        const tracker = new SessionTracker(entry.id, this.context);
        await tracker.start();
        this.trackers.set(entry.id, tracker);
      }
    }

    const nextState: AppState = {
      ...state,
      seenSessionIds: [...seen],
    };
    await saveAppState(this.context.stateRoot, nextState);
  }

  async dispose(): Promise<void> {
    await Promise.all([...this.trackers.values()].map((tracker) => tracker.dispose()));
    this.trackers.clear();
  }
}
