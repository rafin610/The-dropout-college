import { getOptionalUser } from "@/server/auth/current-user";
import { getUserPermissions } from "@/server/auth/permissions";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getOptionalUser();
    if (!user) {
      return Response.json({
        data: {
          authenticated: false,
          canWrite: false,
          isAdmin: false,
          isModerator: false,
          userId: null,
        },
      });
    }

    const permissions = await getUserPermissions(user.id);
    const isAdmin = permissions.has("*") || permissions.has("articles.manage");
    const isModerator = permissions.has("articles.moderate") || permissions.has("articles.create");
    const canWrite = isAdmin || isModerator;

    return Response.json({
      data: {
        authenticated: true,
        canWrite,
        isAdmin,
        isModerator,
        userId: user.id,
      },
    });
  } catch {
    return Response.json({
      data: {
        authenticated: false,
        canWrite: false,
        isAdmin: false,
        isModerator: false,
        userId: null,
      },
    });
  }
}
