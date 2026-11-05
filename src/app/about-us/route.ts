import { NextResponse } from "next/server";

export function GET(request: Request) {
  const url = new URL("/about", request.url);
  return NextResponse.redirect(url, { status: 308 });
}
