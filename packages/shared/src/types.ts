export type ShareStatus = 'active' | 'revoked';

export type TranscriptRole = 'user' | 'assistant';

export type TranscriptImage = {
  alt: string;
  src: string;
};

export type TranscriptEntry =
  | {
      id: string;
      createdAt: string;
      kind: 'commentary';
      text: string;
    }
  | {
      id: string;
      createdAt: string;
      images?: TranscriptImage[];
      kind: 'message';
      role: TranscriptRole;
      text: string;
    }
  | {
      id: string;
      createdAt: string;
      kind: 'tool_call';
      toolName: string;
      input: string;
    }
  | {
      id: string;
      createdAt: string;
      kind: 'tool_output';
      toolName: string;
      output: string;
      truncated: boolean;
    };

export type RenderStats = {
  assistantMessages: number;
  toolCalls: number;
  toolOutputs: number;
  userMessages: number;
};

export type RenderPayload = {
  createdAt: string;
  entries: TranscriptEntry[];
  excerpt: string;
  id: string;
  sourceUpdatedAt: string;
  stats: RenderStats;
  title: string;
};

export type SessionIndexEntry = {
  id: string;
  thread_name?: string;
  updated_at?: string;
};

export type ResolvedSession = {
  filePath: string;
  id: string;
  rawText: string;
  sourceUpdatedAt: string;
  title: string;
};

export type CreateShareResult = {
  manageToken: string;
  shareId: string;
  url: string;
};

export type ShareResponse = {
  createdAt: string;
  data: RenderPayload;
  shareId: string;
  status: ShareStatus;
  updatedAt: string;
};

export type ShareSnapshotInput = {
  contentHash: string;
  rawJsonlGzip: Uint8Array;
  renderPayload: RenderPayload;
  sourceSessionId: string;
  sourceUpdatedAt: string;
  stats: RenderStats;
  title: string;
};
