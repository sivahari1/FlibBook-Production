import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/db"; // adjust if your prisma export path differs

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: { itemId: string; pageNumber: string } };

function supabaseServer() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

function contentTypeFromFormat(format?: string) {
  const f = (format || "").toLowerCase();
  if (f === "png") return "image/png";
  if (f === "webp") return "image/webp";
  return "image/jpeg"; // default aligns with your DocumentPage.format default "jpeg"
}

export async function GET(_req: Request, context: Ctx) {
  try {
    const { itemId, pageNumber } = context.params;
    const pageNum = Number(pageNumber);

    if (!itemId || !Number.isInteger(pageNum) || pageNum <= 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // 1) Item -> Document (via BookShopItem)
    const item = await prisma.myJstudyroomItem.findUnique({
      where: { id: itemId },
      select: {
        userId: true,
        bookShopItem: { select: { documentId: true } },
      },
    });

    const documentId = item?.bookShopItem?.documentId;
    if (!documentId) {
      return NextResponse.json({ error: "Item/document not found" }, { status: 404 });
    }

    // 2) DocumentPage -> storagePath
    const page = await prisma.documentPage.findUnique({
      where: { documentId_pageNumber: { documentId, pageNumber: pageNum } },
      select: { storagePath: true, format: true },
    });

    if (!page?.storagePath) {
      return NextResponse.json(
        { error: "Page not generated", documentId, pageNum },
        { status: 404 }
      );
    }

    // 3) Download from Supabase
    const sb = supabaseServer();
    const { data, error } = await sb.storage.from("document-pages").download(page.storagePath);

    if (error || !data) {
      console.error("Supabase download error:", error, { storagePath: page.storagePath });
      return NextResponse.json(
        { error: "Storage download failed", details: error?.message, storagePath: page.storagePath },
        { status: 404 }
      );
    }

    const buf = Buffer.from(await data.arrayBuffer());
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": data.type || contentTypeFromFormat(page.format),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e: any) {
    console.error("Member page image route error:", e);
    return NextResponse.json({ error: e?.message ?? "Internal Server Error" }, { status: 500 });
  }
}
