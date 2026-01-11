import "server-only";
import { prisma } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

export type EnsureResult =
  | { status: "READY"; pageCount: number }
  | { status: "PROCESSING"; message?: string }
  | { status: "FAILED"; message: string };

function truncate(s: string, max = 3800) {
  if (!s) return s;
  return s.length > max ? s.slice(0, max) + "…(truncated)" : s;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role (server only)
  { auth: { persistSession: false } }
);

function normalizePdfBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

export async function ensureDocumentPages(documentId: string): Promise<EnsureResult> {
  const PDF_BUCKET = process.env.SUPABASE_PDF_BUCKET || "documents";
  const PAGES_BUCKET = process.env.SUPABASE_PAGES_BUCKET || "document-pages";
  const PAGE_TTL_DAYS = Number(process.env.DOC_PAGE_TTL_DAYS || "30");
  const expiresAt = new Date(Date.now() + PAGE_TTL_DAYS * 24 * 60 * 60 * 1000);

  try {
    // 0) If pages already exist, heal and return READY
    const existingCount = await prisma.documentPage.count({ where: { documentId } });
    if (existingCount > 0) {
      await prisma.document.updateMany({
        where: { id: documentId },
        data: {
          conversionStatus: "READY",
          pageCount: existingCount,
          convertedAt: new Date(),
          conversionError: null,
        },
      });
      return { status: "READY", pageCount: existingCount };
    }

    // 1) Fetch document using ONLY fields that exist in YOUR schema
    const doc = await prisma.document.findFirst({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        filename: true,
        mimeType: true,
        storagePath: true, // ✅ exists in schema
        conversionStatus: true,
      },
    });

    if (!doc) return { status: "FAILED", message: `Document not found: ${documentId}` };

    if (doc.conversionStatus === "PROCESSING") {
      return { status: "PROCESSING", message: "Conversion already in progress." };
    }

    // 2) Mark PROCESSING
    await prisma.document.updateMany({
      where: { id: documentId },
      data: { conversionStatus: "PROCESSING", conversionError: null },
    });

    // 3) Validate PDF storagePath exists
    if (!doc.storagePath) {
      throw new Error(`Missing PDF storagePath on documents row. id=${documentId}`);
    }

    // 4) Download PDF bytes from Supabase Storage
    const dl = await supabase.storage.from(PDF_BUCKET).download(doc.storagePath);
    if (dl.error || !dl.data) {
      throw new Error(
        `Supabase download failed bucket=${PDF_BUCKET} path=${doc.storagePath}: ${dl.error?.message || "no data"}`
      );
    }
    const pdfBytes = normalizePdfBytes(await dl.data.arrayBuffer());

    // 5) Render PDF -> images using pdfjs + napi canvas + sharp (SERVER ONLY)
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { createCanvas } = await import("@napi-rs/canvas");
    const sharp = (await import("sharp")).default;

    const loadingTask = (pdfjs as any).getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;

    const numPages: number = pdf.numPages;
    if (!Number.isFinite(numPages) || numPages < 1) {
      throw new Error("PDF has no pages or failed to parse numPages.");
    }

    // Safety: clear stale page rows
    await prisma.documentPage.deleteMany({ where: { documentId } });

    const pageRows: Array<{
      documentId: string;
      pageNumber: number;
      storageBucket: string;
      storagePath: string;
      pageUrl: string;
      expiresAt: Date;
      fileSize: number;
      format: string;
    }> = [];

    for (let pageNo = 1; pageNo <= numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);

      const scale = 1.5; // quality
      const viewport = page.getViewport({ scale });

      const width = Math.ceil(viewport.width);
      const height = Math.ceil(viewport.height);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      await page.render({ canvasContext: ctx as any, viewport }).promise;

      const pngBuffer = canvas.toBuffer("image/png");
      const webpBuffer = await sharp(pngBuffer).webp({ quality: 82 }).toBuffer();

      const storagePath = `${documentId}/page-${String(pageNo).padStart(4, "0")}.webp`;

      const up = await supabase.storage.from(PAGES_BUCKET).upload(storagePath, webpBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

      if (up.error) {
        throw new Error(
          `Upload failed for page ${pageNo} => ${PAGES_BUCKET}/${storagePath}: ${up.error.message}`
        );
      }

      // pageUrl is REQUIRED in your schema → store public URL
      const { data: pub } = supabase.storage.from(PAGES_BUCKET).getPublicUrl(storagePath);
      const pageUrl = pub?.publicUrl || "";

      pageRows.push({
        documentId,
        pageNumber: pageNo,
        storageBucket: PAGES_BUCKET,
        storagePath,
        pageUrl,
        expiresAt,
        fileSize: webpBuffer.length,
        format: "webp",
      });
    }

    // 6) Insert rows (pageUrl + expiresAt are required)
    await prisma.documentPage.createMany({
      data: pageRows,
      skipDuplicates: true,
    });

    // 7) Mark READY
    await prisma.document.updateMany({
      where: { id: documentId },
      data: {
        conversionStatus: "READY",
        pageCount: numPages,
        convertedAt: new Date(),
        pagesUpdatedAt: new Date(),
        conversionError: null,
      },
    });

    return { status: "READY", pageCount: numPages };
  } catch (e) {
    const message = e instanceof Error ? `${e.message}\n${e.stack || ""}` : String(e);

    await prisma.document.updateMany({
      where: { id: documentId },
      data: {
        conversionStatus: "FAILED",
        conversionError: truncate(message),
      },
    });

    return { status: "FAILED", message: truncate(message) };
  }
}
