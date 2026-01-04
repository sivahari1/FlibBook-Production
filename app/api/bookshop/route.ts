import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // adjust if needed

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawItems = await prisma.bookShopItem.findMany({
      where: { isPublished: true },
      include: { document: true },
      orderBy: { createdAt: "desc" },
    });

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

    return NextResponse.json(
      { items, total: items.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("[/api/bookshop] FAILED:", e);
    return NextResponse.json(
      { items: [], total: 0, error: "BOOKSHOP_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
