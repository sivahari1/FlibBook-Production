export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ok =
    !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Response.json({
    ok,
    hasUrl: !!process.env.SUPABASE_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
