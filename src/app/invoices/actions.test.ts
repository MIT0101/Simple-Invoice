import { describe, expect, it, vi } from "vitest";
import type { InvoiceFormValues } from "@/lib/validation";
import {
  deleteInvoiceAction,
  duplicateInvoiceAction,
  postInvoiceAction,
  resetInvoiceToDraftAction,
  saveInvoiceAction,
} from "./actions";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string): never => {
    throw new Error(`REDIRECT ${url}`);
  }),
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

// The actions use the app database, which is opened lazily: keep it in memory here.
vi.stubEnv("DATABASE_PATH", ":memory:");

const validValues: InvoiceFormValues = {
  clientName: "Acme Corp",
  clientDetails: "",
  issueDate: "2026-03-01",
  dueDate: "",
  currency: "USD",
  summary: "",
  notes: "",
  items: [{ title: "API work", description: "", workUrl: "", quantity: "2", unitPrice: "500" }],
};

/** Awaits an action that should redirect and returns the target URL. */
async function redirectTarget(action: Promise<unknown>): Promise<string> {
  const error = await action.then(
    () => null,
    (reason: unknown) => reason,
  );
  const match = error instanceof Error ? /^REDIRECT (.+)$/.exec(error.message) : null;
  if (!match) throw new Error(`Expected a redirect, got ${String(error)}`);
  return match[1];
}

describe("invoice actions", () => {
  it("rejects invalid invoice ids", async () => {
    await expect(postInvoiceAction(0)).resolves.toEqual({ ok: false, message: "Invalid invoice." });
    await expect(saveInvoiceAction(1.5, validValues)).resolves.toMatchObject({ ok: false });
  });

  it("returns field errors for invalid values", async () => {
    const result = await saveInvoiceAction(null, {
      ...validValues,
      clientName: " ",
      items: [{ ...validValues.items[0], unitPrice: "abc" }],
    });
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { clientName: expect.any(String), "items.0.unitPrice": expect.any(String) },
    });
  });

  it("runs the draft → posted → draft lifecycle", async () => {
    const url = await redirectTarget(saveInvoiceAction(null, validValues));
    expect(url).toMatch(/^\/invoices\/\d+$/);
    const id = Number(url.split("/")[2]);

    await expect(postInvoiceAction(id)).resolves.toEqual({
      ok: true,
      message: expect.stringMatching(/^Posted as INV-2026-\d{4}\.$/),
    });
    await expect(saveInvoiceAction(id, validValues)).resolves.toEqual({
      ok: false,
      message: "Only draft invoices can be edited",
    });
    await expect(deleteInvoiceAction(id)).resolves.toEqual({
      ok: false,
      message: "Only draft invoices can be deleted",
    });
    await expect(resetInvoiceToDraftAction(id)).resolves.toEqual({ ok: true });
    expect(await redirectTarget(saveInvoiceAction(id, { ...validValues, notes: "Thanks!" }))).toBe(url);

    const copyUrl = await redirectTarget(duplicateInvoiceAction(id));
    expect(copyUrl).toMatch(/^\/invoices\/\d+\/edit$/);
    const copyId = Number(copyUrl.split("/")[2]);
    expect(copyId).not.toBe(id);

    expect(await redirectTarget(deleteInvoiceAction(copyId))).toBe("/invoices");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/invoices");
  });
});
