import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const rootDir = fileURLToPath(new URL('../..', import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(rootDir),
  transpilePackages: ['@codexlink/shared'],
};

export default nextConfig;
