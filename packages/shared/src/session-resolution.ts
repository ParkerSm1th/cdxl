import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { ResolvedSession, SessionIndexEntry } from './types';

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function getCodexHome(explicitCodexHome?: string): string {
  return explicitCodexHome ?? process.env['CODEX_HOME'] ?? join(homedir(), '.codex');
}

function parseJsonLine<T>(line: string): T | null {
  try {
    return JSON.parse(line) as T;
  } catch {
    return null;
  }
}

export async function readSessionIndex(
  explicitCodexHome?: string,
): Promise<SessionIndexEntry[]> {
  const codexHome = getCodexHome(explicitCodexHome);
  const indexPath = join(codexHome, 'session_index.jsonl');
  if (!(await pathExists(indexPath))) {
    return [];
  }

  const raw = await readFile(indexPath, 'utf8');
  return raw
    .split('\n')
    .flatMap((line) => {
      if (!line.trim()) {
        return [];
      }
      const entry = parseJsonLine<SessionIndexEntry>(line);
      return entry ? [entry] : [];
    });
}

async function findSessionFileById(
  directory: string,
  sessionId: string,
): Promise<string | null> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await findSessionFileById(fullPath, sessionId);
      if (nested) {
        return nested;
      }
      continue;
    }

    if (!entry.name.endsWith('.jsonl')) {
      continue;
    }

    if (entry.name.includes(sessionId)) {
      return fullPath;
    }

    const firstLine = (await readFile(fullPath, 'utf8')).split('\n', 1)[0] ?? '';
    if (firstLine.includes(sessionId)) {
      return fullPath;
    }
  }

  return null;
}

export async function resolveSessionById(
  sessionId: string,
  explicitCodexHome?: string,
): Promise<ResolvedSession> {
  const codexHome = getCodexHome(explicitCodexHome);
  const index = await readSessionIndex(codexHome);
  const indexEntry = index.find((entry) => entry.id === sessionId);
  const sessionsRoot = join(codexHome, 'sessions');
  const filePath = await findSessionFileById(sessionsRoot, sessionId);

  if (!filePath) {
    throw new Error(`Could not find session file for ${sessionId}`);
  }

  const fileStat = await stat(filePath);
  const rawText = await readFile(filePath, 'utf8');

  return {
    filePath,
    id: sessionId,
    rawText,
    sourceUpdatedAt:
      indexEntry?.updated_at ?? fileStat.mtime.toISOString(),
    title: indexEntry?.thread_name ?? 'Untitled Codex Session',
  };
}

