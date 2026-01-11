import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  context: { params: { documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Admin guard
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.userRole === "ADMIN" || 
                   session.user.additionalRoles?.includes("ADMIN");

    if (!isAdmin) {
      // Check if user is in admin allowlist from env
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
      if (!adminEmails.includes(session.user.email)) {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      }
    }

    const documentId = context.params.documentId;

    // Get document with conversion info
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        conversionStatus: true,
        conversionError: true,
        pageCount: true,
        convertedAt: true,
        pagesUpdatedAt: true,
        updatedAt: true,
        contentType: true,
        fileSize: true,
      }
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Count actual pages in database
    const pageCount = await prisma.documentPage.count({
      where: { documentId }
    });

    // Get sample storage paths
    const samplePages = await prisma.documentPage.findMany({
      where: { documentId },
      select: { pageNumber: true, storagePath: true },
      orderBy: { pageNumber: 'asc' },
      take: 3
    });

    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
        conversionStatus: document.conversionStatus,
        conversionError: document.conversionError,
        pageCount: document.pageCount,
        convertedAt: document.convertedAt,
        pagesUpdatedAt: document.pagesUpdatedAt,
        updatedAt: document.updatedAt,
        contentType: document.contentType,
        fileSize: document.fileSize,
      },
      counts: {
        actualPageCount: pageCount,
        recordedPageCount: document.pageCount,
        mismatch: pageCount !== (document.pageCount || 0)
      },
      samplePages: samplePages.map(p => ({
        pageNumber: p.pageNumber,
        storagePath: p.storagePath
      }))
    });

  } catch (error) {
    console.error("Error in admin conversion status API:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}