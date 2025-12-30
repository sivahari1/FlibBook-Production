export const runtime = "nodejs";

export async function GET() {
  return new Response("Diagnose route disabled in production.", { status: 410 });
}
