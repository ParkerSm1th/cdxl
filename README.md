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

## Railway

This repo deploys as two Railway services:

- `apps/api`: Hono API, plus the pre-deploy migration step
- `apps/web`: Next.js public viewer

Each service has its own config:

- [apps/api/railway.json](/Users/parker/Desktop/Personal/codexlink/apps/api/railway.json)
- [apps/web/railway.json](/Users/parker/Desktop/Personal/codexlink/apps/web/railway.json)
- [apps/api/Dockerfile.railway](/Users/parker/Desktop/Personal/codexlink/apps/api/Dockerfile.railway)
- [apps/web/Dockerfile.railway](/Users/parker/Desktop/Personal/codexlink/apps/web/Dockerfile.railway)

Recommended setup:

1. Import the monorepo into Railway and create two services from it.
2. Leave each service `Root Directory` set to the repository root `/`.
3. Point the API service config file at [apps/api/railway.json](/Users/parker/Desktop/Personal/codexlink/apps/api/railway.json) using the absolute repo path `/apps/api/railway.json`.
4. Point the web service config file at [apps/web/railway.json](/Users/parker/Desktop/Personal/codexlink/apps/web/railway.json) using the absolute repo path `/apps/web/railway.json`.
5. Give the API service a public domain only if you want direct public API access.
6. Attach your custom domain, such as `codexl.ink`, to the web service.

Important:

- Railway auto-import for JavaScript monorepos may treat `apps/api` and `apps/web` as package roots for config detection.
- Because Railway automatically uses a file literally named `Dockerfile` at the package root, these services are configured to use Railpack instead.
- The example Dockerfiles are intentionally renamed to `Dockerfile.railway` so Railway does not auto-detect them and build with the wrong context.
- Leave the service root directory at `/` unless you are intentionally deploying an isolated subdirectory service.

Environment variables:

- API service:
  - `DATABASE_URL`: your Neon Postgres connection string
  - `SITE_URL`: the public web origin, for example `https://codexl.ink`
- Web service:
  - `SITE_URL`: the public web origin, for example `https://codexl.ink`
  - `API_BASE_URL`: internal API URL, for example `http://api.railway.internal:8787` if the API service is named `api`

The API service runs `pnpm migrate:deploy` as a Railway pre-deploy command, which executes [packages/db/src/migrate.ts](/Users/parker/Desktop/Personal/codexlink/packages/db/src/migrate.ts) against the `drizzle` SQL files before the new deployment starts serving traffic.

## CLI

Examples:

```bash
npx codex-link share <session-id>
npx codex-link track <session-id>
npx codex-link monitor
npx codex-link unshare <share-id>
```

The CLI reads sessions from `~/.codex/session_index.jsonl` and `~/.codex/sessions/**`, uploads a redacted public snapshot, and stores local tracking state under the platform app-state directory.

For local workspace development, run the CLI directly with:

```bash
pnpm --filter codex-link dev share <session-id>
```

To publish the npm package from the workspace:

```bash
pnpm publish:cli -- --dry-run
pnpm publish:cli
pnpm publish:cli -- minor
```

The publish script stages a clean package, forces production defaults for `API_BASE_URL`, `CODEXLINK_API_URL`, and `SITE_URL`, bumps the CLI package version before publish, and refuses to publish if the packed output contains unexpected files or obvious secrets. It defaults to a patch bump, and you can pass `minor`, `major`, `prerelease`, or an explicit semver version as the first argument.
