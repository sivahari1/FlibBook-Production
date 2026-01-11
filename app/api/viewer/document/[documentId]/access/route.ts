import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSignedUrl } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: { documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = context.params.documentId;

    // Validate document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        bookShopItems: {
          include: {
            myJstudyroomItems: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const userRole = session.user.userRole;
    const isAdmin =
      userRole === "ADMIN" || session.user.additionalRoles?.includes("ADMIN");

    let hasAccess = false;

    if (isAdmin) {
      hasAccess = true;
    } else if (userRole === "MEMBER") {
      const hasInMyJstudyroom = document.bookShopItems.some(
        (item) => item.myJstudyroomItems.length > 0
      );
      hasAccess = hasInMyJstudyroom;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const contentType = document.contentType;

    // For MEMBER role: always return FLIPBOOK viewerType and do NOT include PDF url
    if (!isAdmin && userRole === "MEMBER") {
      return NextResponse.json({ 
        viewerType: "FLIPBOOK",
        documentId: document.id,
        conversionStatus: document.conversionStatus,
        pageCount: document.pageCount,
        type: contentType,
        url: "" // Never expose PDF URL to members
      });
    }

    // ADMIN behavior - can still get signed URL if needed
    if (contentType === "PDF" || contentType === "EPUB") {
      const result = await generateSignedUrl("documents", document.storagePath, 3600);
      if (!result.ok) {
        return NextResponse.json({ error: "Failed to generate access URL" }, { status: 500 });
      }
      return NextResponse.json({ 
        viewerType: isAdmin ? "DIRECT" : "FLIPBOOK",
        documentId: document.id,
        conversionStatus: document.conversionStatus,
        pageCount: document.pageCount,
        type: contentType, 
        url: result.signedUrl 
      });
    }

    if (contentType === "LINK") {
      if (!document.linkUrl) {
        return NextResponse.json({ error: "Link URL not found" }, { status: 404 });
      }
      return NextResponse.json({ 
        viewerType: "LINK",
        documentId: document.id,
        conversionStatus: document.conversionStatus,
        pageCount: document.pageCount,
        type: "LINK", 
        url: document.linkUrl 
      });
    }

    return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
  } catch (error) {
    console.error("Error in viewer access API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
