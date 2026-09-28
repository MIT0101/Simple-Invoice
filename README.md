# Invoice Generator

A small self-hosted app for freelance software engineering, consulting and development work. You fill in an
invoice, save it as a draft, review the PDF, post it (which numbers and locks it), then download or print it.
It runs on Next.js with a local SQLite database, and ships with Docker Compose.

## Features

- **Settings**: the name, title, contact details, payment details and signature image shown on every invoice,
  plus defaults for currency, invoice number prefix and payment terms.
- **Invoices**: client details, issue and due dates, currency, a short summary of the completed work, line items
  (service title, description, Google Drive link to the work-unit PDF, quantity, unit price) and notes. Totals
  are calculated automatically.
- **Draft → Posted** workflow with automatic numbering. Posted invoices are locked; use *Reset to draft* to fix
  one.
- **PDF**: in-app preview, download and print, with clickable work links. Simple layout, no logo.
- **Duplicate** an invoice to start the next one for the same client.

## Quick start (Docker)

```bash
docker compose up -d --build
```

Open <http://localhost:3000>, go to **Settings** and fill in your details and signature, then create your
first invoice.

```bash
docker compose logs -f     # follow the logs
docker compose down        # stop and remove the container (data is kept in the volume)
```

To update, pull the new code and run `docker compose up -d --build` again. Database migrations are applied
automatically at startup.

> `docker compose down -v` also deletes the `invoice-data` volume, which **deletes all your invoices**.

## Local development

Requires Node.js 22+ (Node 24 recommended).

```bash
npm install
npm run dev          # http://localhost:3000, database at ./data/invoices.db
npm test             # unit + integration tests (in-memory SQLite)
npm run lint
npm run typecheck
npm run db:studio    # browse the database with Drizzle Studio
```

## Configuration

Every variable is optional. Copy `.env.example` to `.env` to set them: `npm run dev` loads it, and
`docker compose` uses it to fill in `docker-compose.yml`.

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_PATH` | `./data/invoices.db` (Docker: `/app/data/invoices.db`) | SQLite database file. |
| `TZ` | `UTC` in Docker | Time zone used for "today" (default issue dates), e.g. `Asia/Riyadh`. |
| `PORT` | `3000` | Host port published by Docker Compose (bound to `127.0.0.1`). |
| `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD` | unset | When **both** are set, the app requires HTTP Basic Auth (except `/api/health`). |

## How it works

1. **New invoice**: fill in the client, dates, currency, completed-work summary (one point per line, shown as
   bullets) and line items. Save it as a draft.
2. **Review**: the invoice page shows the PDF preview. Drafts can be edited or deleted.
3. **Post**: assigns the invoice number and locks the invoice.
4. **Download PDF / Print** from the invoice page.
5. **Reset to draft** unlocks a posted invoice for corrections and keeps its number. **Duplicate** copies an
   invoice into a new draft dated today.

### Invoice numbers

Numbers take the form `PREFIX` + issue year + `-` + a 4-digit sequence, e.g. `INV-2026-0001`. The sequence starts
again each year (per prefix). A number is assigned when an invoice is first posted and kept if it is reset to
draft and posted again. A new prefix set in Settings applies to invoices posted after the change.

## Data and backups

In Docker, the database lives in the named volume `invoice-data`, at `/app/data` inside the container. SQLite
runs in WAL mode, so next to `invoices.db` there may be `invoices.db-wal` and `invoices.db-shm` files. Always
back up and restore the whole folder, with the app stopped.

Back up:

```bash
docker compose stop
docker compose cp app:/app/data ./backup
docker compose start
```

Restore (this replaces the current data):

```bash
docker compose stop
docker compose run --rm --user root app sh -c 'rm -f /app/data/invoices.db*'
docker compose cp ./backup/. app:/app/data/
docker compose run --rm --user root app chown -R node:node /app/data
docker compose start
```

For local development, the database is the `./data` folder. Stop `npm run dev` before copying it.

## Changing the database schema

1. Edit `src/db/schema.ts`.
2. Run `npm run db:generate` to create a SQL migration in `drizzle/` (commit it).
3. Restart the app. Pending migrations are applied automatically at startup (in development and in Docker).

## Project structure

```
src/
  app/          pages, Server Actions, the PDF endpoint (api/invoices/[id]/pdf) and api/health
  components/   shared UI and the PDF preview/buttons
  db/           Drizzle schema and SQLite connection (runs migrations on first use)
  lib/          pure helpers: money, dates, validation (Zod), invoice numbers, routes
  pdf/          the invoice PDF document (@react-pdf/renderer)
  server/       data access for invoices and settings
  proxy.ts      optional HTTP Basic Auth
drizzle/        generated SQL migrations
```

## Tech stack

Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS 4, SQLite (better-sqlite3) with
Drizzle ORM, Zod, @react-pdf/renderer, Vitest, and Docker.

## Limitations

- The PDF uses the built-in Helvetica font, so only Latin characters are supported (no Arabic, CJK or emoji).
- There are no user accounts. Docker Compose publishes the app on `127.0.0.1` only. If you expose it, set
  `BASIC_AUTH_USER`/`BASIC_AUTH_PASSWORD` and put it behind an HTTPS reverse proxy, since Basic Auth sends
  credentials with every request.
- It is designed for one user with a single SQLite database.

## License

[MIT](LICENSE)
