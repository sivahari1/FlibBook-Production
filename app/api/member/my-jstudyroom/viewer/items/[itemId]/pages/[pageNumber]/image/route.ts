import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  downloadFromStorage,
  inferContentTypeFromPath,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGES_BUCKET = process.env.SUPABASE_PAGES_BUCKET || "document-pages";

function getObjectPathFromUrlOrPath(maybeUrlOrPath: string, bucket: string): string | null {
  if (!maybeUrlOrPath) return null;

  // already a storage path
  if (!maybeUrlOrPath.startsWith("http")) return maybeUrlOrPath.replace(/^\/+/, "");

  try {
    const url = new URL(maybeUrlOrPath);

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
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { itemId: string; pageNumber: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const itemId = params.itemId;
    const pageNum = Number(params.pageNumber);

    if (!itemId || !Number.isInteger(pageNum) || pageNum <= 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // 1) Resolve item → documentId (adjust model/field names if yours differ)
    const item = await prisma.myJstudyroomItem.findUnique({
      where: { id: itemId },
      select: { id: true, documentId: true, memberId: true },
    });

    if (!item?.documentId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Optional access check (keep if your membership logic requires it)
    // If your project uses a different rule, adjust here.
    // Example: only the same member can view:
    // if (item.memberId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 2) Fetch exact page row
    const pageRow = await prisma.documentPage.findFirst({
      where: { documentId: item.documentId, pageNumber: pageNum },
      select: { storagePath: true, pageUrl: true }, // Prisma field name is storagePath, DB column is storage_path
    });

    const candidate = pageRow?.storagePath || pageRow?.pageUrl || "";
    const objectPath = getObjectPathFromUrlOrPath(candidate, PAGES_BUCKET);

    if (!objectPath) {
      return NextResponse.json({ error: "Page image not available" }, { status: 404 });
    }

    // 3) Download image from Supabase Storage
    const dl = await downloadFromStorage(PAGES_BUCKET, objectPath);
    if (!dl.ok) {
      return NextResponse.json({ error: "Download failed", details: dl.error }, { status: 404 });
    }

    const contentType = inferContentTypeFromPath(objectPath);
    return new NextResponse(Buffer.from(dl.arrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (e: any) {
    console.error("Member page image route error:", e);
    return NextResponse.json(
      { error: "Internal server error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
