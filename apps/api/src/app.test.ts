import { gunzipSync } from 'node:zlib';
import { createMemoryRepository } from '@codexlink/db';
import { buildShareSnapshot } from '@codexlink/shared';
import { createApp } from './app';

function createMultipart(snapshot = buildShareSnapshot({
  rawText: JSON.stringify({
    timestamp: '2026-04-04T00:00:00.000Z',
    type: 'response_item',
    payload: {
      type: 'message',
      role: 'user',
      content: [{ text: 'hello' }],
    },
  }),
  sessionId: 'session-1',
  sourceUpdatedAt: '2026-04-04T00:00:00.000Z',
  title: 'Session 1',
})) {
  const formData = new FormData();
  formData.set(
    'metadata',
    JSON.stringify({
      contentHash: snapshot.contentHash,
      renderPayload: snapshot.renderPayload,
      sourceSessionId: snapshot.sourceSessionId,
      sourceUpdatedAt: snapshot.sourceUpdatedAt,
      stats: snapshot.stats,
      title: snapshot.title,
    }),
  );
  formData.set(
    'sessionFile',
    new File([snapshot.rawJsonlGzip], 'session.jsonl.gz', {
      type: 'application/gzip',
    }),
  );
  return { formData, snapshot };
}

describe('api create/update/revoke flow', () => {
  it('creates, updates idempotently, reads, and revokes a share', async () => {
    const app = createApp(createMemoryRepository(), {
      siteUrl: 'https://codexl.ink',
      storage: 'memory',
    });

    const created = await app.request('/v1/shares', {
      body: createMultipart().formData,
      method: 'POST',
    });
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.url).toBe(`https://codexl.ink/c/${createdBody.shareId}`);
    expect(createdBody.manageToken).toBeTruthy();

    const read = await app.request(`/v1/shares/${createdBody.shareId}`);
    expect(read.status).toBe(200);
    const readBody = await read.json();
    expect(readBody.data.title).toBe('Session 1');

    const sameUpdate = await app.request(`/v1/shares/${createdBody.shareId}`, {
      body: createMultipart().formData,
      headers: { authorization: `Bearer ${createdBody.manageToken}` },
      method: 'PUT',
    });
    expect(sameUpdate.status).toBe(200);

    const updatedSnapshot = buildShareSnapshot({
      rawText: [
        JSON.stringify({
          timestamp: '2026-04-04T00:00:00.000Z',
          type: 'response_item',
          payload: {
            type: 'message',
            role: 'user',
            content: [{ text: 'hello' }],
          },
        }),
        JSON.stringify({
          timestamp: '2026-04-04T00:00:01.000Z',
          type: 'response_item',
          payload: {
            type: 'message',
            role: 'assistant',
            content: [{ text: 'updated' }],
          },
        }),
      ].join('\n'),
      sessionId: 'session-1',
      sourceUpdatedAt: '2026-04-04T00:01:00.000Z',
      title: 'Session 1',
    });
    const changed = await app.request(`/v1/shares/${createdBody.shareId}`, {
      body: createMultipart(updatedSnapshot).formData,
      headers: { authorization: `Bearer ${createdBody.manageToken}` },
      method: 'PUT',
    });
    expect(changed.status).toBe(200);

    const changedRead = await app.request(`/v1/shares/${createdBody.shareId}`);
    const changedBody = await changedRead.json();
    expect(changedBody.data.entries).toHaveLength(2);

    const revoked = await app.request(`/v1/shares/${createdBody.shareId}`, {
      headers: { authorization: `Bearer ${createdBody.manageToken}` },
      method: 'DELETE',
    });
    expect(revoked.status).toBe(200);

    const revokedRead = await app.request(`/v1/shares/${createdBody.shareId}`);
    expect(revokedRead.status).toBe(410);

    expect(
      gunzipSync(updatedSnapshot.rawJsonlGzip).toString('utf8'),
    ).toContain('updated');
  });
});
