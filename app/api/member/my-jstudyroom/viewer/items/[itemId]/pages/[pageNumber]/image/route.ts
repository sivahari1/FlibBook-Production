import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

function extractStoragePathFromPageUrl(pageUrl: string): string | null {
  if (!pageUrl) return null;

  // already relative
  if (!pageUrl.startsWith("http")) return pageUrl.replace(/^\/+/, "");

  try {
    const url = new URL(pageUrl);
    const markers = [
      "/storage/v1/object/public/document-pages/",
      "/storage/v1/object/sign/document-pages/",
      "/storage/v1/object/document-pages/",
      "/storage/v1/object/authenticated/document-pages/",
    ];

    for (const marker of markers) {
      const idx = url.pathname.indexOf(marker);
      if (idx !== -1) {
        return decodeURIComponent(url.pathname.slice(idx + marker.length));
      }
    }

    const alt = url.pathname.split("/document-pages/")[1];
    return alt ? decodeURIComponent(alt) : null;
  } catch {
    return null;
  }
}

interface RouteContext {
  params: Promise<{ itemId: string; pageNumber: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId, pageNumber } = await context.params;
    const pageNum = parseInt(pageNumber, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
    }

    const myJstudyroomItem = await prisma.myJstudyroomItem.findFirst({
      where: { id: itemId, userId: session.user.id },
      include: { bookShopItem: { include: { document: true } } },
    });

    if (!myJstudyroomItem) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const documentId = myJstudyroomItem.bookShopItem.document.id;

    const page = await prisma.documentPage.findFirst({
      where: { documentId, pageNumber: pageNum },
      select: { pageUrl: true, storagePath: true, format: true },
    });

    if (!page) {
      return NextResponse.json({ error: `Page ${pageNum} not found` }, { status: 404 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const bucket = "document-pages";

    // Prefer storagePath (new column). If missing, derive from pageUrl.
    const storagePath =
      (page.storagePath && page.storagePath.trim().length > 0 ? page.storagePath.trim() : null) ??
      extractStoragePathFromPageUrl(page.pageUrl);

    if (!storagePath) {
      return NextResponse.json(
        { error: "No storage path found for this page (storagePath/pageUrl empty)" },
        { status: 500 }
      );
    }

    console.log("✅ Using storagePath:", storagePath);

    const { data, error } = await supabase.storage.from(bucket).download(storagePath);

    if (error || !data) {
      console.error("Supabase download error:", error);
      return NextResponse.json(
        { error: "Object not found in storage", debug: { storagePath } },
        { status: 404 }
      );
    }

    const buffer = await data.arrayBuffer();
    const fmt = (page.format || "jpeg").toLowerCase();
    const contentType = fmt === "png" ? "image/png" : fmt === "webp" ? "image/webp" : "image/jpeg";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": buffer.byteLength.toString(),
      },
    });
  } catch (e) {
    console.error("Image proxy error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
