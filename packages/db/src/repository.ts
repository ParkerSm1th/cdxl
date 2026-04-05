import type { RenderPayload, RenderStats, ShareSnapshotInput, ShareStatus } from '@codexlink/shared';

export type StoredSnapshot = {
  contentHash: string;
  createdAt: string;
  id: string;
  rawJsonlGzip: Uint8Array;
  renderPayload: RenderPayload;
  shareId: string;
  sourceUpdatedAt: string;
  stats: RenderStats;
};

export type StoredShare = {
  createdAt: string;
  id: string;
  latestSnapshot: StoredSnapshot | null;
  manageTokenHash: string;
  publicId: string;
  revokedAt: string | null;
  sourceSessionId: string;
  status: ShareStatus;
  title: string;
  updatedAt: string;
};

export type CreateShareInput = {
  manageTokenHash: string;
  publicId: string;
  snapshot: ShareSnapshotInput;
};

export interface ShareRepository {
  createShare(input: CreateShareInput): Promise<StoredShare>;
  findShareByPublicId(publicId: string): Promise<StoredShare | null>;
  revokeShare(shareId: string): Promise<StoredShare>;
  updateShareSnapshot(
    shareId: string,
    snapshot: ShareSnapshotInput,
  ): Promise<StoredShare>;
}

