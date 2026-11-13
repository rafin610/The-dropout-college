import { getCurrentUser } from "@/server/auth/current-user";
import { toErrorResponse } from "@/server/errors";
import { readImageFile, uploadMemberImage } from "@/server/media/upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await getCurrentUser();
    const formData = await request.formData();
    const file = readImageFile(formData);
    const result = await uploadMemberImage({ file, userId: user.id, bucket: "profile-media" });
    return Response.json({ data: result, requestId });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
