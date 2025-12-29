import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Your Supabase bucket that stores the ORIGINAL PDFs
const PDF_BUCKET = process.env.SUPABASE_PDF_BUCKET || "documents";

function toObjectPath(maybeUrlOrPath: string, bucket: string): string | null {
  if (!maybeUrlOrPath) return null;

  // Already an object path
  if (!maybeUrlOrPath.startsWith("http")) {
    return maybeUrlOrPath.replace(/^\/+/, "");
  }

  // Supabase storage URL -> extract path after bucket
  try {
    const url = new URL(maybeUrlOrPath);

    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/${bucket}/`,
      `/storage/v1/object/authenticated/${bucket}/`,
    ];

    for (const marker of markers) {
      const idx = url.pathname.indexOf(marker);
      if (idx !== -1) return decodeURIComponent(url.pathname.slice(idx + marker.length));
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    // ✅ Recommend sending itemId from client for access control
    const itemId = body?.itemId as string | undefined;
    const query = (body?.query as string | undefined)?.trim();

    if (!itemId || !query) {
      return NextResponse.json({ error: "itemId and query are required" }, { status: 400 });
    }

    // 1) Verify member owns this item, and resolve documentId safely
    const myItem = await prisma.myJstudyroomItem.findFirst({
      where: { id: itemId, userId: session.user.id },
      include: { bookShopItem: { include: { document: true } } },
    });

    const document = myItem?.bookShopItem?.document;
    if (!document?.id) {
      return NextResponse.json({ error: "Not found or access denied" }, { status: 403 });
    }

    // 2) Determine PDF object path
    const candidate = document.storagePath || document.linkUrl || "";
    const objectPath = toObjectPath(candidate, PDF_BUCKET);

    if (!objectPath) {
      console.error("PDF search: cannot derive object path", {
        itemId,
        documentId: document.id,
        candidate,
        bucket: PDF_BUCKET,
      });
      return NextResponse.json({ error: "PDF path not available for this document" }, { status: 404 });
    }

    // 3) Download PDF
    const { data, error } = await supabaseServer.storage.from(PDF_BUCKET).download(objectPath);

    if (error || !data) {
      console.error("PDF search: download failed", { error, bucket: PDF_BUCKET, objectPath });
      return NextResponse.json({ error: "Failed to download PDF" }, { status: 404 });
    }

    const pdfBuf = Buffer.from(await data.arrayBuffer());

    // 4) Extract text (✅ dynamic import avoids CJS export issues on Vercel)
    let text = "";
    try {
      const mod: any = await import("pdf-parse");
      const pdfParse = mod?.default ?? mod; // works for both CJS/ESM shapes
      const parsed = await pdfParse(pdfBuf);
      text = parsed?.text || "";
    } catch (parseErr: any) {
      console.error("PDF search: pdf-parse failed", {
        documentId: document.id,
        objectPath,
        message: parseErr?.message,
      });

      return NextResponse.json(
        {
          error: "Text extraction failed (PDF may be scanned/image-only)",
          details: String(parseErr?.message || parseErr),
        },
        { status: 422 }
      );
    }

    // 5) Search (baseline: line matches)
    const qLower = query.toLowerCase();
    const lines = text.split(/\r?\n/);

    const items: Array<{ index: number; snippet: string }> = [];
    let matches = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = (lines[i] || "").trim();
      if (!line) continue;

      if (line.toLowerCase().includes(qLower)) {
        matches++;
        if (items.length < 25) items.push({ index: i + 1, snippet: line.slice(0, 240) });
      }
    }

    return NextResponse.json({ matches, items });
  } catch (e: any) {
    console.error("PDF search route error:", e);
    return NextResponse.json(
      { error: "Internal server error", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
