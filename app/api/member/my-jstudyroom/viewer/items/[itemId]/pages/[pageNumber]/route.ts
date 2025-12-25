import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { itemId: string; pageNumber: string } }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate parameters
    const { itemId, pageNumber } = params;
    if (!itemId || !pageNumber) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const pageNum = parseInt(pageNumber, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return NextResponse.json(
        { error: "Invalid page number" },
        { status: 400 }
      );
    }

    // Find MyJstudyroom item that belongs to this user
    const myJstudyroomItem = await prisma.myJstudyroomItem.findFirst({
      where: {
        id: itemId,
        userId: session.user.id,
      },
      select: {
        bookShopItem: {
          select: {
            documentId: true,
          },
        },
      },
    });

    if (!myJstudyroomItem) {
      return NextResponse.json(
        { error: "Document not found or access denied" },
        { status: 404 }
      );
    }

    const documentId = myJstudyroomItem.bookShopItem.documentId;

    // Fetch the corresponding page record
    const documentPage = await prisma.documentPage.findFirst({
      where: {
        documentId: documentId,
        pageNumber: pageNum,
      },
      select: {
        pageNumber: true,
        pageUrl: true,
        fileSize: true,
      },
    });

    if (!documentPage) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    // Return page information
    return NextResponse.json({
      pageNumber: documentPage.pageNumber,
      imageUrl: documentPage.pageUrl,
      mimeType: "image/jpeg", // Default for document pages
      fileSize: documentPage.fileSize,
    });

  } catch (error) {
    console.error("Error in member pages API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}