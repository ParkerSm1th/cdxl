import { vi } from 'vitest';
import { normalizeCliArgv, runCli } from './bin';

describe('cli bin entrypoint', () => {
  it('strips a leading package-manager argument delimiter', () => {
    expect(normalizeCliArgv(['node', 'bin.js', '--', '--help'])).toEqual(['node', 'bin.js', '--help']);
    expect(normalizeCliArgv(['node', 'bin.js', '--', 'share', 'session-123'])).toEqual([
      'node',
      'bin.js',
      'share',
      'session-123',
    ]);
  });

  it('shows help when invoked without any command arguments', async () => {
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await runCli(['node', 'bin.js']);

    const output = stdoutWrite.mock.calls
      .map(([chunk]) => (typeof chunk === 'string' ? chunk : chunk.toString()))
      .join('');

    expect(output).toContain('Usage: cdxl [options] [command]');

    stdoutWrite.mockRestore();
  });
});
