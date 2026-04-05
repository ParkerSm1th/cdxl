import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { redactText, sanitizeToolOutput, shouldSkipUserMessage } from './redaction';
import type {
  RenderPayload,
  RenderStats,
  ShareSnapshotInput,
  TranscriptEntry,
  TranscriptImage,
} from './types';

type ParseOptions = {
  sourceUpdatedAt: string;
  title: string;
};

type JsonRecord = {
  payload?: Record<string, unknown>;
  timestamp?: string;
  type?: string;
};

type EntryState = {
  commentaryCount: number;
  entries: TranscriptEntry[];
  messageCount: number;
  toolCallCount: number;
  toolOutputCount: number;
};

type ParsedMessageContent = {
  images: TranscriptImage[];
  text: string;
};

function normalizeTextForDedup(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeTextSegment(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }

  if (/^<image\b[^>]*>$/i.test(trimmed) || /^<\/image>$/i.test(trimmed)) {
    return '';
  }

  return trimmed.replace(/\[Image #\d+\]/g, '').trim();
}

function sanitizeImageSrc(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed) {
    return null;
  }

  if (/^data:image\//i.test(trimmed)) {
    return trimmed;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  if (/[?&](?:sig|signature|token|x-amz-|expires|awsaccesskeyid)=/i.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function extractImageUrl(item: Record<string, unknown>): string | null {
  const directImageUrl = asString(item.image_url);
  if (directImageUrl) {
    return sanitizeImageSrc(directImageUrl);
  }

  const nestedImageUrl = item.image_url;
  if (nestedImageUrl && typeof nestedImageUrl === 'object') {
    const candidate =
      asString((nestedImageUrl as { url?: unknown }).url) ??
      asString((nestedImageUrl as { uri?: unknown }).uri);
    if (candidate) {
      return sanitizeImageSrc(candidate);
    }
  }

  const directUrl = asString(item.url);
  if (directUrl) {
    return sanitizeImageSrc(directUrl);
  }

  return null;
}

function extractMessageContent(content: unknown): ParsedMessageContent {
  if (!Array.isArray(content)) {
    return {
      images: [],
      text: '',
    };
  }

  const images: TranscriptImage[] = [];
  const text = content
    .flatMap((item) => {
      if (!item || typeof item !== 'object') {
        return [];
      }

      const typedItem = item as Record<string, unknown>;
      const itemType = asString(typedItem.type);
      const imageUrl = extractImageUrl(typedItem);
      if (
        imageUrl &&
        (itemType === 'input_image' ||
          itemType === 'output_image' ||
          itemType === 'image' ||
          itemType === 'image_url')
      ) {
        images.push({
          alt: `Image ${images.length + 1}`,
          src: imageUrl,
        });
        return [];
      }

      const itemText = typedItem.text;
      if (typeof itemText !== 'string') {
        return [];
      }

      const normalizedText = normalizeTextSegment(itemText);
      return normalizedText ? [normalizedText] : [];
    })
    .join('\n\n')
    .trim();

  return {
    images,
    text,
  };
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function createEntryId(prefix: string, counter: number): string {
  return `${prefix}-${counter}`;
}

function createStats(entries: TranscriptEntry[]): RenderStats {
  return entries.reduce<RenderStats>(
    (stats, entry) => {
      if (entry.kind === 'message' && entry.role === 'user') {
        stats.userMessages += 1;
      }
      if (entry.kind === 'message' && entry.role === 'assistant') {
        stats.assistantMessages += 1;
      }
      if (entry.kind === 'tool_call') {
        stats.toolCalls += 1;
      }
      if (entry.kind === 'tool_output') {
        stats.toolOutputs += 1;
      }
      return stats;
    },
    {
      assistantMessages: 0,
      toolCalls: 0,
      toolOutputs: 0,
      userMessages: 0,
    },
  );
}

function areEquivalentImages(
  left: TranscriptImage[] | undefined,
  right: TranscriptImage[] | undefined,
): boolean {
  const leftImages = left ?? [];
  const rightImages = right ?? [];
  if (leftImages.length !== rightImages.length) {
    return false;
  }

  return leftImages.every((image, index) => image.src === rightImages[index]?.src);
}

function canDeduplicateMessages(
  previousEntry: Extract<TranscriptEntry, { kind: 'message' }>,
  nextEntry: Extract<TranscriptEntry, { kind: 'message' }>,
): boolean {
  if (
    normalizeTextForDedup(previousEntry.text) !==
    normalizeTextForDedup(nextEntry.text)
  ) {
    return false;
  }

  const previousImageCount = previousEntry.images?.length ?? 0;
  const nextImageCount = nextEntry.images?.length ?? 0;

  return (
    areEquivalentImages(previousEntry.images, nextEntry.images) ||
    previousImageCount === 0 ||
    nextImageCount === 0
  );
}

function scoreMessageEntry(entry: Extract<TranscriptEntry, { kind: 'message' }>): number {
  return (entry.images?.length ?? 0) * 1_000 + entry.text.length;
}

function mergeDuplicateMessageEntries(
  previousEntry: Extract<TranscriptEntry, { kind: 'message' }>,
  nextEntry: Extract<TranscriptEntry, { kind: 'message' }>,
): Extract<TranscriptEntry, { kind: 'message' }> {
  const preferred = scoreMessageEntry(nextEntry) > scoreMessageEntry(previousEntry)
    ? nextEntry
    : previousEntry;

  return {
    ...preferred,
    id: previousEntry.id,
  };
}

function isCloseDuplicateTimestamp(
  left: string,
  right: string,
  maxDeltaMs = 5_000,
): boolean {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return left === right;
  }

  return Math.abs(leftTime - rightTime) <= maxDeltaMs;
}

function pushEntry(state: EntryState, nextEntry: TranscriptEntry): void {
  const previousEntry = state.entries.at(-1);
  if (!previousEntry) {
    state.entries.push(nextEntry);
    return;
  }

  if (
    nextEntry.kind === 'commentary' &&
    previousEntry.kind === 'commentary' &&
    normalizeTextForDedup(previousEntry.text) === normalizeTextForDedup(nextEntry.text) &&
    isCloseDuplicateTimestamp(previousEntry.createdAt, nextEntry.createdAt)
  ) {
    return;
  }

  if (
    nextEntry.kind === 'message' &&
    previousEntry.kind === 'message' &&
    previousEntry.role === nextEntry.role &&
    canDeduplicateMessages(previousEntry, nextEntry) &&
    isCloseDuplicateTimestamp(previousEntry.createdAt, nextEntry.createdAt)
  ) {
    state.entries[state.entries.length - 1] = mergeDuplicateMessageEntries(
      previousEntry,
      nextEntry,
    );
    return;
  }

  state.entries.push(nextEntry);
}

function pushCommentaryEntry(
  state: EntryState,
  createdAt: string,
  text: string,
): void {
  pushEntry(state, {
    createdAt,
    id: createEntryId('commentary', ++state.commentaryCount),
    kind: 'commentary',
    text,
  });
}

function pushMessageEntry(
  state: EntryState,
  createdAt: string,
  role: 'user' | 'assistant',
  text: string,
  images: TranscriptImage[] = [],
): void {
  pushEntry(state, {
    createdAt,
    id: createEntryId('message', ++state.messageCount),
    images: images.length > 0 ? images : undefined,
    kind: 'message',
    role,
    text,
  });
}

function createExcerpt(entries: TranscriptEntry[]): string {
  const firstMessage = entries.find((entry) => entry.kind === 'message');
  if (!firstMessage || firstMessage.kind !== 'message') {
    return 'Shared Codex session';
  }

  return firstMessage.text.replace(/\s+/g, ' ').slice(0, 180);
}

function parseJsonLine(line: string): JsonRecord | null {
  try {
    return JSON.parse(line) as JsonRecord;
  } catch {
    return null;
  }
}

function parseRecordText(record: JsonRecord): string | null {
  if (!record.payload) {
    return null;
  }

  return (
    (asString(record.payload.message)
      ? normalizeTextSegment(asString(record.payload.message) ?? '')
      : null) ??
    (asString(record.payload.text)
      ? normalizeTextSegment(asString(record.payload.text) ?? '')
      : null) ??
    extractMessageContent(record.payload.content).text
  );
}

function parseRecordImages(record: JsonRecord): TranscriptImage[] {
  if (!record.payload) {
    return [];
  }

  if (Array.isArray(record.payload.images)) {
    return record.payload.images.flatMap((item, index) => {
      if (typeof item !== 'string') {
        return [];
      }

      const src = sanitizeImageSrc(item);
      if (!src) {
        return [];
      }

      return [{
        alt: `Image ${index + 1}`,
        src,
      }];
    });
  }

  return extractMessageContent(record.payload.content).images;
}

export function parseSessionJsonl(
  rawText: string,
  options: ParseOptions,
): RenderPayload {
  const state: EntryState = {
    commentaryCount: 0,
    entries: [],
    messageCount: 0,
    toolCallCount: 0,
    toolOutputCount: 0,
  };
  let createdAt = options.sourceUpdatedAt;

  for (const line of rawText.split('\n')) {
    if (!line.trim()) {
      continue;
    }

    const record = parseJsonLine(line);
    if (!record?.type) {
      continue;
    }

    if (record.type === 'session_meta' && record.timestamp) {
      createdAt = record.timestamp;
      continue;
    }

    if (record.type === 'turn_context' || !record.payload) {
      continue;
    }

    const payloadType = asString(record.payload.type);
    const createdAtValue = record.timestamp ?? options.sourceUpdatedAt;

    if (record.type === 'event_msg') {
      if (payloadType === 'user_message' || payloadType === 'agent_message') {
        const role = payloadType === 'user_message' ? 'user' : 'assistant';
        const text = redactText(parseRecordText(record) ?? '');
        const images = parseRecordImages(record);
        if (!text && images.length === 0) {
          continue;
        }

        if (role === 'user' && shouldSkipUserMessage(text)) {
          continue;
        }

        pushMessageEntry(state, createdAtValue, role, text, images);
        continue;
      }

      if (payloadType === 'agent_reasoning') {
        const text = redactText(parseRecordText(record) ?? '');
        if (!text) {
          continue;
        }

        pushCommentaryEntry(state, createdAtValue, text);
      }
      continue;
    }

    if (record.type !== 'response_item') {
      continue;
    }

    if (payloadType === 'message') {
      const role = asString(record.payload.role);
      if (role !== 'user' && role !== 'assistant') {
        continue;
      }

      const parsedContent = extractMessageContent(record.payload.content);
      const text = redactText(parsedContent.text);
      if (!text && parsedContent.images.length === 0) {
        continue;
      }

      if (role === 'user' && shouldSkipUserMessage(text)) {
        continue;
      }

      pushMessageEntry(state, createdAtValue, role, text, parsedContent.images);
      continue;
    }

    if (payloadType === 'function_call' || payloadType === 'custom_tool_call') {
      const toolName = asString(record.payload.name) ?? 'tool';
      const input =
        asString(record.payload.arguments) ??
        asString(record.payload.input) ??
        '{}';
      state.entries.push({
        createdAt: createdAtValue,
        id: createEntryId('tool-call', ++state.toolCallCount),
        input: redactText(input),
        kind: 'tool_call',
        toolName,
      });
      continue;
    }

    if (
      payloadType === 'function_call_output' ||
      payloadType === 'custom_tool_call_output'
    ) {
      const output =
        asString(record.payload.output) ??
        asString(record.payload.text) ??
        '';
      if (!output) {
        continue;
      }

      const toolName = asString(record.payload.name) ?? 'tool';
      const sanitized = sanitizeToolOutput(output);
      state.entries.push({
        createdAt: createdAtValue,
        id: createEntryId('tool-output', ++state.toolOutputCount),
        kind: 'tool_output',
        output: sanitized.text,
        toolName,
        truncated: sanitized.truncated,
      });
    }
  }

  return {
    createdAt,
    entries: state.entries,
    excerpt: createExcerpt(state.entries),
    id: options.title,
    sourceUpdatedAt: options.sourceUpdatedAt,
    stats: createStats(state.entries),
    title: options.title,
  };
}

export function hashContent(input: string | Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

export function buildShareSnapshot(input: {
  rawText: string;
  sessionId: string;
  sourceUpdatedAt: string;
  title: string;
}): ShareSnapshotInput {
  const renderPayload = parseSessionJsonl(input.rawText, {
    sourceUpdatedAt: input.sourceUpdatedAt,
    title: input.title,
  });
  const rawJsonlGzip = gzipSync(input.rawText);
  const contentHash = hashContent(input.rawText);

  return {
    contentHash,
    rawJsonlGzip,
    renderPayload: {
      ...renderPayload,
      id: input.sessionId,
    },
    sourceSessionId: input.sessionId,
    sourceUpdatedAt: input.sourceUpdatedAt,
    stats: renderPayload.stats,
    title: input.title,
  };
}
