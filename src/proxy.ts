import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/server/supabase/update-session";

export async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};