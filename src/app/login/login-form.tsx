"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, LoaderCircle, AlertCircle } from "lucide-react";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function resolveFriendlyError(errorCode?: string | null): string | null {
  if (!errorCode) return null;
  const lower = errorCode.toLowerCase();

  if (lower.includes("cancel") || lower.includes("access_denied")) {
    return "Google sign-in was cancelled. Click the button below to try again.";
  }
  if (lower.includes("service_unavailable") || lower.includes("not configured")) {
    return "Authentication is currently unavailable. Please try again in a few moments.";
  }
  return "Couldn't sign you in with Google. Please try again.";
}

export function LoginForm({
  initialError,
  nextUrl,
}: {
  initialError?: string | null;
  nextUrl: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => resolveFriendlyError(initialError));

  // Listen to client-side auth state changes
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        startTransition(() => {
          router.replace(nextUrl);
          router.refresh();
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [nextUrl, router]);

  async function continueWithGoogle() {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error("[Google OAuth Error]", error.message);
        setErrorMessage("Couldn't sign you in with Google. Please try again.");
        setLoading(false);
      }
      // On success, the browser will be redirected to Google's consent screen.
    } catch (err) {
      console.error("[Google OAuth Exception]", err);
      setErrorMessage("Couldn't connect to Google authentication. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="login-panel">
      <Link href="/" className="login-back" aria-label="Return to homepage">
        <ArrowLeft size={13} aria-hidden="true" />
        <span>Back to The DropOut College</span>
      </Link>

      <div className="login-brand">
        <Image
          src="/logo.svg"
          alt=""
          width={36}
          height={36}
          priority
          className="brand-logo"
        />
        <span>The DropOut College</span>
      </div>

      <div className="eyebrow">THE TALENT NETWORK</div>

      <h1>
        Continue with<br />
        <span>your people.</span>
      </h1>

      <p className="login-subtitle">
        Sign in to find collaborators, join projects, and keep your momentum moving.
      </p>

      {errorMessage && (
        <div className="login-message error" role="alert">
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          <div>{errorMessage}</div>
        </div>
      )}

      <button
        className="google-button"
        onClick={continueWithGoogle}
        disabled={loading}
        type="button"
        aria-busy={loading}
        style={{ marginTop: errorMessage ? 16 : 4 }}
      >
        {loading ? (
          <>
            <LoaderCircle size={18} className="spin" aria-hidden="true" />
            <span>Connecting to Google...</span>
          </>
        ) : (
          <>
            <span className="google-icon-wrap" aria-hidden="true">
              <GoogleIcon />
            </span>
            <span>Continue with Google</span>
          </>
        )}
      </button>

      <small className="login-note">
        By continuing, you agree to the community guidelines.
      </small>
    </div>
  );
}
