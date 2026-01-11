import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDocumentPages } from "@/lib/server/conversion/ensureDocumentPages";
import { ConversionStatus } from "@prisma/client";

export async function POST(
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

    // Verify document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, title: true, contentType: true }
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    console.log(`[admin/rebuild-pages] Starting rebuild for document ${documentId} by admin ${session.user.email}`);

    // Delete existing pages and reset conversion status
    await prisma.$transaction(async (tx) => {
      // Delete all existing pages
      await tx.documentPage.deleteMany({
        where: { documentId }
      });

      // Reset document conversion status
      await tx.document.update({
        where: { id: documentId },
        data: {
          conversionStatus: ConversionStatus.PENDING,
          conversionError: null,
          pageCount: null,
          convertedAt: null,
          pagesUpdatedAt: null
        }
      });
    });

    console.log(`[admin/rebuild-pages] Cleared existing pages and reset status for ${documentId}`);

    // Trigger conversion
    const result = await ensureDocumentPages(documentId);

    console.log(`[admin/rebuild-pages] Conversion result for ${documentId}:`, result);

    return NextResponse.json({
      success: true,
      documentId,
      documentTitle: document.title,
      result,
      message: `Rebuild ${result.status.toLowerCase()} for document "${document.title}"`
    });

  } catch (error) {
    console.error("Error in admin rebuild pages API:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}