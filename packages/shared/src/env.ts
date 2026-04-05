import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, parse, resolve } from 'node:path';

let envLoaded = false;

function findEnvDirectory(startDir: string): string | null {
  let currentDir = resolve(startDir);
  const rootDir = parse(currentDir).root;

  while (true) {
    if (
      existsSync(join(currentDir, '.env')) ||
      existsSync(join(currentDir, '.env.local'))
    ) {
      return currentDir;
    }

    if (currentDir === rootDir) {
      return null;
    }

    currentDir = dirname(currentDir);
  }
}

function decodeQuotedValue(input: string): string {
  if (input.startsWith('"') && input.endsWith('"')) {
    return input
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  if (input.startsWith('\'') && input.endsWith('\'')) {
    return input.slice(1, -1);
  }

  const commentIndex = input.search(/\s#/);
  return (commentIndex >= 0 ? input.slice(0, commentIndex) : input).trim();
}

function parseEnvFile(path: string): Record<string, string> {
  const content = readFileSync(path, 'utf8');
  const entries: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const trimmedLine = rawLine.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const line = trimmedLine.startsWith('export ')
      ? trimmedLine.slice('export '.length).trim()
      : trimmedLine;
    const separatorIndex = line.indexOf('=');

    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    const rawValue = line.slice(separatorIndex + 1).trim();
    entries[key] = decodeQuotedValue(rawValue);
  }

  return entries;
}

function loadEnvFile(path: string, override = false): void {
  if (!existsSync(path)) {
    return;
  }

  const parsed = parseEnvFile(path);

  for (const [key, value] of Object.entries(parsed)) {
    if (!override && process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = value;
  }
}

export function loadCodexLinkEnv(): void {
  if (envLoaded) {
    return;
  }

  const candidates = [
    process.env['INIT_CWD'],
    process.cwd(),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const envDir = findEnvDirectory(candidate);
    if (!envDir) {
      continue;
    }

    loadEnvFile(join(envDir, '.env'));
    loadEnvFile(join(envDir, '.env.local'), true);
    envLoaded = true;
    return;
  }

  envLoaded = true;
}

export function expandHomePath(value: string | undefined): string | undefined {
  if (!value) {
    return value;
  }

  if (value === '~') {
    return homedir();
  }

  if (value.startsWith('~/')) {
    return join(homedir(), value.slice(2));
  }

  return value;
}
