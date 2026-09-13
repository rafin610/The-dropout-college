"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, LoaderCircle, Mail, KeyRound } from "lucide-react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Vercel redirects the apex project domain to this stable team deployment alias.
// OAuth must start and finish on the same host so Supabase's PKCE verifier cookie survives.
const CANONICAL_SITE_URL = "https://the-dropout-college-ahmedrafin014-9807s-projects.vercel.app";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";

  const [authMode, setAuthMode] = useState<"otp" | "password">("otp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");

  async function continueWithGoogle() {
    setLoading(true);
    setMessage("");
    setSuccess("");

    if (window.location.origin !== CANONICAL_SITE_URL) {
      router.push(`${CANONICAL_SITE_URL}/login?next=${encodeURIComponent(nextUrl)}`);
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setLoading(false);
      setMessage("Supabase is not configured yet. Add the Supabase variables to .env.local.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${CANONICAL_SITE_URL}/auth/callback?next=${encodeURIComponent(nextUrl)}` },
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setMessage("Please enter your email address.");
      return;
    }

    setLoading(true);
    setMessage("");
    setSuccess("");
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setLoading(false);
      setMessage("Supabase is not configured yet.");
      return;
    }

    if (authMode === "otp") {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        },
      });

      setLoading(false);
      if (error) {
        setMessage(error.message);
      } else {
        setSuccess("Check your email! We sent a secure sign-in link to your inbox.");
      }
    } else {
      if (!password) {
        setLoading(false);
        setMessage("Please enter your password.");
        return;
      }

      // Try sign in first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!signInError) {
        setLoading(false);
        router.push(nextUrl);
        router.refresh();
        return;
      }

      // If user not found, attempt sign up
      if (signInError.message.toLowerCase().includes("invalid login credentials")) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
          },
        });

        setLoading(false);
        if (signUpError) {
          setMessage(signInError.message);
        } else {
          setSuccess("Account created! Check your email to confirm registration.");
        }
      } else {
        setLoading(false);
        setMessage(signInError.message);
      }
    }
  }

  return (
    <div className="login-panel">
      <Link href="/" className="login-back">
        <ArrowLeft size={14} /> Back to The DropOut College
      </Link>

      <div className="login-brand">
        <Image src="/logo.svg" alt="The DropOut College" width={38} height={38} className="login-logo" />
        <span>The DropOut College</span>
      </div>

      <div className="eyebrow">The talent network</div>
      <h1>Continue with<br /><span>your people.</span></h1>
      <p>Sign in to find collaborators, join projects, and keep your momentum moving.</p>

      <button className="google-button" onClick={continueWithGoogle} disabled={loading} type="button">
        {loading ? <LoaderCircle size={17} className="spin" /> : <span className="google-g">G</span>}
        {loading ? "Connecting..." : "Continue with Google"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 16px" }}>
        <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
        <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>or with email</span>
        <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
      </div>

      <form onSubmit={handleEmailAuth} style={{ display: "grid", gap: 12 }}>
        <div className="field">
          <label style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Email address</label>
          <div style={{ position: "relative" }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              style={{ paddingLeft: 36 }}
            />
            <Mail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          </div>
        </div>

        {authMode === "password" && (
          <div className="field">
            <label style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                style={{ paddingLeft: 36 }}
              />
              <KeyRound size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            </div>
          </div>
        )}

        <button className="button button-primary" type="submit" disabled={loading} style={{ width: "100%", marginTop: 4 }}>
          {loading ? <LoaderCircle size={15} className="spin" /> : null}
          {authMode === "otp" ? "Send Magic Sign-in Link" : "Sign in with password"}
        </button>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
          <button
            type="button"
            onClick={() => { setAuthMode((prev) => (prev === "otp" ? "password" : "otp")); setMessage(""); setSuccess(""); }}
            style={{ background: "transparent", border: 0, color: "var(--muted)", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
          >
            {authMode === "otp" ? "Use password instead" : "Use magic link instead"}
          </button>
        </div>
      </form>

      {message && <p className="login-message" role="alert" style={{ color: "var(--coral)", marginTop: 12 }}>{message}</p>}
      {success && <p className="login-message" role="status" style={{ color: "var(--lime)", marginTop: 12 }}>{success}</p>}

      <small className="login-note" style={{ marginTop: 16 }}>By continuing, you agree to the community guidelines.</small>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="login-page">
      <Suspense fallback={<div className="login-panel"><p className="loading">Loading...</p></div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
