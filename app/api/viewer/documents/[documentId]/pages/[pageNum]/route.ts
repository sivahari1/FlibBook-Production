import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { documentId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const documentId = params.documentId;

  // IMPORTANT:
  // Return ONLY the rows that actually exist in document_pages for this document.
  // Do NOT generate 1..N based on any “totalPages” from metadata/job.
  const rows = await prisma.documentPage.findMany({
    where: {
      documentId,
      // If you added storagePath column, keep only rows that have it.
      // If not, comment this out.
      storagePath: { not: null },
    },
    select: {
      pageNumber: true,
      // optional debug fields
      storagePath: true,
      pageUrl: true,
    },
    orderBy: { pageNumber: "asc" },
  });

  // If you suspect duplicates exist in DB, dedupe on the server too
  const seen = new Set<number>();
  const pages = rows
    .map((r) => ({ pageNumber: r.pageNumber }))
    .filter((p) => Number.isInteger(p.pageNumber) && p.pageNumber > 0)
    .filter((p) => {
      if (seen.has(p.pageNumber)) return false;
      seen.add(p.pageNumber);
      return true;
    });

  return NextResponse.json({
    success: true,
    documentId,
    totalPages: pages.length,
    pages,
  });
}
