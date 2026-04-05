#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROD_ENV = {
  API_BASE_URL: 'https://api.codexl.ink',
  CODEXLINK_API_URL: 'https://api.codexl.ink',
  SITE_URL: 'https://codexl.ink',
};

const SENSITIVE_PATTERNS = [
  /sk-[A-Za-z0-9]{20,}/,
  /BEGIN [A-Z ]*PRIVATE KEY/,
  /AKIA[0-9A-Z]{16}/,
  /postgres(?:ql)?:\/\/[^"'`\s]+/i,
];

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(scriptDir, '..');

function run(command, args, cwd, env, captureOutput = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env,
    stdio: captureOutput ? 'pipe' : 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} exited with code ${result.status}`);
  }

  return result.stdout ?? '';
}

function buildPublishManifest(packageJson) {
  const manifest = {
    name: packageJson.name,
    version: packageJson.version,
    type: packageJson.type,
    bin: packageJson.bin,
    description: packageJson.description ?? 'Publish and track Codex chats',
    engines: packageJson.engines ?? { node: '>=22' },
    publishConfig: {
      access: 'public',
    },
  };

  if (packageJson.license) {
    manifest.license = packageJson.license;
  }

  if (packageJson.repository) {
    manifest.repository = packageJson.repository;
  }

  if (packageJson.homepage) {
    manifest.homepage = packageJson.homepage;
  }

  if (packageJson.bugs) {
    manifest.bugs = packageJson.bugs;
  }

  if (packageJson.keywords) {
    manifest.keywords = packageJson.keywords;
  }

  if (packageJson.dependencies?.commander) {
    manifest.dependencies = {
      commander: packageJson.dependencies.commander,
    };
  }

  return manifest;
}

function assertSafeBundle(bundleText) {
  if (bundleText.includes('http://localhost:8787')) {
    throw new Error('Refusing to publish a CLI bundle with localhost defaults.');
  }

  if (!bundleText.includes(PROD_ENV.CODEXLINK_API_URL)) {
    throw new Error('Expected production API URL to be baked into the CLI fallback.');
  }

  if (!bundleText.includes(PROD_ENV.SITE_URL)) {
    throw new Error('Expected production site URL to be baked into the CLI fallback.');
  }

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(bundleText)) {
      throw new Error(`Refusing to publish: bundle matched sensitive pattern ${pattern}`);
    }
  }
}

function assertSafePack(packJson) {
  const allowedPaths = new Set(['dist/index.js', 'package.json']);

  for (const file of packJson.files ?? []) {
    if (!allowedPaths.has(file.path)) {
      throw new Error(`Refusing to publish unexpected file: ${file.path}`);
    }
  }
}

async function main() {
  const publishArgs = process.argv.slice(2);
  const normalizedPublishArgs =
    publishArgs[0] === '--' ? publishArgs.slice(1) : publishArgs;
  const env = {
    ...process.env,
    ...PROD_ENV,
  };

  run('pnpm', ['build'], packageDir, env);

  const stagingDir = await mkdtemp(join(tmpdir(), 'cdxl-publish-'));

  try {
    const packageJson = JSON.parse(
      await readFile(join(packageDir, 'package.json'), 'utf8'),
    );

    await cp(join(packageDir, 'dist'), join(stagingDir, 'dist'), {
      recursive: true,
    });
    await writeFile(
      join(stagingDir, 'package.json'),
      `${JSON.stringify(buildPublishManifest(packageJson), null, 2)}\n`,
    );

    const bundleText = await readFile(join(stagingDir, 'dist/index.js'), 'utf8');
    assertSafeBundle(bundleText);

    const packOutput = run(
      'npm',
      ['pack', '--json', '--dry-run'],
      stagingDir,
      env,
      true,
    );
    const packJson = JSON.parse(packOutput)[0];
    assertSafePack(packJson);

    run(
      'npm',
      ['publish', '--access', 'public', ...normalizedPublishArgs],
      stagingDir,
      env,
    );
  } finally {
    await rm(stagingDir, { force: true, recursive: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
