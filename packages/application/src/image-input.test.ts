import { describe, expect, it } from "vitest";
import {
  createSafeImageDecoder,
  ImageInputError,
  MAX_IMAGE_BYTES,
  validateImageInput,
} from "./image-input.js";

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8);
  bytes[16] = width >>> 24;
  bytes[17] = width >>> 16;
  bytes[18] = width >>> 8;
  bytes[19] = width;
  bytes[20] = height >>> 24;
  bytes[21] = height >>> 16;
  bytes[22] = height >>> 8;
  bytes[23] = height;
  return bytes;
}

describe("validateImageInput", () => {
  it("accepts a bounded PNG based on its signature, not a filename", () => {
    expect(validateImageInput(png(1200, 900))).toMatchObject({
      ok: true,
      value: { mediaType: "image/png", width: 1200, height: 900 },
    });
  });
  it("rejects unsupported, oversized, and unsafe inputs before extraction", () => {
    expect(validateImageInput(new Uint8Array([1, 2]))).toMatchObject({
      ok: false,
      code: "unsupported_format",
    });
    expect(
      validateImageInput(new Uint8Array(MAX_IMAGE_BYTES + 1)),
    ).toMatchObject({ ok: false, code: "too_large" });
    expect(validateImageInput(png(12_001, 1))).toMatchObject({
      ok: false,
      code: "unsafe_dimensions",
    });
  });

  it("rejects animated WebP input", () => {
    const animated = new Uint8Array(30);
    animated.set([82, 73, 70, 70], 0);
    animated.set([87, 69, 66, 80], 8);
    animated.set([86, 80, 56, 88], 12);
    animated[20] = 0b0000_0010;
    expect(validateImageInput(animated)).toMatchObject({
      ok: false,
      code: "unsupported_format",
    });
  });
});

describe("createSafeImageDecoder", () => {
  it("validates both the upload and sanitized output", async () => {
    const decoder = createSafeImageDecoder({
      sanitize: async (_bytes, detected) => {
        expect(detected).toMatchObject({ width: 1200, height: 900 });
        return png(800, 600);
      },
    });
    await expect(
      decoder.decodeAndSanitize(png(1200, 900)),
    ).resolves.toMatchObject({
      metadata: { mediaType: "image/png", width: 800, height: 600 },
    });
  });

  it("returns a correction-friendly error before invoking the sanitizer", async () => {
    let calls = 0;
    const decoder = createSafeImageDecoder({
      sanitize: async (bytes) => {
        calls += 1;
        return bytes;
      },
    });
    await expect(
      decoder.decodeAndSanitize(new Uint8Array([1, 2])),
    ).rejects.toMatchObject({
      name: ImageInputError.name,
      code: "unsupported_format",
    });
    expect(calls).toBe(0);
  });

  it("maps safe-decode failures to a correction-friendly image error", async () => {
    const decoder = createSafeImageDecoder({
      sanitize: async () => {
        throw new Error("decoder detail");
      },
    });
    await expect(
      decoder.decodeAndSanitize(png(1200, 900)),
    ).rejects.toMatchObject({
      name: "ImageInputError",
      code: "invalid_image",
      message: "The image could not be safely decoded.",
    });
  });
});
