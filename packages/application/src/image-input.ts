/** Content is accepted only through an ephemeral artifact store. Never log bytes. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 12_000;
export const MAX_IMAGE_PIXELS = 20_000_000;

export type SupportedImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export interface ValidatedImageInput {
  readonly mediaType: SupportedImageMediaType;
  readonly byteLength: number;
  readonly width: number;
  readonly height: number;
}

export class ImageInputError extends Error {
  constructor(
    readonly code: Exclude<ImageInputValidationResult, { ok: true }>["code"],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ImageInputError";
  }
}

export interface SafeRasterSanitizerPort {
  /** Decodes the raster, strips metadata, and re-encodes it without animation. */
  sanitize(
    bytes: Uint8Array,
    detected: ValidatedImageInput,
  ): Promise<Uint8Array>;
}

export interface SafeImageDecoderPort {
  decodeAndSanitize(bytes: Uint8Array): Promise<{
    readonly bytes: Uint8Array;
    readonly metadata: ValidatedImageInput;
  }>;
}

export type ImageInputValidationResult =
  | { readonly ok: true; readonly value: ValidatedImageInput }
  | {
      readonly ok: false;
      readonly code:
        | "empty"
        | "too_large"
        | "unsupported_format"
        | "invalid_image"
        | "unsafe_dimensions";
      readonly message: string;
    };

function u32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset]! << 24) |
      (bytes[offset + 1]! << 16) |
      (bytes[offset + 2]! << 8) |
      bytes[offset + 3]!) >>>
    0
  );
}
function u16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function png(bytes: Uint8Array): readonly [number, number] | null {
  if (
    bytes.length < 24 ||
    bytes[0] !== 137 ||
    bytes[1] !== 80 ||
    bytes[2] !== 78 ||
    bytes[3] !== 71
  )
    return null;
  return [u32(bytes, 16), u32(bytes, 20)];
}
function jpeg(bytes: Uint8Array): readonly [number, number] | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1]!;
    const length = u16(bytes, i + 2);
    if (length < 2 || i + 2 + length > bytes.length) return null;
    if (marker >= 0xc0 && marker <= 0xc3)
      return [u16(bytes, i + 7), u16(bytes, i + 5)];
    i += length + 2;
  }
  return null;
}
function webp(bytes: Uint8Array): readonly [number, number] | null {
  if (
    bytes.length < 30 ||
    String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" ||
    String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP"
  )
    return null;
  if (String.fromCharCode(...bytes.slice(12, 16)) !== "VP8X") return null;
  if ((bytes[20]! & 0b0000_0010) !== 0) return null;
  return [
    1 + bytes[24]! + (bytes[25]! << 8) + (bytes[26]! << 16),
    1 + bytes[27]! + (bytes[28]! << 8) + (bytes[29]! << 16),
  ];
}

export function validateImageInput(
  bytes: Uint8Array,
): ImageInputValidationResult {
  if (bytes.length === 0)
    return { ok: false, code: "empty", message: "An image is required." };
  if (bytes.length > MAX_IMAGE_BYTES)
    return {
      ok: false,
      code: "too_large",
      message: "Images must not exceed 10 MiB.",
    };
  const detected = png(bytes)
    ? (["image/png", png(bytes)!] as const)
    : jpeg(bytes)
      ? (["image/jpeg", jpeg(bytes)!] as const)
      : webp(bytes)
        ? (["image/webp", webp(bytes)!] as const)
        : null;
  if (detected === null)
    return {
      ok: false,
      code: "unsupported_format",
      message: "Use a JPEG, PNG, or non-animated WebP image.",
    };
  const [mediaType, [width, height]] = detected;
  if (width === 0 || height === 0)
    return {
      ok: false,
      code: "invalid_image",
      message: "The image has invalid dimensions.",
    };
  if (
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  )
    return {
      ok: false,
      code: "unsafe_dimensions",
      message: "The image dimensions exceed the safety limit.",
    };
  return {
    ok: true,
    value: Object.freeze({
      mediaType,
      byteLength: bytes.length,
      width,
      height,
    }),
  };
}

export function createSafeImageDecoder(
  sanitizer: SafeRasterSanitizerPort,
): SafeImageDecoderPort {
  const requireValid = (bytes: Uint8Array): ValidatedImageInput => {
    const result = validateImageInput(bytes);
    if (!result.ok) throw new ImageInputError(result.code, result.message);
    return result.value;
  };

  return Object.freeze({
    async decodeAndSanitize(bytes: Uint8Array) {
      const detected = requireValid(bytes);
      let sanitized: Uint8Array;
      try {
        sanitized = await sanitizer.sanitize(bytes, detected);
      } catch (error) {
        throw new ImageInputError(
          "invalid_image",
          "The image could not be safely decoded.",
          { cause: error },
        );
      }
      const metadata = requireValid(sanitized);
      return Object.freeze({ bytes: sanitized, metadata });
    },
  });
}
