import { getCurrentUser } from "@/server/auth/current-user";
import { getUserPermissions } from "@/server/auth/permissions";
import { toErrorResponse, ApiError } from "@/server/errors";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/server/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const user = await getCurrentUser();
    const permissions = await getUserPermissions(user.id);

    if (!permissions.has("*") && !permissions.has("articles.create") && !permissions.has("articles.manage")) {
      throw new ApiError("FORBIDDEN", "Only Admins and Moderators can upload journal media.", 403);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new ApiError("VALIDATION_ERROR", "No image file provided.", 400);
    }

    const extension = ALLOWED_IMAGE_EXTENSIONS[file.type];
    if (!extension) {
      throw new ApiError("VALIDATION_ERROR", "File type not supported. Allowed: JPEG, PNG, WebP, and GIF.", 400);
    }

    if (file.size > MAX_BYTES) {
      throw new ApiError("VALIDATION_ERROR", "Image exceeds maximum allowed size of 5MB.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;

    const adminClient = createSupabaseAdminClient();
    const supabase = adminClient ?? (await createSupabaseServerClient());

    const { error: uploadError } = await supabase.storage
      .from("project-covers")
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new ApiError("INTERNAL_ERROR", `Failed to upload image: ${uploadError.message}`, 500);
    }

    const { data: publicUrlData } = supabase.storage
      .from("project-covers")
      .getPublicUrl(filename);

    return Response.json({
      data: {
        url: publicUrlData.publicUrl,
        filename,
      },
      requestId,
    });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
