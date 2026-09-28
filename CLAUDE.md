@AGENTS.md

# Invoice Generator

Single-user app for freelance invoices: Settings (profile, payment details, signature) → draft invoice →
post (numbers + locks it) → PDF preview / download / print. See README.md for usage and Docker.

## Commands

- `npm run dev` — dev server (DB at `./data/invoices.db`; override with `DATABASE_PATH`)
- `npm test` · `npm run lint` · `npm run typecheck` · `npm run build`
- `npm run db:generate` — after editing `src/db/schema.ts`; migrations in `drizzle/` apply automatically on first DB use
- `docker compose up -d --build` — production container (named volume `invoice-data`, bound to 127.0.0.1)

## Architecture

- `src/db` — Drizzle schema + lazy `getDb()` (never touch the DB at import time; `next build` must not open it)
- `src/server` — synchronous data access (better-sqlite3); functions take an optional `db` param so tests pass `createDatabase(":memory:")`; business-rule errors are `InvoiceError`
- `src/lib` — pure, isomorphic helpers (money in integer cents, dates as `YYYY-MM-DD` strings, Zod schemas)
- `src/app` — pages call `await connection()` before reading the DB; mutations are Server Actions returning `ActionResult` (validate every argument — they are public endpoints)
- `src/pdf` — @react-pdf/renderer document (built-in Helvetica → Latin text only), served by `src/app/api/invoices/[id]/pdf`
- `src/proxy.ts` — optional Basic Auth (`BASIC_AUTH_USER` + `BASIC_AUTH_PASSWORD`)

## Conventions

- Next.js 16: `params`/`searchParams` are Promises; error boundaries get `retry`; `middleware` is `proxy`.
- Don't format dates with `Intl` (locale data differs between Node and browsers → "Sept", hydration mismatches); use `formatDate`.
- No `window.confirm/alert` — use inline two-step confirmations.
