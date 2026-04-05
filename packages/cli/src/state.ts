import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';
import { expandHomePath } from '@codexlink/shared';

export type TrackedSessionState = {
  filePath: string;
  lastContentHash: string;
  manageToken: string;
  sessionId: string;
  shareId: string;
  title: string;
};

export type AppState = {
  seenSessionIds: string[];
  trackedSessions: Record<string, TrackedSessionState>;
};

const EMPTY_STATE: AppState = {
  seenSessionIds: [],
  trackedSessions: {},
};

export function getDefaultStateRoot(): string {
  if (process.env['CODEXLINK_STATE_DIR']) {
    return expandHomePath(process.env['CODEXLINK_STATE_DIR']) ?? process.env['CODEXLINK_STATE_DIR'];
  }

  if (platform() === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'CodexLink');
  }

  return join(
    process.env['XDG_STATE_HOME'] ?? join(homedir(), '.local', 'state'),
    'codexlink',
  );
}

function getStatePath(stateRoot: string): string {
  return join(stateRoot, 'state.json');
}

export async function loadAppState(stateRoot: string): Promise<AppState> {
  try {
    const raw = await readFile(getStatePath(stateRoot), 'utf8');
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...EMPTY_STATE, ...parsed };
  } catch {
    return EMPTY_STATE;
  }
}

export async function saveAppState(
  stateRoot: string,
  state: AppState,
): Promise<void> {
  await mkdir(stateRoot, { recursive: true });
  await writeFile(getStatePath(stateRoot), JSON.stringify(state, null, 2));
}
