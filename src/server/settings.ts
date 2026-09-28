import { eq } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { settings } from "@/db/schema";
import type { SettingsInput } from "@/lib/validation";

const SETTINGS_ID = 1;

export type Settings = typeof settings.$inferSelect;

/** `signatureImage`: undefined keeps the current image, null removes it, a data URL replaces it. */
export type SettingsUpdate = SettingsInput & { signatureImage?: string | null };

/** Returns the settings row, creating it with defaults on first use. */
export function getSettings(db: Db = getDb()): Settings {
  const existing = db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).get();
  if (existing) return existing;

  db.insert(settings).values({ id: SETTINGS_ID }).onConflictDoNothing().run();
  const created = db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).get();
  if (!created) throw new Error("Could not initialise settings");
  return created;
}

export function updateSettings(update: SettingsUpdate, db: Db = getDb()): Settings {
  getSettings(db);
  db.update(settings).set(update).where(eq(settings.id, SETTINGS_ID)).run();
  return getSettings(db);
}
