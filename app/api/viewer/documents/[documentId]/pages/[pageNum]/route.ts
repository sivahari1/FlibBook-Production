import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { supabaseServer, inferContentTypeFromPath } from "@/lib/supabase/server"; // see below

export const runtime = "nodejs";

const PAGES_BUCKET = process.env.SUPABASE_PAGES_BUCKET || "document-pages";

export async function GET(
  _req: Request,
  { params }: { params: { documentId: string; pageNum: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const documentId = params.documentId;
  const pageNumber = Number(params.pageNum);

  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    return NextResponse.json({ success: false, error: "Invalid page number" }, { status: 400 });
  }

  // IMPORTANT: query by documentId + pageNumber (not skip/take)
  const row = await prisma.documentPage.findFirst({
    where: { documentId, pageNumber },
    select: { imageStoragePath: true }, // rename to your field
  });

  if (!row?.imageStoragePath) {
    return NextResponse.json(
      { success: false, error: "Page image not available", message: "No DB page record" },
      { status: 404 }
    );
  }

  const { data, error } = await supabaseServer.storage
    .from(PAGES_BUCKET)
    .download(row.imageStoragePath);

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: "Page image not available", message: "Failed to retrieve page image from storage" },
      { status: 404 }
    );
  }

  const buf = await data.arrayBuffer();
  const contentType = inferContentTypeFromPath(row.imageStoragePath);

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
