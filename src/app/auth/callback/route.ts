import { NextResponse } from "next/server";
import { getAccountStatus } from "@/server/auth/current-user";
import { isActiveAccountStatus } from "@/server/auth/account-status";
import { safeRedirectPath, DEFAULT_REDIRECT_PATH } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const dynamic = "force-dynamic";

function resolveOrigin(requestUrl: URL): string {
  // Do not trust x-forwarded-host: it is attacker-controlled unless a trusted
  // proxy strips it. Prefer the configured canonical origin; if none is
  // configured, stay on the origin that served this callback so the session
  // cookies just set on this response remain usable.
  if (process.env.NODE_ENV === "development") return requestUrl.origin;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  return configured || requestUrl.origin;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const safeNext = safeRedirectPath(url.searchParams.get("next"));
  const origin = resolveOrigin(url);

  const loginRedirect = (errorCode: string) => {
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("error", errorCode);
    if (safeNext !== DEFAULT_REDIRECT_PATH) {
      redirectUrl.searchParams.set("next", safeNext);
    }
    return NextResponse.redirect(redirectUrl);
  };

  // Handle OAuth provider errors (e.g. user dismissed or cancelled Google consent)
  if (error) {
    console.error("[OAuth Provider Error]", error, errorDescription);
    return loginRedirect(error === "access_denied" ? "cancelled" : "oauth_failed");
  }

  if (!code) {
    return loginRedirect("missing_code");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: sessionData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[OAuth Code Exchange Error]", exchangeError.message);
      return loginRedirect("oauth_failed");
    }

    if (sessionData?.user) {
      const status = await getAccountStatus(sessionData.user.id);
      if (status !== null && !isActiveAccountStatus(status)) {
        await supabase.auth.signOut();
        return loginRedirect("suspended");
      }

      const { ensureUserProfile } = await import("@/server/auth/current-user");
      await ensureUserProfile(sessionData.user);
    }

    return NextResponse.redirect(new URL(safeNext, origin));
  } catch (err) {
    console.error("[OAuth Callback Exception]", err);
    return loginRedirect("service_unavailable");
  }
}
