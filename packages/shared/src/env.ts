import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, parse, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

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

function loadEnvFile(path: string, override = false): void {
  if (!existsSync(path)) {
    return;
  }

  loadEnv({ override, path });
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
