import { getCurrentUser } from "@/server/auth/current-user";
import { getUserPermissions } from "@/server/auth/permissions";
import { toErrorResponse, ApiError } from "@/server/errors";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/server/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

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

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new ApiError("VALIDATION_ERROR", "File type not supported. Allowed: JPEG, PNG, WebP, GIF, SVG.", 400);
    }

    if (file.size > MAX_BYTES) {
      throw new ApiError("VALIDATION_ERROR", "Image exceeds maximum allowed size of 8MB.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "png";
    const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;

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
