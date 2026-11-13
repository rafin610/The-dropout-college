import { getCurrentUser } from "@/server/auth/current-user";
import { isStaffRole, getMemberRole } from "@/server/auth/roles";
import { toErrorResponse, ApiError } from "@/server/errors";
import { readImageFile, uploadMemberImage } from "@/server/media/upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const role = await getMemberRole(user.id);
    if (!isStaffRole(role)) {
      throw new ApiError("FORBIDDEN", "Only Admins and Moderators can upload journal media.", 403);
    }

    const formData = await request.formData();
    const file = readImageFile(formData);
    const result = await uploadMemberImage({ file, userId: user.id, bucket: "journal-media" });
    return Response.json({ data: result, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
