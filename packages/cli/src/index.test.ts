import { createProgram } from './index';
import { readFileSync } from 'node:fs';

describe('cli help output', () => {
  it('shows command descriptions in the top-level help', () => {
    const program = createProgram();
    const help = program.helpInformation();

    expect(help).toContain('share [options] <sessionId>');
    expect(help).toMatch(
      /Create a public share for one Codex[\s\S]*session and print its URL\./,
    );
    expect(help).toContain('track [options] <sessionId>');
    expect(help).toMatch(
      /Keep one session synced to the same[\s\S]*public link as new messages arrive\./,
    );
    expect(help).toContain('monitor [options]');
    expect(help).toMatch(
      /Watch for new local Codex sessions and[\s\S]*offer to start tracking them\./,
    );
    expect(help).toContain('unshare [options] <shareOrSessionId>');
    expect(help).toMatch(
      /Revoke a public share by share ID or by[\s\S]*a locally tracked session ID\./,
    );
  });

  it('includes argument and option details in subcommand help', () => {
    const program = createProgram();
    const shareHelp = program.commands.find((command) => command.name() === 'share')?.helpInformation();

    expect(shareHelp).toContain('Usage: cdxl share [options] <sessionId>');
    expect(shareHelp).toContain('Create a public share for one Codex session and print its URL.');
    expect(shareHelp).toContain('sessionId        Codex session ID to publish');
    expect(shareHelp).toContain('--api-url <url>  Override the CodexLink API base URL');
  });

  it('points the dev script at the executable entrypoint', () => {
    const packageJson = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.dev).toBe('tsx src/bin.ts');
  });
});
