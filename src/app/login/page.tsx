import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getOptionalUser } from "@/server/auth/current-user";
import { LoginForm } from "@/app/login/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; error_description?: string }>;
}) {
  const params = await searchParams;
  const next = params.next;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  // If already authenticated, redirect immediately without rendering or flashing the login page
  const user = await getOptionalUser();
  if (user) {
    redirect(safeNext);
  }

  return (
    <main className="login-page">
      <Suspense fallback={<div className="login-panel"><p className="loading">Loading…</p></div>}>
        <LoginForm initialError={params.error || params.error_description} nextUrl={safeNext} />
      </Suspense>
    </main>
  );
}
