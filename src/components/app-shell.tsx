import { getViewerProfile } from "@/server/auth/viewer";
import { AppFrame } from "@/components/app/app-frame";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewerProfile();
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
