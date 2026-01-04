import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSignedUrl } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = params;
    
    // Get document with related data
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        bookShopItems: {
          include: {
            myJstudyroomItems: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Access control logic
    const userRole = session.user.userRole;
    const isAdmin = userRole === 'ADMIN' || session.user.additionalRoles?.includes('ADMIN');
    
    let hasAccess = false;
    
    if (isAdmin) {
      // ADMIN: Can preview ANY document (published or not)
      hasAccess = true;
    } else if (userRole === 'MEMBER') {
      // MEMBER: Can access ONLY documents added to MyJstudyRoom
      const hasInMyJstudyroom = document.bookShopItems.some(item => 
        item.myJstudyroomItems.length > 0
      );
      hasAccess = hasInMyJstudyroom;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate response based on content type
    const contentType = document.contentType;

    if (contentType === 'PDF') {
      // Generate signed URL for PDF
      const result = await generateSignedUrl('documents', document.storagePath, 3600);
      
      if (!result.ok) {
        return NextResponse.json({ error: "Failed to generate access URL" }, { status: 500 });
      }

      return NextResponse.json({
        type: "PDF",
        url: result.signedUrl
      });
    }
    
    if (contentType === 'EPUB') {
      // Generate signed URL for EPUB
      const result = await generateSignedUrl('documents', document.storagePath, 3600);
      
      if (!result.ok) {
        return NextResponse.json({ error: "Failed to generate access URL" }, { status: 500 });
      }

      return NextResponse.json({
        type: "EPUB",
        url: result.signedUrl
      });
    }
    
    if (contentType === 'LINK') {
      // Return the link URL directly
      if (!document.linkUrl) {
        return NextResponse.json({ error: "Link URL not found" }, { status: 404 });
      }

      return NextResponse.json({
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