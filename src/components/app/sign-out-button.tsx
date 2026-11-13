"use client";

import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton({
  showLabel = false,
  className = "",
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Fall through to the feed; middleware will settle the session.
    } finally {
      router.push("/");
      router.refresh();
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`app-signout${className ? ` ${className}` : ""}`}
      onClick={() => void signOut()}
      disabled={busy}
      aria-label="Sign out"
      title="Sign out"
    >
      {busy ? <Loader2 size={15} className="spin" /> : <LogOut size={15} />}
      {showLabel && <span>Sign out</span>}
    </button>
  );
}
