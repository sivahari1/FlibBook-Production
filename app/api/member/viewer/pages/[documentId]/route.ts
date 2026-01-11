import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canViewDocument } from "@/lib/authz/canViewDocument";
import { prisma } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";
import { ensureDocumentPages } from "@/lib/server/conversion/ensureDocumentPages-emergency";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type Ctx = { params: Promise<{ documentId: string }> };

function parseIntSafe(v: string | null, fallback: number) {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Next.js 15: await params
    const { documentId } = await params;

    const { searchParams } = new URL(req.url);
    const from = parseIntSafe(searchParams.get("from"), 1);
    const to = parseIntSafe(searchParams.get("to"), 20);

    if (from < 1 || to < from || to - from > 50) {
      return NextResponse.json(
        { error: "Invalid pagination parameters. Max 50 pages per request." },
        { status: 400 }
      );
    }

    // ✅ Access check
    const authResult = await canViewDocument(session as any, documentId);
    if (!authResult.allowed) {
      return NextResponse.json(
        { error: authResult.reason || "Access denied" },
        { status: 403 }
      );
    }

    // ✅ Ensure pages exist / conversion runs
    const ensureResult = await ensureDocumentPages(documentId);

    const doc = await prisma.document.findFirst({
      where: { id: documentId },
      select: { id: true, title: true },
    });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    if (ensureResult.status === "PROCESSING") {
      return NextResponse.json({
        documentId,
        title: doc.title,
        totalPages: 0,
        pages: [],
        status: "no_pages",
        conversionStatus: "PROCESSING",
        message: "Pages are being generated. Please refresh shortly.",
      });
    }

    if (ensureResult.status === "FAILED") {
      return NextResponse.json({
        documentId,
        title: doc.title,
        totalPages: 0,
        pages: [],
        status: "no_pages",
        conversionStatus: "FAILED",
        message: "Conversion failed. Please contact administrator.",
        error: ensureResult.message || "Unknown conversion error",
      });
    }

    // READY: fetch pages
    const dbPages = await prisma.documentPage.findMany({
      where: { documentId, pageNumber: { gte: from, lte: to } },
      orderBy: { pageNumber: "asc" },
      select: {
        pageNumber: true,
        storageBucket: true,
        storagePath: true,
        pageUrl: true,
      },
    });

    const pages = await Promise.all(
      dbPages.map(async (p) => {
        const bucket = (p.storageBucket || process.env.SUPABASE_PAGES_BUCKET || "document-pages").trim();
        const path = (p.storagePath || "").trim();

        if (path) {
          const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
          if (!error && data?.signedUrl) return { pageNo: p.pageNumber, url: data.signedUrl };
        }

        return { pageNo: p.pageNumber, url: p.pageUrl || "" };
      })
    );

    return NextResponse.json({
      documentId,
      title: doc.title,
      totalPages: ensureResult.pageCount,
      pages,
      status: "success",
      conversionStatus: "READY",
    });
  } catch (e) {
    console.error("[member/viewer/pages] ERROR:", e);
    return NextResponse.json(
      { error: "Internal server error", message: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
