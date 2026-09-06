"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function continueWithGoogle() {
    setLoading(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setLoading(false);
      setMessage("Google sign-in is not configured yet. Add the Supabase variables to .env.local.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(searchParams.get("next") || "/dashboard")}` },
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
    }
  }

  return <main className="login-page"><div className="login-panel"><Link href="/" className="login-back"><ArrowLeft size={14} /> Back to The DropOut College</Link><div className="login-brand"><Image src="/logo.svg" alt="The DropOut College" width={38} height={38} className="login-logo" /><span>The DropOut College</span></div><div className="eyebrow">The talent network</div><h1>Continue with<br /><span>your people.</span></h1><p>Sign in to find collaborators, join projects, and keep your momentum moving.</p><button className="google-button" onClick={continueWithGoogle} disabled={loading}>{loading ? <LoaderCircle size={17} className="spin" /> : <span className="google-g">G</span>}{loading ? "Connecting..." : "Continue with Google"}</button>{message && <p className="login-message" role="alert">{message}</p>}<small className="login-note">By continuing, you agree to the community guidelines.</small></div></main>;
}