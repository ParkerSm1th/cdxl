import { randomUUID } from 'node:crypto';
import type { ShareSnapshotInput } from '@codexlink/shared';
import type { CreateShareInput, ShareRepository, StoredShare, StoredSnapshot } from './repository';

function now(): string {
  return new Date().toISOString();
}

function createSnapshot(
  shareId: string,
  snapshot: ShareSnapshotInput,
): StoredSnapshot {
  return {
    contentHash: snapshot.contentHash,
    createdAt: now(),
    id: randomUUID(),
    rawJsonlGzip: snapshot.rawJsonlGzip,
    renderPayload: snapshot.renderPayload,
    shareId,
    sourceUpdatedAt: snapshot.sourceUpdatedAt,
    stats: snapshot.stats,
  };
}

export function createMemoryRepository(): ShareRepository {
  const shares = new Map<string, StoredShare>();

  return {
    async createShare(input: CreateShareInput): Promise<StoredShare> {
      const id = randomUUID();
      const snapshot = createSnapshot(id, input.snapshot);
      const timestamp = now();
      const share: StoredShare = {
        createdAt: timestamp,
        id,
        latestSnapshot: snapshot,
        manageTokenHash: input.manageTokenHash,
        publicId: input.publicId,
        revokedAt: null,
        sourceSessionId: input.snapshot.sourceSessionId,
        status: 'active',
        title: input.snapshot.title,
        updatedAt: timestamp,
      };
      shares.set(share.publicId, share);
      return share;
    },

    async findShareByPublicId(publicId: string): Promise<StoredShare | null> {
      return shares.get(publicId) ?? null;
    },

    async revokeShare(shareId: string): Promise<StoredShare> {
      const share = [...shares.values()].find((entry) => entry.id === shareId);
      if (!share) {
        throw new Error(`Share ${shareId} not found`);
      }

      const revokedShare: StoredShare = {
        ...share,
        revokedAt: now(),
        status: 'revoked',
        updatedAt: now(),
      };
      shares.set(revokedShare.publicId, revokedShare);
      return revokedShare;
    },

    async updateShareSnapshot(
      shareId: string,
      snapshot: ShareSnapshotInput,
    ): Promise<StoredShare> {
      const share = [...shares.values()].find((entry) => entry.id === shareId);
      if (!share) {
        throw new Error(`Share ${shareId} not found`);
      }

      const nextSnapshot = createSnapshot(shareId, snapshot);
      const updatedShare: StoredShare = {
        ...share,
        latestSnapshot: nextSnapshot,
        sourceSessionId: snapshot.sourceSessionId,
        title: snapshot.title,
        updatedAt: now(),
      };
      shares.set(updatedShare.publicId, updatedShare);
      return updatedShare;
    },
  };
}

