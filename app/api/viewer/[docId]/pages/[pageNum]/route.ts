// app/api/viewer/[docId]/pages/[pageNum]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth"; // adjust import
import { prisma } from "@/lib/db"; // adjust
import { downloadFile, inferContentTypeFromPath } from "@/lib/storage";
import { resolveViewerId } from "@/lib/viewer/resolveViewerId";

export const runtime = "nodejs";

const PAGES_BUCKET = process.env.SUPABASE_PAGES_BUCKET || "document-pages";

export async function GET(
  _req: Request,
  { params }: { params: { docId: string; pageNum: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const raw = params.docId;
  const pageNumber = Number(params.pageNum);
  
  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    return NextResponse.json({ success: false, error: "Invalid page number" }, { status: 400 });
  }

  console.log(`[Legacy Viewer API] Page ${pageNumber} request for ID ${raw}`);

  // Use the resolver to handle both documentId and itemId
  const resolution = await resolveViewerId(raw);
  
  if (!resolution.success) {
    console.log(`[Legacy Viewer API] ID resolution failed: ${resolution.error}`);
    return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
  }

  const documentId = resolution.documentId!;
  console.log(`[Legacy Viewer API] Resolved ${raw} -> ${documentId} (from ${resolution.resolvedFrom})`);

  // Fetch page storage path from DB
  const pageRow = await prisma.documentPage.findFirst({
    where: { documentId, pageNumber },
    select: { pageUrl: true }, // Using pageUrl instead of imageStoragePath
  });

  if (!pageRow?.pageUrl) {
    return NextResponse.json(
      { success: false, error: "Page image not available", message: "No DB page record" },
      { status: 404 }
    );
  }

  const storagePath = pageRow.pageUrl;

  // Extract storage path from full URL if needed
  let actualStoragePath = storagePath;
  if (storagePath.includes('/storage/v1/object/')) {
    // Extract path from full Supabase URL
    const urlParts = storagePath.split('/storage/v1/object/public/' + PAGES_BUCKET + '/');
    if (urlParts.length > 1) {
      actualStoragePath = urlParts[1];
    }
  }

  // Download from Supabase Storage (private bucket safe)
  const res = await downloadFile(actualStoragePath, PAGES_BUCKET);
  if (!res.data) {
    return NextResponse.json(
      { success: false, error: "Page image not available", message: "Failed to retrieve page image from storage" },
      { status: 404 }
    );
  }

  const contentType = inferContentTypeFromPath(actualStoragePath);
  const arrayBuffer = await res.data.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}