import { describe, expect, it } from "vitest";
import { MAX_SIGNATURE_BYTES, detectSignatureMimeType, parseSignatureUpload } from "./signature";

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48];
const JPEG_BYTES = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01];

function fileOf(bytes: ArrayLike<number>, name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function decodeDataUrl(dataUrl: string): number[] {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return [...Buffer.from(base64, "base64")];
}

describe("detectSignatureMimeType", () => {
  it("recognises PNG and JPEG magic bytes", () => {
    expect(detectSignatureMimeType(new Uint8Array(PNG_BYTES))).toBe("image/png");
    expect(detectSignatureMimeType(new Uint8Array(JPEG_BYTES))).toBe("image/jpeg");
  });

  it("returns null for other or truncated content", () => {
    expect(detectSignatureMimeType(new Uint8Array([0x89, 0x50, 0x4e]))).toBeNull();
    expect(detectSignatureMimeType(new Uint8Array())).toBeNull();
  });
});

describe("parseSignatureUpload", () => {
  it("accepts a PNG and returns a PNG data URL with the original bytes", async () => {
    const result = await parseSignatureUpload(fileOf(PNG_BYTES, "signature.png", "image/png"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(decodeDataUrl(result.dataUrl)).toEqual(PNG_BYTES);
  });

  it("accepts a JPEG and returns a JPEG data URL", async () => {
    const result = await parseSignatureUpload(fileOf(JPEG_BYTES, "signature.jpg", "image/jpeg"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dataUrl.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(decodeDataUrl(result.dataUrl)).toEqual(JPEG_BYTES);
  });

  it("uses the detected type, not the browser-reported one", async () => {
    const result = await parseSignatureUpload(fileOf(PNG_BYTES, "signature.jpg", "image/jpeg"));

    expect(result.ok && result.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("rejects an SVG even when it claims to be a PNG", async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const result = await parseSignatureUpload(fileOf(svg, "signature.png", "image/png"));

    expect(result).toEqual({ ok: false, message: "The signature must be a PNG or JPEG image." });
  });

  it("rejects a GIF", async () => {
    const gif = new TextEncoder().encode("GIF89a\x01\x00\x01\x00");
    const result = await parseSignatureUpload(fileOf(gif, "signature.gif", "image/gif"));

    expect(result.ok).toBe(false);
  });

  it("rejects an empty file", async () => {
    const result = await parseSignatureUpload(fileOf([], "empty.png", "image/png"));

    expect(result).toEqual({ ok: false, message: "The selected file is empty." });
  });

  it("accepts exactly the size limit and rejects anything larger", async () => {
    const atLimit = new Uint8Array(MAX_SIGNATURE_BYTES);
    atLimit.set(PNG_BYTES);
    const tooLarge = new Uint8Array(MAX_SIGNATURE_BYTES + 1);
    tooLarge.set(PNG_BYTES);

    expect((await parseSignatureUpload(fileOf(atLimit, "ok.png", "image/png"))).ok).toBe(true);
    expect(await parseSignatureUpload(fileOf(tooLarge, "big.png", "image/png"))).toEqual({
      ok: false,
      message: "The signature image must be 1 MB or smaller.",
    });
  });
});
