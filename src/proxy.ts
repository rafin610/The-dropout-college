import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/server/supabase/update-session";

export async function proxy(request: NextRequest) {
  // If OAuth callback hits the root URL, forward all parameters to /auth/callback
  if (
    request.nextUrl.pathname === "/" &&
    (request.nextUrl.searchParams.has("code") || request.nextUrl.searchParams.has("error"))
  ) {
    const callbackUrl = new URL("/auth/callback", request.url);
    request.nextUrl.searchParams.forEach((val, key) => {
      callbackUrl.searchParams.set(key, val);
    });
    if (!callbackUrl.searchParams.has("next")) {
      callbackUrl.searchParams.set("next", "/dashboard");
    }
    return NextResponse.redirect(callbackUrl);
  }

  try {
    const { response, user } = await updateSession(request);
    const protectedPrefixes = ["/dashboard", "/control-room", "/journal/studio"];
    const isProtected = protectedPrefixes.some(
      (prefix) =>
        request.nextUrl.pathname === prefix ||
        request.nextUrl.pathname.startsWith(`${prefix}/`),
    );

    if (isProtected && !user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set(
        "next",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      const redirectResponse = NextResponse.redirect(loginUrl);
      response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
      return redirectResponse;
    }
    return response;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};