import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PDF_BUCKET = process.env.SUPABASE_PDF_BUCKET || "documents"; // change if your pdf bucket name differs

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await ctx.params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // verify member owns this myJstudyroom item + get pdf storagePath
    const myItem = await prisma.myJstudyroomItem.findFirst({
      where: { id: itemId, userId: session.user.id },
      include: { bookShopItem: { include: { document: true } } },
    });

    const doc = myItem?.bookShopItem?.document;
    if (!doc?.storagePath) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // storagePath example: pdfs/<userId>/<file>.pdf
    const sb = supabaseServer();
    const { data, error } = await sb.storage.from(PDF_BUCKET).download(doc.storagePath);

    if (error || !data) {
      return NextResponse.json({ error: "Failed to download PDF" }, { status: 404 });
    }

    const buf = await data.arrayBuffer();

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (e) {
    console.error("PDF proxy error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
