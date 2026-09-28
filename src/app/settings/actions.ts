"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { parseSignatureUpload } from "@/lib/signature";
import { settingsFormSchema, toFieldErrors } from "@/lib/validation";
import { updateSettings } from "@/server/settings";

/** undefined = keep the current signature, null = remove it, string = replace it. */
async function readSignature(
  formData: FormData,
): Promise<{ ok: true; signatureImage: string | null | undefined } | { ok: false; message: string }> {
  if (formData.get("removeSignature") === "on") return { ok: true, signatureImage: null };

  const file = formData.get("signature");
  if (!(file instanceof File) || file.size === 0) return { ok: true, signatureImage: undefined };

  const upload = await parseSignatureUpload(file);
  return upload.ok ? { ok: true, signatureImage: upload.dataUrl } : upload;
}

export async function saveSettingsAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const textFields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") textFields[key] = value;
  }

  const parsed = settingsFormSchema.safeParse(textFields);
  const signature = await readSignature(formData);
  if (!parsed.success || !signature.ok) {
    const fieldErrors = parsed.success ? {} : toFieldErrors(parsed.error);
    if (!signature.ok) fieldErrors.signature = signature.message;
    return {
      ok: false,
      message: parsed.success && !signature.ok ? signature.message : "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  try {
    updateSettings({ ...parsed.data, signatureImage: signature.signatureImage });
  } catch (error) {
    console.error("Failed to save settings", error);
    return { ok: false, message: "Could not save your settings. Please try again." };
  }

  // Settings appear on every invoice page and PDF.
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}
