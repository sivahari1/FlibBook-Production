import "server-only";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export async function convertPdfToPageImagesWebp(pdfBytes: Uint8Array) {
  // Dynamic imports: keep native/big deps off bundle analysis paths
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = await import("@napi-rs/canvas");

  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;

  const out: Array<{ pageNo: number; webp: Buffer }> = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");

    await page.render({ canvasContext: ctx as any, viewport }).promise;

    const pngBuffer = canvas.toBuffer("image/png");
    const webpBuffer = await sharp(pngBuffer).webp({ quality: 82 }).toBuffer();
    out.push({ pageNo, webp: webpBuffer });
  }

  return out;
}
