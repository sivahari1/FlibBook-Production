import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("[/api/bookshop] Starting BookShop API request");
    
    // Get session for user context (optional)
    let session = null;
    try {
      session = await getServerSession(authOptions);
      console.log("[/api/bookshop] Session:", session?.user?.email || "none");
    } catch (sessionError) {
      console.warn("[/api/bookshop] Session error (continuing without):", sessionError);
    }

    console.log("[/api/bookshop] Querying database for published BookShop items");
    
    const rawItems = await prisma.bookShopItem.findMany({
      where: { isPublished: true },
      include: { 
        document: {
          select: {
            id: true,
            title: true,
            filename: true,
            contentType: true,
            mimeType: true,
            storagePath: true,
            thumbnailUrl: true,
            linkUrl: true,
            metadata: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`[/api/bookshop] Found ${rawItems.length} published items`);

    const items = rawItems.map((item: any) => {
      const doc: any = item.document ?? null;

      const isPdf =
        item.contentType === "PDF" ||
        doc?.contentType === "PDF" ||
        doc?.mimeType === "application/pdf";

      return {
        id: item.id,
        documentId: item.documentId,
        title: item.title,
        description: item.description ?? null,
        category: item.category ?? null,
        isFree: !!item.isFree,
        price: item.price ?? null,
        isPublished: !!item.isPublished,
        contentType: item.contentType ?? null,

        isPdf,

        // ✅ temporary: without session we cannot compute this
        inMyJstudyroom: false,

        document: doc
          ? {
              id: doc.id,
              title: doc.title,
              filename: doc.filename,
              contentType: doc.contentType ?? null,
              mimeType: doc.mimeType ?? null,
              storagePath: doc.storagePath ?? null,
              thumbnailUrl: doc.thumbnailUrl ?? null,
              linkUrl: doc.linkUrl ?? null,
              previewUrl: doc.previewUrl ?? null,
              metadata: doc.metadata ?? null,
            }
          : null,
      };
    });

    console.log("[/api/bookshop] Successfully processed items, returning response");

    return NextResponse.json(
      { ok: true, items, total: items.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("[/api/bookshop] ERROR:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    return NextResponse.json(
      { 
        ok: false, 
        error: "Failed to load bookshop items",
        items: [], 
        total: 0 
      },
      { 
        status: 500, 
        headers: { "Cache-Control": "no-store" } 
      }
    );
  }
}
