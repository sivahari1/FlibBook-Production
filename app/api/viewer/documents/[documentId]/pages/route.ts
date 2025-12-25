import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await context.params;

  const pages = await prisma.documentPage.findMany({
    where: { documentId },
    orderBy: { pageNumber: "asc" },
    select: { pageNumber: true, pageUrl: true, format: true },
  });

  return NextResponse.json({ pages });
}
