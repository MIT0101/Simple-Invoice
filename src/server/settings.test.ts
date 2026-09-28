import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "@/db";
import { settings } from "@/db/schema";
import type { SettingsInput } from "@/lib/validation";
import { getSettings, updateSettings } from "./settings";

let db: ReturnType<typeof createDatabase>;

beforeEach(() => {
  db = createDatabase(":memory:");
});

afterEach(() => {
  vi.useRealTimers();
  db.$client.close();
});

function settingsInput(overrides: Partial<SettingsInput> = {}): SettingsInput {
  return {
    fullName: "Jane Doe",
    jobTitle: "Software Engineer",
    email: "jane@example.com",
    phone: "+1 555 0100",
    address: "1 Main St",
    website: "https://jane.dev",
    paymentDetails: "IBAN: XX00 0000",
    currency: "SAR",
    invoicePrefix: "JD-",
    paymentTermsDays: 30,
    ...overrides,
  };
}

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const JPEG = "data:image/jpeg;base64,/9j/4AAQ";

describe("getSettings", () => {
  it("creates the single settings row with defaults on first read", () => {
    expect(getSettings(db)).toMatchObject({
      id: 1,
      fullName: "",
      jobTitle: "",
      email: "",
      phone: "",
      address: "",
      website: "",
      paymentDetails: "",
      signatureImage: null,
      currency: "USD",
      invoicePrefix: "INV-",
      paymentTermsDays: 14,
    });
    expect(getSettings(db).updatedAt).toBeInstanceOf(Date);
    expect(db.select().from(settings).all()).toHaveLength(1);
  });
});

describe("updateSettings", () => {
  it("saves and returns the new values", () => {
    const saved = updateSettings(settingsInput(), db);
    expect(saved).toMatchObject({ id: 1, ...settingsInput(), signatureImage: null });
    expect(getSettings(db)).toEqual(saved);
    expect(db.select().from(settings).all()).toHaveLength(1);
  });

  it("keeps the signature when omitted, removes it with null and replaces it with a data URL", () => {
    updateSettings({ ...settingsInput(), signatureImage: PNG }, db);
    expect(getSettings(db).signatureImage).toBe(PNG);

    updateSettings(settingsInput({ fullName: "Jane D." }), db);
    expect(getSettings(db)).toMatchObject({ fullName: "Jane D.", signatureImage: PNG });

    updateSettings({ ...settingsInput(), signatureImage: JPEG }, db);
    expect(getSettings(db).signatureImage).toBe(JPEG);

    updateSettings({ ...settingsInput(), signatureImage: null }, db);
    expect(getSettings(db).signatureImage).toBeNull();
  });

  it("bumps updatedAt", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-28T10:00:00Z"));
    const before = getSettings(db).updatedAt;

    vi.setSystemTime(new Date("2026-09-28T11:00:00Z"));
    const after = updateSettings(settingsInput(), db).updatedAt;
    expect(after.getTime() - before.getTime()).toBe(60 * 60 * 1000);
  });
});

describe("file database", () => {
  it("creates missing folders, applies migrations once and persists across restarts", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "invoice-generator-"));
    const file = path.join(dir, "nested", "invoices.db");
    try {
      const first = createDatabase(file);
      updateSettings(settingsInput(), first);
      first.$client.close();

      const reopened = createDatabase(file);
      expect(getSettings(reopened).fullName).toBe("Jane Doe");
      reopened.$client.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
