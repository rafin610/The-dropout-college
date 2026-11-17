export const runtime = "nodejs";

export function GET() {
  return Response.json({ data: { status: "ok", service: "dropout-api", timestamp: new Date().toISOString() } });
}