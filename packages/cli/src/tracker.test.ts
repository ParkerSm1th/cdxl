import { mkdir, rm, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMemoryRepository } from '../../db/src';
import { createApp } from '../../../apps/api/src/app';
import { MonitorService, SessionTracker, createCliContext, syncSession } from './tracker';

async function createCodexHome(rawLines: string[]) {
  const root = await mkdtemp(join(tmpdir(), 'codexlink-cli-'));
  const codexHome = join(root, '.codex');
  const sessionsDir = join(codexHome, 'sessions', '2026', '04', '04');
  await mkdir(sessionsDir, { recursive: true });
  await writeFile(
    join(codexHome, 'session_index.jsonl'),
    `${JSON.stringify({
      id: 'session-1',
      thread_name: 'Tracked session',
      updated_at: '2026-04-04T00:00:00.000Z',
    })}\n`,
  );
  const sessionFile = join(sessionsDir, 'rollout-session-1.jsonl');
  await writeFile(sessionFile, rawLines.join('\n'));
  return { codexHome, root, sessionFile };
}

function createFetchCounter() {
  const repository = createMemoryRepository();
  const app = createApp(repository, { siteUrl: 'https://codexl.ink' });
  const calls: string[] = [];

  return {
    calls,
    fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init?.method ?? 'GET');
      return app.request(input, init);
    },
  };
}

describe('cli sync and tracking', () => {
  it('creates a share and updates it when tracked content changes', async () => {
    const rawLines = [
      JSON.stringify({
        timestamp: '2026-04-04T00:00:00.000Z',
        type: 'session_meta',
        payload: { id: 'session-1' },
      }),
      JSON.stringify({
        timestamp: '2026-04-04T00:00:01.000Z',
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'user',
          content: [{ text: 'First draft' }],
        },
      }),
    ];
    const { codexHome, root, sessionFile } = await createCodexHome(rawLines);
    const counter = createFetchCounter();
    const context = createCliContext({
      apiBaseUrl: 'http://test.local',
      codexHome,
      fetchImpl: counter.fetchImpl as typeof fetch,
      logger: { error: vi.fn(), log: vi.fn() },
      stateRoot: join(root, 'state'),
    });

    const tracked = await syncSession('session-1', context);
    expect(tracked.shareId).toBeTruthy();
    expect(counter.calls.filter((method) => method === 'POST')).toHaveLength(1);

    const tracker = new SessionTracker('session-1', context, 10);
    await tracker.start();
    expect(counter.calls.filter((method) => method === 'POST')).toHaveLength(1);

    tracker.scheduleSync();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(counter.calls.filter((method) => method === 'PUT')).toHaveLength(0);

    await writeFile(
      sessionFile,
      [
        ...rawLines,
        JSON.stringify({
          timestamp: '2026-04-04T00:00:02.000Z',
          type: 'response_item',
          payload: {
            type: 'message',
            role: 'assistant',
            content: [{ text: 'Live update' }],
          },
        }),
      ].join('\n'),
    );

    tracker.scheduleSync();
    tracker.scheduleSync();
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(counter.calls.filter((method) => method === 'PUT')).toHaveLength(1);
    await tracker.dispose();
  });

  it('recreates a share when local tracked state points to a missing server share', async () => {
    const rawLines = [
      JSON.stringify({
        timestamp: '2026-04-04T00:00:00.000Z',
        type: 'session_meta',
        payload: { id: 'session-1' },
      }),
      JSON.stringify({
        timestamp: '2026-04-04T00:00:01.000Z',
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'user',
          content: [{ text: 'First draft' }],
        },
      }),
    ];
    const { codexHome, root } = await createCodexHome(rawLines);
    const firstCounter = createFetchCounter();
    const secondCounter = createFetchCounter();
    const stateRoot = join(root, 'state');

    const firstContext = createCliContext({
      apiBaseUrl: 'http://test.local',
      codexHome,
      fetchImpl: firstCounter.fetchImpl as typeof fetch,
      logger: { error: vi.fn(), log: vi.fn() },
      stateRoot,
    });

    const firstTracked = await syncSession('session-1', firstContext);
    expect(firstCounter.calls.filter((method) => method === 'POST')).toHaveLength(1);

    await rm(stateRoot, { force: true, recursive: true });
    await mkdir(stateRoot, { recursive: true });
    await writeFile(
      join(stateRoot, 'state.json'),
      JSON.stringify(
        {
          seenSessionIds: [],
          trackedSessions: {
            'session-1': firstTracked,
          },
        },
        null,
        2,
      ),
    );

    const secondContext = createCliContext({
      apiBaseUrl: 'http://test.local',
      codexHome,
      fetchImpl: secondCounter.fetchImpl as typeof fetch,
      logger: { error: vi.fn(), log: vi.fn() },
      stateRoot,
    });

    const nextTracked = await syncSession('session-1', secondContext);
    expect(secondCounter.calls).toContain('GET');
    expect(secondCounter.calls.filter((method) => method === 'POST')).toHaveLength(1);
    expect(nextTracked.shareId).not.toBe(firstTracked.shareId);
  });

  it('suppresses duplicate prompts for the same session in monitor mode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'codexlink-monitor-'));
    const prompt = vi.fn().mockResolvedValue(false);
    const service = new MonitorService(
      createCliContext({
        apiBaseUrl: 'http://test.local',
        codexHome: join(root, '.codex'),
        fetchImpl: createFetchCounter().fetchImpl as typeof fetch,
        logger: { error: vi.fn(), log: vi.fn() },
        stateRoot: join(root, 'state'),
      }),
      prompt,
    );

    await service.handleSessionIndex([{ id: 'session-1', thread_name: 'Tracked session' }]);
    await service.handleSessionIndex([{ id: 'session-1', thread_name: 'Tracked session' }]);
    expect(prompt).toHaveBeenCalledTimes(1);
    await service.dispose();
  });
});
