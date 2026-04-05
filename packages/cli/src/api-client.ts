import { Buffer } from 'node:buffer';
import type {
  CreateShareResult,
  ShareResponse,
  ShareSnapshotInput,
} from '@codexlink/shared';

export type FetchLike = typeof fetch;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

function createFormData(snapshot: ShareSnapshotInput): FormData {
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
    new File([Buffer.from(snapshot.rawJsonlGzip)], `${snapshot.sourceSessionId}.jsonl.gz`, {
      type: 'application/gzip',
    }),
  );
  return formData;
}

export class CodexLinkApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: FetchLike,
  ) {}

  async createShare(snapshot: ShareSnapshotInput): Promise<CreateShareResult> {
    const response = await this.fetchImpl(`${this.baseUrl}/v1/shares`, {
      body: createFormData(snapshot),
      method: 'POST',
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ApiRequestError(`Failed to create share: ${body}`, response.status, body);
    }

    return (await response.json()) as CreateShareResult;
  }

  async getShare(shareId: string): Promise<ShareResponse> {
    const response = await this.fetchImpl(`${this.baseUrl}/v1/shares/${shareId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ApiRequestError(`Failed to fetch share: ${body}`, response.status, body);
    }

    return (await response.json()) as ShareResponse;
  }

  async updateShare(
    shareId: string,
    manageToken: string,
    snapshot: ShareSnapshotInput,
  ): Promise<void> {
    const response = await this.fetchImpl(`${this.baseUrl}/v1/shares/${shareId}`, {
      body: createFormData(snapshot),
      headers: {
        authorization: `Bearer ${manageToken}`,
      },
      method: 'PUT',
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ApiRequestError(`Failed to update share: ${body}`, response.status, body);
    }
  }

  async revokeShare(shareId: string, manageToken: string): Promise<void> {
    const response = await this.fetchImpl(`${this.baseUrl}/v1/shares/${shareId}`, {
      headers: {
        authorization: `Bearer ${manageToken}`,
      },
      method: 'DELETE',
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ApiRequestError(`Failed to revoke share: ${body}`, response.status, body);
    }
  }
}
