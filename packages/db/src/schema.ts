import { relations } from 'drizzle-orm';
import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { RenderPayload, RenderStats, ShareStatus } from '@codexlink/shared';

export const shares = pgTable('shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicId: text('public_id').notNull().unique(),
  status: text('status').$type<ShareStatus>().notNull().default('active'),
  title: text('title').notNull(),
  sourceSessionId: text('source_session_id').notNull(),
  latestSnapshotId: uuid('latest_snapshot_id'),
  manageTokenHash: text('manage_token_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

export const shareSnapshots = pgTable('share_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  shareId: uuid('share_id')
    .notNull()
    .references(() => shares.id, { onDelete: 'cascade' }),
  contentHash: text('content_hash').notNull(),
  rawJsonlGzipBase64: text('raw_jsonl_gzip_base64').notNull(),
  renderPayloadJson: jsonb('render_payload_json').$type<RenderPayload>().notNull(),
  statsJson: jsonb('stats_json').$type<RenderStats>().notNull(),
  sourceUpdatedAt: timestamp('source_updated_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sharesRelations = relations(shares, ({ one }) => ({
  latestSnapshot: one(shareSnapshots, {
    fields: [shares.latestSnapshotId],
    references: [shareSnapshots.id],
  }),
}));

export const shareSnapshotsRelations = relations(shareSnapshots, ({ one }) => ({
  share: one(shares, {
    fields: [shareSnapshots.shareId],
    references: [shares.id],
  }),
}));
