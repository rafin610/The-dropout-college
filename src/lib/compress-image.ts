"use client";

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/**
 * Resize and re-encode a photo in the browser before upload. This keeps the
 * public feed fast and makes it far more likely that a camera photo stays under
 * the server's 5MB limit. Animated GIFs and unsupported formats are returned
 * untouched; the server validates the final type.
 */
export async function compressImage(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {},
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Choose an image smaller than 20MB.");
  }

  const maxWidth = options.maxWidth ?? 1600;
  const maxHeight = options.maxHeight ?? 1600;
  const quality = options.quality ?? 0.82;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;
    if (blob.size >= file.size && scale === 1) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

export function validateImageSize(file: File): string | null {
  if (file.size > 5 * 1024 * 1024) return "Images must be 5MB or smaller.";
  return null;
}
