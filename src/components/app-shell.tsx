import { getOptionalUser } from "@/server/auth/current-user";
import { getMemberRole } from "@/server/auth/roles";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { AppFrame } from "@/components/app/app-frame";
import type { AppViewer } from "@/components/app/viewer";

export async function AppShell({ children }: { children: React.ReactNode }) {
  let viewer: AppViewer | null = null;

  try {
    const user = await getOptionalUser();
    if (user) {
      const supabase = await createSupabaseServerClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      viewer = {
        id: user.id,
        displayName:
          profile?.display_name ||
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          "Member",
        username: profile?.username || "",
        avatarUrl: profile?.avatar_url || null,
        role: await getMemberRole(user.id),
      };
    }
  } catch {
    // Public pages remain usable if Supabase is temporarily unavailable or the
    // new migration has not been applied yet.
  }

  return <AppFrame viewer={viewer}>{children}</AppFrame>;
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
