import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/server/supabase/update-session";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const callbackUrl = new URL("/auth/callback", request.url);
    callbackUrl.searchParams.set("code", request.nextUrl.searchParams.get("code") || "");
    callbackUrl.searchParams.set("next", request.nextUrl.searchParams.get("next") || "/dashboard");
    return NextResponse.redirect(callbackUrl);
  }

  try {
    return await updateSession(request);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};