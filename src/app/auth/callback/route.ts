import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const next = url.searchParams.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  // Resolve true public origin (important on Vercel and reverse proxies)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const isLocal = process.env.NODE_ENV === "development";

  let origin = url.origin;
  if (!isLocal && forwardedHost) {
    origin = `${forwardedProto}://${forwardedHost}`;
  } else if (!isLocal && process.env.NEXT_PUBLIC_SITE_URL) {
    origin = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }

  // Handle OAuth provider errors (e.g. user dismissed or cancelled Google consent)
  if (error) {
    console.error("[OAuth Provider Error]", error, errorDescription);
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("error", error === "access_denied" ? "cancelled" : "oauth_failed");
    if (safeNext !== "/dashboard") {
      redirectUrl.searchParams.set("next", safeNext);
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("error", "missing_code");
    if (safeNext !== "/dashboard") {
      redirectUrl.searchParams.set("next", safeNext);
    }
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[OAuth Code Exchange Error]", exchangeError.message);
      const redirectUrl = new URL("/login", origin);
      redirectUrl.searchParams.set("error", "oauth_failed");
      if (safeNext !== "/dashboard") {
        redirectUrl.searchParams.set("next", safeNext);
      }
      return NextResponse.redirect(redirectUrl);
    }

    if (sessionData?.user) {
      const { ensureUserProfile } = await import("@/server/auth/current-user");
      await ensureUserProfile(sessionData.user);
    }

    return NextResponse.redirect(new URL(safeNext, origin));
  } catch (err) {
    console.error("[OAuth Callback Exception]", err);
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("error", "service_unavailable");
    if (safeNext !== "/dashboard") {
      redirectUrl.searchParams.set("next", safeNext);
    }
    return NextResponse.redirect(redirectUrl);
  }
}