export const MAX_SIGNATURE_BYTES = 1024 * 1024;

export const SIGNATURE_MIME_TYPES = ["image/png", "image/jpeg"] as const;
export type SignatureMimeType = (typeof SIGNATURE_MIME_TYPES)[number];

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

function startsWith(bytes: Uint8Array, magic: ReadonlyArray<number>): boolean {
  return bytes.length >= magic.length && magic.every((byte, index) => bytes[index] === byte);
}

/** Detects PNG or JPEG from the file's magic bytes; the browser-reported type is not trusted. */
export function detectSignatureMimeType(bytes: Uint8Array): SignatureMimeType | null {
  if (startsWith(bytes, PNG_MAGIC)) return "image/png";
  if (startsWith(bytes, JPEG_MAGIC)) return "image/jpeg";
  return null;
}

export type SignatureUploadResult = { ok: true; dataUrl: string } | { ok: false; message: string };

/** Validates an uploaded signature and returns it as a data URL. Server-only (uses Buffer). */
export async function parseSignatureUpload(file: File): Promise<SignatureUploadResult> {
  if (file.size === 0) {
    return { ok: false, message: "The selected file is empty." };
  }
  if (file.size > MAX_SIGNATURE_BYTES) {
    return { ok: false, message: "The signature image must be 1 MB or smaller." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectSignatureMimeType(bytes);
  if (!mimeType) {
    return { ok: false, message: "The signature must be a PNG or JPEG image." };
  }
  return { ok: true, dataUrl: `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}` };
}
