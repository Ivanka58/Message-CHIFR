# SHIFR Messenger

A cyberpunk-aesthetic secure web messenger with Matrix-style digital rain, neon UI, real-time messaging, and privacy features like panic codes and double-bottom settings.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/shifr run dev` — run the frontend (port 24570)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB tables: `users.ts`, `messages.ts`
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/session.ts` — session auth middleware
- `artifacts/shifr/src/` — React frontend
- `lib/api-client-react/src/generated/` — generated React Query hooks (don't edit)
- `lib/api-zod/src/generated/` — generated Zod schemas (don't edit)

## Architecture decisions

- Demo verification code is always `A-123456` — no real SMS provider needed.
- Session IDs (UUIDs) stored in PostgreSQL `users.session_id`; passed as `x-session-id` header.
- Message encryption is simulated: plaintext stored as `text`, hex-encoded version stored as `encrypted_text`.
- Rate limiting is in-memory (per userId, 30 msg/min); resets on server restart.
- Admin endpoints (`/api/admin/*`) are unprotected — add auth if deploying publicly.

## Product

- Phone number login (verification code: always A-123456 in demo)
- Real-time messaging between users with E2E encryption simulation
- Contacts list with online status indicators
- Message stats dashboard
- Settings: double-bottom passwords (localStorage), panic code (wipes session)
- Admin panel: user list with message counts, recent message log
- Pre-seeded test contact "Тестирование" (+0000000000)

## User preferences

_Populate as you build._

## Gotchas

- Always run `pnpm run typecheck:libs` after changing `lib/db/src/schema/` before typechecking the api-server.
- After any `openapi.yaml` change, run codegen before touching generated imports.
- The `messages/stats` endpoint must be registered BEFORE `messages/:userId` in Express to avoid the `/stats` path being interpreted as a userId.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
