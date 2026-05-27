# AGENTS.md

## Commands

```bash
npm run dev          # Start Next.js dev server (Turbo, port 3000)
npm run build        # Production build (note: uses --webpack, not Turbopack)
npm run start        # Start production server
npm run lint         # ESLint (eslint-config-next)
```

No separate typecheck script — `tsconfig.json` is `strict: true`, but `next.config.ts` has `ignoreBuildErrors: true`. Run `npx tsc --noEmit` for standalone type checking.

## Architecture

- **Stack**: Next.js 16 App Router + React 19 + Tailwind CSS v4 + Radix UI + Agora RTC/RTM
- **Deployment**: Render (`render.yaml`), health check at `/api/mcp`, installs with `--legacy-peer-deps`
- **Path alias**: `@/*` → project root
- **Database**: SQLite via `better-sqlite3`, auto-created at `data/app.db` (WAL mode, in `.gitignore`)
- **Generated CSS source**: `globals.css` includes `@source` pointing into `node_modules/@agora/agent-ui-kit/packages/uikit/src/`
- **No CI workflows** configured

## App entrypoint & startup flow

- `app/page.tsx` → dynamically imports `HomeClient.tsx` with `ssr: false` (SSR disabled because it depends on `window`, `navigator.mediaDevices`, and Agora browser SDKs)
- Client flow: Get tokens (`/api/token`) → Get config without starting agent (`/api/start-agent` with `connect: false`) → Join RTC channel → Start the agent (`/api/start-agent` with `connect: true`)

## API routes (all `runtime: "nodejs"`)

| Route | Purpose |
|---|---|
| `/api/token` | Generate Agora RTC/RTM tokens for a user |
| `/api/start-agent` | Start (or configure) a Convo AI agent via Agora REST API |
| `/api/leave-agent` | Stop a running agent |
| `/api/mcp` | JSON-RPC 2.0 MCP tool server (used by the agent) |
| `/api/knowledge` | Knowledge base CRUD |
| `/api/tickets` | Support ticket CRUD |
| `/api/drive/auth` + `/api/drive/callback` | Google Drive OAuth |
| `/api/face/verify` | Face verification endpoint |
| `/api/agent-debug` | Debug info about running agents |

## Monorepo dependency quirk (`@agora/agent-ui-kit`)

`@agora/agent-ui-kit` is a Turborepo monorepo installed from GitHub. The root `package.json` lacks `main`/`exports` fields. The `postinstall` script (`scripts/postinstall.js`) patches it to point to `./packages/uikit/src/index.ts`. If you `npm install` and imports don't resolve, re-run `npm run postinstall`.

## MCP / Tools

- The agent's LLM connects to `/api/mcp` as a `streamable_http` MCP server, giving it access to: `search_documents`, `get_document_content`, `create_support_ticket`, `get_ticket_status`, `update_ticket`, `search_knowledge_base`, `request_identity_verification`
- **Tools are disabled on localhost**. Set `MCP_SERVER_URL` (or `NEXT_PUBLIC_APP_URL`) to a public URL for them to work. In production on Render, this is auto-configured.

## Environment variables

No `.env.example` file exists. The live `.env` file is in `.gitignore`. Key conventions:
- `NEXT_PUBLIC_*` for browser-safe values (Agora App ID, bot UID, modalities)
- Server-only vars (secrets): `AGORA_APP_CERTIFICATE`, `AGORA_CUSTOMER_ID`, `AGORA_CUSTOMER_SECRET`, `LLM_API_KEY`, TTS keys, Google OAuth secrets
- `TTS_VENDOR` selects `elevenlabs` / `minimax` / `microsoft` and toggles which TTS credentials are required
- `LLM_STYLE` controls how the LLM payload is shaped (`openai`, `gemini`, `anthropic`, `dify`)
- `BYPASS_FACE_VERIFY=true` skips identity checks for local dev

## Render deployment

- `buildCommand`: `npm install --legacy-peer-deps && npm run build` (peer dep conflicts are expected)
- `startCommand`: `npm start`
- Health check: `GET /api/mcp`