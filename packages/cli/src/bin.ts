#!/usr/bin/env node
import { CommanderError } from 'commander';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createProgram } from './index';

export function normalizeCliArgv(argv: string[]): string[] {
  return argv[2] === '--' ? [argv[0] ?? 'node', argv[1] ?? 'cdxl', ...argv.slice(3)] : argv;
}

export async function runCli(argv = process.argv): Promise<void> {
  const normalizedArgv = normalizeCliArgv(argv);
  const program = createProgram();

  if (normalizedArgv.length <= 2) {
    program.outputHelp();
    return;
  }

  await program.parseAsync(normalizedArgv);
}

function getRealFileUrl(path: string | undefined): string | null {
  if (!path) {
    return null;
  }

  try {
    return pathToFileURL(realpathSync(path)).href;
  } catch {
    return pathToFileURL(path).href;
  }
}

const isDirectExecution = getRealFileUrl(process.argv[1]) === getRealFileUrl(new URL(import.meta.url).pathname);

if (isDirectExecution) {
  runCli().catch((error: unknown) => {
    if (error != null) {
      console.error(error);
    }

    process.exitCode = error instanceof CommanderError ? error.exitCode : 1;
  });
}
