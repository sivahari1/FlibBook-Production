// app/api/viewer/[docId]/pages/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth"; // adjust if your NextAuth export differs
import { prisma } from "@/lib/db"; // adjust path
import { resolveViewerId } from "@/lib/viewer/resolveViewerId";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { docId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const raw = params.docId;
  console.log(`[Legacy Viewer API] Pages request for ID ${raw}`);

  // Use the resolver to handle both documentId and itemId
  const resolution = await resolveViewerId(raw);
  
  if (!resolution.success) {
    console.log(`[Legacy Viewer API] ID resolution failed: ${resolution.error}`);
    return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
  }

  const documentId = resolution.documentId!;
  console.log(`[Legacy Viewer API] Resolved ${raw} -> ${documentId} (from ${resolution.resolvedFrom})`);

  // TODO: enforce authorization for roles here (admin/platform/member) based on your schema.
  // For now: authenticated users only. Tighten as needed.

  const pages = await prisma.documentPage.findMany({
    where: { documentId },
    orderBy: { pageNumber: "asc" },
    select: { pageNumber: true },
  });

  if (!pages.length) {
    return NextResponse.json(
      { success: false, error: "Pages not generated", documentId },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    documentId,
    totalPages: pages.length,
    pages,
  });
}