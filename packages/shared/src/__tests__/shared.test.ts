import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildPublicShareUrl,
  buildShareSnapshot,
  hashContent,
  parseSessionJsonl,
  redactText,
  resolveSessionById,
} from '../index';

const SAMPLE_SESSION_ID = '019-test-session';

const SAMPLE_JSONL = [
  JSON.stringify({
    timestamp: '2026-04-04T00:00:00.000Z',
    type: 'session_meta',
    payload: { id: SAMPLE_SESSION_ID },
  }),
  JSON.stringify({
    timestamp: '2026-04-04T00:00:01.000Z',
    type: 'response_item',
    payload: {
      type: 'message',
      role: 'developer',
      content: [{ text: 'hidden instructions' }],
    },
  }),
  JSON.stringify({
    timestamp: '2026-04-04T00:00:02.000Z',
    type: 'response_item',
    payload: {
      type: 'message',
      role: 'user',
      content: [
        { type: 'input_text', text: '<image name=[Image #1]>' },
        { type: 'input_image', image_url: 'data:image/png;base64,AAAA' },
        { type: 'input_text', text: '</image>' },
        { type: 'input_text', text: 'Please export this chat.\n' },
      ],
    },
  }),
  JSON.stringify({
    timestamp: '2026-04-04T00:00:02.100Z',
    type: 'event_msg',
    payload: {
      type: 'user_message',
      message: 'Please export this chat. [Image #1]',
    },
  }),
  JSON.stringify({
    timestamp: '2026-04-04T00:00:02.200Z',
    type: 'turn_context',
    payload: {
      cwd: '/Users/parker/Desktop/Personal/codexlink',
    },
  }),
  JSON.stringify({
    timestamp: '2026-04-04T00:00:02.300Z',
    type: 'event_msg',
    payload: {
      type: 'agent_reasoning',
      text: 'Inspecting the local Codex session file.',
    },
  }),
  JSON.stringify({
    timestamp: '2026-04-04T00:00:03.000Z',
    type: 'response_item',
    payload: {
      type: 'function_call',
      name: 'shell_command',
      arguments: '{"command":"cat /Users/parker/secret.txt"}',
    },
  }),
  JSON.stringify({
    timestamp: '2026-04-04T00:00:04.000Z',
    type: 'response_item',
    payload: {
      type: 'function_call_output',
      name: 'shell_command',
      output:
        'Authorization: Bearer sk_test_1234567890abcdef /Users/parker/file.txt',
    },
  }),
  JSON.stringify({
    timestamp: '2026-04-04T00:00:05.000Z',
    type: 'event_msg',
    payload: {
      type: 'agent_message',
      message: 'Done. Here is the share link.',
    },
  }),
  JSON.stringify({
    timestamp: '2026-04-04T00:00:05.100Z',
    type: 'response_item',
    payload: {
      type: 'message',
      role: 'assistant',
      content: [{ text: 'Done. Here is the share link.' }],
    },
  }),
].join('\n');

describe('shared session helpers', () => {
  it('resolves a session via session index metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'codexlink-shared-'));
    const codexHome = join(root, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '04', '04');
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      join(codexHome, 'session_index.jsonl'),
      `${JSON.stringify({
        id: SAMPLE_SESSION_ID,
        thread_name: 'Export a Codex chat',
        updated_at: '2026-04-04T01:00:00.000Z',
      })}\n`,
    );
    const sessionFile = join(sessionDir, `rollout-${SAMPLE_SESSION_ID}.jsonl`);
    await writeFile(sessionFile, SAMPLE_JSONL);

    const resolved = await resolveSessionById(SAMPLE_SESSION_ID, codexHome);
    expect(resolved.filePath).toBe(sessionFile);
    expect(resolved.title).toBe('Export a Codex chat');
    expect(resolved.sourceUpdatedAt).toBe('2026-04-04T01:00:00.000Z');
  });

  it('falls back to scanning files when the session index is missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'codexlink-shared-fallback-'));
    const codexHome = join(root, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '04', '04');
    await mkdir(sessionDir, { recursive: true });
    await writeFile(join(sessionDir, 'rollout-other.jsonl'), SAMPLE_JSONL);

    const resolved = await resolveSessionById(SAMPLE_SESSION_ID, codexHome);
    expect(resolved.title).toBe('Untitled Codex Session');
    expect(resolved.rawText).toContain('Please export this chat.');
  });

  it('parses transcript entries, redacts sensitive content, and hashes snapshots', () => {
    const renderPayload = parseSessionJsonl(SAMPLE_JSONL, {
      sourceUpdatedAt: '2026-04-04T01:00:00.000Z',
      title: 'Export a Codex chat',
    });

    expect(renderPayload.stats).toEqual({
      assistantMessages: 1,
      toolCalls: 1,
      toolOutputs: 1,
      userMessages: 1,
    });
    expect(renderPayload.entries).toHaveLength(5);
    expect(renderPayload.entries[0]).toMatchObject({
      kind: 'message',
      role: 'user',
      text: 'Please export this chat.',
      images: [
        {
          alt: 'Image 1',
          src: 'data:image/png;base64,AAAA',
        },
      ],
    });
    expect(renderPayload.entries[1]).toMatchObject({
      kind: 'commentary',
      text: 'Inspecting the local Codex session file.',
    });
    expect(renderPayload.entries[2]).toMatchObject({
      kind: 'tool_call',
      input: expect.stringContaining('<redacted-path>'),
    });
    expect(renderPayload.entries[3]).toMatchObject({
      kind: 'tool_output',
      output: expect.stringContaining('<redacted-secret>'),
    });

    const snapshot = buildShareSnapshot({
      rawText: SAMPLE_JSONL,
      sessionId: SAMPLE_SESSION_ID,
      sourceUpdatedAt: '2026-04-04T01:00:00.000Z',
      title: 'Export a Codex chat',
    });
    expect(snapshot.renderPayload.id).toBe(SAMPLE_SESSION_ID);
    expect(hashContent(SAMPLE_JSONL)).toBe(snapshot.contentHash);
    expect(redactText('path /Users/parker/a.txt token=abc')).toContain(
      '<redacted-path>',
    );
  });

  it('falls back to event messages when mirrored response items are missing', () => {
    const eventOnlyJsonl = [
      JSON.stringify({
        timestamp: '2026-04-04T02:00:00.000Z',
        type: 'session_meta',
        payload: { id: SAMPLE_SESSION_ID },
      }),
      JSON.stringify({
        timestamp: '2026-04-04T02:00:01.000Z',
        type: 'event_msg',
        payload: {
          type: 'user_message',
          message: 'Share this old session.',
        },
      }),
      JSON.stringify({
        timestamp: '2026-04-04T02:00:02.000Z',
        type: 'event_msg',
        payload: {
          type: 'agent_reasoning',
          text: 'Collecting the available session records.',
        },
      }),
      JSON.stringify({
        timestamp: '2026-04-04T02:00:03.000Z',
        type: 'event_msg',
        payload: {
          type: 'agent_message',
          message: 'Done.',
        },
      }),
    ].join('\n');

    const renderPayload = parseSessionJsonl(eventOnlyJsonl, {
      sourceUpdatedAt: '2026-04-04T02:10:00.000Z',
      title: 'Legacy Event Session',
    });

    expect(renderPayload.entries).toEqual([
      {
        createdAt: '2026-04-04T02:00:01.000Z',
        id: 'message-1',
        kind: 'message',
        role: 'user',
        text: 'Share this old session.',
      },
      {
        createdAt: '2026-04-04T02:00:02.000Z',
        id: 'commentary-1',
        kind: 'commentary',
        text: 'Collecting the available session records.',
      },
      {
        createdAt: '2026-04-04T02:00:03.000Z',
        id: 'message-2',
        kind: 'message',
        role: 'assistant',
        text: 'Done.',
      },
    ]);
  });

  it('builds canonical public share URLs under /c', () => {
    expect(buildPublicShareUrl('https://codexl.ink', 'abc123')).toBe(
      'https://codexl.ink/c/abc123',
    );
    expect(buildPublicShareUrl('https://codexl.ink/', 'abc123')).toBe(
      'https://codexl.ink/c/abc123',
    );
  });
});
