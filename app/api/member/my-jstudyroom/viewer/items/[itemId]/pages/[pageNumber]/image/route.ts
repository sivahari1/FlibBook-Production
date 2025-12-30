import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { supabaseServer, inferContentTypeFromPath } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGES_BUCKET = process.env.SUPABASE_PAGES_BUCKET || "document-pages";

function getObjectPathFromPageUrl(pageUrl: string, bucket = PAGES_BUCKET) {
  if (!pageUrl) return null;

  // If DB already stores a plain object path, accept it
  if (!pageUrl.startsWith("http")) return pageUrl.replace(/^\/+/, "");

  const url = new URL(pageUrl);

  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
    `/storage/v1/object/${bucket}/`,
    `/storage/v1/object/authenticated/${bucket}/`,
  ];

  for (const marker of markers) {
    const idx = url.pathname.indexOf(marker);
    if (idx !== -1) {
      return decodeURIComponent(url.pathname.slice(idx + marker.length));
    }
  }

  return null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ itemId: string; pageNumber: string }> }
) {
  try {
    // ✅ Next.js 15: params is async
    const { itemId, pageNumber } = await ctx.params;
    const pageNum = Number(pageNumber);

    // 1) Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Validate page number
    if (!Number.isFinite(pageNum) || pageNum < 1) {
      return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
    }

    // 3) Verify access + resolve documentId
    const myItem = await prisma.myJstudyroomItem.findFirst({
      where: { id: itemId, userId: session.user.id },
      include: { bookShopItem: { include: { document: true } } },
    });

    const documentId = myItem?.bookShopItem?.document?.id;
    if (!documentId) {
      return NextResponse.json({ error: "Not found or access denied" }, { status: 403 });
    }

    // 4) Fetch the exact page row (NO skip/take)
    // ✅ IMPORTANT: Prisma field is storagePath (mapped to storage_path in DB)
    const pageRow = await prisma.documentPage.findFirst({
      where: { documentId, pageNumber: pageNum },
      select: {
        storagePath: true,
        pageUrl: true,
      },
    });

    // 5) Determine object path in bucket
    const objectPath =
      pageRow?.storagePath ||
      (pageRow?.pageUrl ? getObjectPathFromPageUrl(pageRow.pageUrl) : null);

    if (!objectPath) {
      return NextResponse.json(
        { error: "Page image not available", message: "No storagePath/pageUrl in DB" },
        { status: 404 }
      );
    }

    // 6) Download from Supabase Storage
    const sb = supabaseServer();
    const { data, error } = await sb.storage.from(PAGES_BUCKET).download(objectPath);

    if (error || !data) {
      return NextResponse.json(
        { error: "Page image not available", message: "Failed to download from storage", details: String(error?.message || error) },
        { status: 404 }
      );
    }

    const buf = await data.arrayBuffer();
    const contentType = inferContentTypeFromPath(objectPath);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (e) {
    console.error("Member viewer image route error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
