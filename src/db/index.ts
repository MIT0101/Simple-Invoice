import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

/** Any Drizzle handle for this schema: the root database or a transaction. */
export type Db = BaseSQLiteDatabase<"sync", Database.RunResult, typeof schema>;

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/** Opens (or creates) a SQLite database and applies pending migrations. Use ":memory:" in tests. */
export function createDatabase(filePath: string) {
  if (filePath !== ":memory:") {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

export function databasePath(): string {
  return process.env.DATABASE_PATH?.trim() || path.join(process.cwd(), "data", "invoices.db");
}

const globalForDb = globalThis as typeof globalThis & {
  __invoiceDb?: ReturnType<typeof createDatabase>;
};

/**
 * Opens the database on first use rather than at import, so `next build` never touches it.
 * Cached on globalThis to survive dev hot reloads.
 */
export function getDb() {
  globalForDb.__invoiceDb ??= createDatabase(databasePath());
  return globalForDb.__invoiceDb;
}
