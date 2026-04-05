# CodexLink

Public sharing for Codex chats.

## Stack

- `apps/web`: Next.js App Router public viewer with OG metadata and image previews
- `apps/api`: Hono API for create, update, read, and revoke
- `packages/cli`: Node CLI for one-off shares, live tracking, and session monitoring
- `packages/shared`: session resolution, parsing, redaction, hashing, and shared types
- `packages/db`: Drizzle schema plus repository implementations for Postgres and in-memory tests

## Requirements

- Node `22`
- `pnpm`
- Postgres compatible with Neon

## Environment

Copy `.env.example` and set the values you need.

- `DATABASE_URL`: required by the API in Postgres mode and by Drizzle tooling
- `SITE_URL`: public site root used by the API and web metadata
- `API_BASE_URL`: web app target for share fetches
- `CODEXLINK_API_URL`: CLI target for uploads and revokes
- `CODEX_HOME`: optional override for the Codex local data directory
- `CODEXLINK_STATE_DIR`: optional override for CLI tracking state

## Setup

```bash
pnpm install
pnpm typecheck
pnpm test
```

Apply the generated Drizzle migration before starting the API against Neon:

```bash
pnpm --filter @codexlink/db migrate
```

## Local Development

Run the API and web app in separate terminals:

```bash
pnpm --filter @codexlink/api dev
pnpm --filter @codexlink/web dev
```

Build everything:

```bash
pnpm build
```

## CLI

Examples:

```bash
npx cdxl share <session-id>
npx cdxl track <session-id>
npx cdxl monitor
npx cdxl unshare <share-id>
```

The CLI reads sessions from `~/.codex/session_index.jsonl` and `~/.codex/sessions/**`, uploads a redacted public snapshot, and stores local tracking state under the platform app-state directory.

For local workspace development, run the CLI directly with:

```bash
pnpm --filter cdxl dev share <session-id>
```
