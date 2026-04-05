import {
  randomBytes,
  createHash,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { buildPublicShareUrl, type ShareSnapshotInput } from '@codexlink/shared';
import type { ShareRepository, StoredShare } from '@codexlink/db';
import { z } from 'zod';

const MAX_GZIP_BYTES = 10 * 1024 * 1024;

const metadataSchema = z.object({
  contentHash: z.string().min(32),
  renderPayload: z.object({
    createdAt: z.string(),
    entries: z.array(z.any()),
    excerpt: z.string(),
    id: z.string(),
    sourceUpdatedAt: z.string(),
    stats: z.object({
      assistantMessages: z.number(),
      toolCalls: z.number(),
      toolOutputs: z.number(),
      userMessages: z.number(),
    }),
    title: z.string(),
  }),
  sourceSessionId: z.string(),
  sourceUpdatedAt: z.string(),
  stats: z.object({
    assistantMessages: z.number(),
    toolCalls: z.number(),
    toolOutputs: z.number(),
    userMessages: z.number(),
  }),
  title: z.string(),
});

type AppOptions = {
  siteUrl: string;
  storage: 'memory' | 'postgres';
};

function createManageToken(): string {
  return randomBytes(24).toString('base64url');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function verifyToken(actualToken: string, expectedHash: string): boolean {
  const actualHash = Buffer.from(hashToken(actualToken), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actualHash.length === expected.length && timingSafeEqual(actualHash, expected);
}

function requireBearerToken(header: string | undefined): string {
  if (!header?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing bearer token' });
  }
  return header.slice('Bearer '.length);
}

function createSnapshotInput(
  metadata: z.infer<typeof metadataSchema>,
  rawBytes: Uint8Array,
): ShareSnapshotInput {
  if (rawBytes.byteLength > MAX_GZIP_BYTES) {
    throw new HTTPException(413, { message: 'Snapshot exceeds 10 MB limit' });
  }

  return {
    contentHash: metadata.contentHash,
    rawJsonlGzip: rawBytes,
    renderPayload: metadata.renderPayload,
    sourceSessionId: metadata.sourceSessionId,
    sourceUpdatedAt: metadata.sourceUpdatedAt,
    stats: metadata.stats,
    title: metadata.title,
  };
}

async function parseMultipartSnapshot(request: Request): Promise<ShareSnapshotInput> {
  const formData = await request.formData();
  const metadataText = formData.get('metadata');
  const file = formData.get('sessionFile');

  if (typeof metadataText !== 'string') {
    throw new HTTPException(400, { message: 'metadata field is required' });
  }

  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: 'sessionFile field is required' });
  }

  const metadata = metadataSchema.parse(JSON.parse(metadataText));
  const rawBytes = new Uint8Array(await file.arrayBuffer());
  return createSnapshotInput(metadata, rawBytes);
}

function toShareResponse(share: StoredShare) {
  if (!share.latestSnapshot) {
    throw new HTTPException(500, { message: 'Share is missing a latest snapshot' });
  }

  return {
    createdAt: share.createdAt,
    data: share.latestSnapshot.renderPayload,
    shareId: share.publicId,
    status: share.status,
    updatedAt: share.updatedAt,
  };
}

async function getAuthorizedShare(
  repository: ShareRepository,
  publicId: string,
  bearerToken: string,
): Promise<StoredShare> {
  const share = await repository.findShareByPublicId(publicId);
  if (!share) {
    throw new HTTPException(404, { message: 'Share not found' });
  }

  if (!verifyToken(bearerToken, share.manageTokenHash)) {
    throw new HTTPException(403, { message: 'Invalid manage token' });
  }

  return share;
}

export function createApp(repository: ShareRepository, options: AppOptions) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, storage: options.storage }));

  app.post('/v1/shares', async (c) => {
    const snapshot = await parseMultipartSnapshot(c.req.raw);
    const manageToken = createManageToken();
    const share = await repository.createShare({
      manageTokenHash: hashToken(manageToken),
      publicId: randomUUID(),
      snapshot,
    });

    return c.json(
      {
        manageToken,
        shareId: share.publicId,
        url: buildPublicShareUrl(options.siteUrl, share.publicId),
      },
      201,
    );
  });

  app.put('/v1/shares/:shareId', async (c) => {
    const bearerToken = requireBearerToken(c.req.header('authorization'));
    const share = await getAuthorizedShare(repository, c.req.param('shareId'), bearerToken);
    const snapshot = await parseMultipartSnapshot(c.req.raw);

    if (share.latestSnapshot?.contentHash === snapshot.contentHash) {
      return c.json(toShareResponse(share), 200);
    }

    const updatedShare = await repository.updateShareSnapshot(share.id, snapshot);
    return c.json(toShareResponse(updatedShare), 200);
  });

  app.delete('/v1/shares/:shareId', async (c) => {
    const bearerToken = requireBearerToken(c.req.header('authorization'));
    const share = await getAuthorizedShare(repository, c.req.param('shareId'), bearerToken);
    const revokedShare = await repository.revokeShare(share.id);
    return c.json(
      {
        createdAt: revokedShare.createdAt,
        shareId: revokedShare.publicId,
        status: revokedShare.status,
        updatedAt: revokedShare.updatedAt,
      },
      200,
    );
  });

  app.get('/v1/shares/:shareId', async (c) => {
    const share = await repository.findShareByPublicId(c.req.param('shareId'));
    if (!share) {
      throw new HTTPException(404, { message: 'Share not found' });
    }
    if (share.status === 'revoked') {
      return c.json(
        {
          createdAt: share.createdAt,
          shareId: share.publicId,
          status: share.status,
          updatedAt: share.updatedAt,
        },
        410,
      );
    }
    return c.json(toShareResponse(share), 200);
  });

  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return c.json({ error: error.message }, error.status);
    }

    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}
