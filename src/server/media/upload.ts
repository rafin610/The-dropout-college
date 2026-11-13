import { ApiError } from "@/server/errors";
import { createSupabaseServerClient } from "@/server/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function uploadMemberImage(options: {
  file: File;
  userId: string;
  bucket: "post-media" | "journal-media" | "profile-media";
}): Promise<{ url: string; filename: string }> {
  const extension = ALLOWED[options.file.type];
  if (!extension) {
    throw new ApiError("VALIDATION_ERROR", "Use a JPEG, PNG, WebP, or GIF image.", 400);
  }
  if (options.file.size > MAX_BYTES) {
    throw new ApiError("VALIDATION_ERROR", "Images must be 5MB or smaller.", 400);
  }

  const buffer = Buffer.from(await options.file.arrayBuffer());
  const filename = `${options.userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.storage.from(options.bucket).upload(filename, buffer, {
    contentType: options.file.type,
    upsert: false,
    cacheControl: "31536000",
  });

  if (error) {
    throw new ApiError("INTERNAL_ERROR", "The image could not be uploaded. Please try again.", 500);
  }

  const { data } = supabase.storage.from(options.bucket).getPublicUrl(filename);
  return { url: data.publicUrl, filename };
}

export function readImageFile(formData: FormData): File {
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    throw new ApiError("VALIDATION_ERROR", "Choose an image to upload.", 400);
  }
  return file;
}
