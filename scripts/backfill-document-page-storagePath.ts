import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function extractStoragePath(pageUrl: string): string | null {
  if (!pageUrl) return null;

  // Already relative path
  if (!pageUrl.startsWith("http")) return pageUrl.replace(/^\/+/, "");

  try {
    const url = new URL(pageUrl);

    const markers = [
      "/storage/v1/object/public/document-pages/",
      "/storage/v1/object/sign/document-pages/",
      "/storage/v1/object/document-pages/",
      "/storage/v1/object/authenticated/document-pages/",
    ];

    for (const marker of markers) {
      const idx = url.pathname.indexOf(marker);
      if (idx !== -1) {
        return decodeURIComponent(url.pathname.slice(idx + marker.length));
      }
    }

    // last-resort
    const alt = url.pathname.split("/document-pages/")[1];
    return alt ? decodeURIComponent(alt) : null;
  } catch {
    return null;
  }
}

async function main() {
  const pages = await prisma.documentPage.findMany({
    select: { id: true, pageUrl: true, storagePath: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const p of pages) {
    if (p.storagePath && p.storagePath.trim().length > 0) {
      skipped++;
      continue;
    }

    const sp = extractStoragePath(p.pageUrl);
    if (!sp) {
      skipped++;
      continue;
    }

    await prisma.documentPage.update({
      where: { id: p.id },
      data: { storagePath: sp },
    });

    updated++;
  }

  console.log(`Backfill complete. Updated: ${updated}, skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
