import { Buffer } from 'node:buffer';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import type { ShareSnapshotInput } from '@codexlink/shared';
import { shareSnapshots, shares } from './schema';
import type { CreateShareInput, ShareRepository, StoredShare, StoredSnapshot } from './repository';

function toStoredSnapshot(row: typeof shareSnapshots.$inferSelect): StoredSnapshot {
  return {
    contentHash: row.contentHash,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    rawJsonlGzip: Uint8Array.from(Buffer.from(row.rawJsonlGzipBase64, 'base64')),
    renderPayload: row.renderPayloadJson,
    shareId: row.shareId,
    sourceUpdatedAt: row.sourceUpdatedAt.toISOString(),
    stats: row.statsJson,
  };
}

function toStoredShare(
  shareRow: typeof shares.$inferSelect,
  snapshotRow: typeof shareSnapshots.$inferSelect | null,
): StoredShare {
  return {
    createdAt: shareRow.createdAt.toISOString(),
    id: shareRow.id,
    latestSnapshot: snapshotRow ? toStoredSnapshot(snapshotRow) : null,
    manageTokenHash: shareRow.manageTokenHash,
    publicId: shareRow.publicId,
    revokedAt: shareRow.revokedAt?.toISOString() ?? null,
    sourceSessionId: shareRow.sourceSessionId,
    status: shareRow.status,
    title: shareRow.title,
    updatedAt: shareRow.updatedAt.toISOString(),
  };
}

async function insertSnapshot(
  tx: any,
  shareId: string,
  snapshot: ShareSnapshotInput,
): Promise<typeof shareSnapshots.$inferSelect> {
  const [snapshotRow] = await tx
    .insert(shareSnapshots)
    .values({
      contentHash: snapshot.contentHash,
      rawJsonlGzipBase64: Buffer.from(snapshot.rawJsonlGzip).toString('base64'),
      renderPayloadJson: snapshot.renderPayload,
      shareId,
      sourceUpdatedAt: new Date(snapshot.sourceUpdatedAt),
      statsJson: snapshot.stats,
    })
    .returning();

  return snapshotRow;
}

export function createPostgresRepository(connectionString: string): ShareRepository {
  const pool = new Pool({
    connectionString,
  });
  const db = drizzle(pool);

  return {
    async createShare(input: CreateShareInput): Promise<StoredShare> {
      return db.transaction(async (tx) => {
        const [shareRow] = await tx
          .insert(shares)
          .values({
            manageTokenHash: input.manageTokenHash,
            publicId: input.publicId,
            sourceSessionId: input.snapshot.sourceSessionId,
            title: input.snapshot.title,
          })
          .returning();

        const snapshotRow = await insertSnapshot(tx, shareRow.id, input.snapshot);
        await tx
          .update(shares)
          .set({
            latestSnapshotId: snapshotRow.id,
            updatedAt: new Date(),
          })
          .where(eq(shares.id, shareRow.id));

        return toStoredShare(
          { ...shareRow, latestSnapshotId: snapshotRow.id },
          snapshotRow,
        );
      });
    },

    async findShareByPublicId(publicId: string): Promise<StoredShare | null> {
      const [shareRow] = await db
        .select()
        .from(shares)
        .where(eq(shares.publicId, publicId))
        .limit(1);

      if (!shareRow) {
        return null;
      }

      const snapshotRow = shareRow.latestSnapshotId
        ? (
            await db
              .select()
              .from(shareSnapshots)
              .where(eq(shareSnapshots.id, shareRow.latestSnapshotId))
              .limit(1)
          )[0] ?? null
        : null;

      return toStoredShare(shareRow, snapshotRow);
    },

    async revokeShare(shareId: string): Promise<StoredShare> {
      const [shareRow] = await db
        .update(shares)
        .set({
          revokedAt: new Date(),
          status: 'revoked',
          updatedAt: new Date(),
        })
        .where(eq(shares.id, shareId))
        .returning();

      if (!shareRow) {
        throw new Error(`Share ${shareId} not found`);
      }

      const snapshotRow = shareRow.latestSnapshotId
        ? (
            await db
              .select()
              .from(shareSnapshots)
              .where(eq(shareSnapshots.id, shareRow.latestSnapshotId))
              .limit(1)
          )[0] ?? null
        : null;

      return toStoredShare(shareRow, snapshotRow);
    },

    async updateShareSnapshot(
      shareId: string,
      snapshot: ShareSnapshotInput,
    ): Promise<StoredShare> {
      return db.transaction(async (tx) => {
        const snapshotRow = await insertSnapshot(tx, shareId, snapshot);
        const [shareRow] = await tx
          .update(shares)
          .set({
            latestSnapshotId: snapshotRow.id,
            sourceSessionId: snapshot.sourceSessionId,
            title: snapshot.title,
            updatedAt: new Date(),
          })
          .where(eq(shares.id, shareId))
          .returning();

        if (!shareRow) {
          throw new Error(`Share ${shareId} not found`);
        }

        return toStoredShare(shareRow, snapshotRow);
      });
    },
  };
}
