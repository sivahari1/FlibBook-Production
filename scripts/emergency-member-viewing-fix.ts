#!/usr/bin/env tsx

/**
 * Emergency fix for member document viewing - works without migration
 * Run with: npx tsx scripts/emergency-member-viewing-fix.ts
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function emergencyFix() {
  console.log('🚨 Emergency Fix for Member Document Viewing');
  console.log('==========================================\n');

  try {
    // Create a temporary API route that doesn't use conversionStatus
    const tempApiContent = `import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canViewDocument } from "@/lib/authz/canViewDocument";
import { prisma } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const { searchParams } = new URL(request.url);
    const from = Number.parseInt(searchParams.get("from") || "1", 10);
    const to = Number.parseInt(searchParams.get("to") || "20", 10);

    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from || to - from > 50) {
      return NextResponse.json(
        { error: "Invalid pagination parameters. Max 50 pages per request." },
        { status: 400 }
      );
    }

    // Validate document exists and user has access
    const authResult = await canViewDocument(session, documentId);
    if (!authResult.allowed) {
      return NextResponse.json(
        { error: authResult.reason || "Access denied" },
        { status: 403 }
      );
    }

    const doc = authResult.document!;

    // Get pages without checking conversion status (emergency mode)
    const dbPages = await prisma.documentPage.findMany({
      where: {
        documentId,
        pageNumber: { gte: from, lte: to },
      },
      orderBy: { pageNumber: "asc" },
      select: {
        pageNumber: true,
        storagePath: true,
        pageUrl: true,
      },
    });

    if (!dbPages.length) {
      return NextResponse.json({
        documentId,
        title: doc.title,
        totalPages: 0,
        pages: [],
        status: 'no_pages',
        message: 'No pages found. Document may need conversion.',
      });
    }

    const pages = await Promise.all(
      dbPages.map(async (p) => {
        let storagePath = p.storagePath?.trim();

        // If missing, try extracting from pageUrl
        if (!storagePath && p.pageUrl) {
          const m = p.pageUrl.match(/\\/storage\\/v1\\/object\\/public\\/document-pages\\/(.+)$/);
          if (m?.[1]) storagePath = m[1];
        }

        // Fallback path
        if (!storagePath) {
          storagePath = \`\${doc.userId}/\${documentId}/page-\${p.pageNumber}.jpg\`;
        }

        const { data, error } = await supabase.storage
          .from("document-pages")
          .createSignedUrl(storagePath, 600);

        if (error || !data?.signedUrl) {
          const { data: pub } = supabase.storage.from("document-pages").getPublicUrl(storagePath);
          return { pageNo: p.pageNumber, url: pub.publicUrl };
        }

        return { pageNo: p.pageNumber, url: data.signedUrl };
      })
    );

    const totalPages = await prisma.documentPage.count({ where: { documentId } });

    return NextResponse.json({
      documentId,
      title: doc.title,
      totalPages,
      pages,
      status: 'success',
    });
  } catch (err) {
    console.error("Error in member flipbook pages API:", err);
    return NextResponse.json({ 
      error: "Internal server error",
      message: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}`;

    // Write the temporary API file
    const apiPath = join(process.cwd(), 'app/api/member/viewer/pages/[documentId]/route.temp.ts');
    await writeFile(apiPath, tempApiContent);
    console.log('✅ Created temporary API route (without conversionStatus dependency)');

    // Create a temporary resolver that handles missing fields gracefully
    const tempResolverContent = `import { prisma } from '@/lib/db';

export interface DocumentIdResolution {
  documentId: string;
  source: 'document' | 'bookShopItem' | 'myJstudyroomItem';
}

export async function resolveDocumentId(id: string): Promise<DocumentIdResolution> {
  if (!id || typeof id !== 'string') {
    throw new Error('Document not found');
  }

  try {
    // First, check if it's a direct document ID
    const document = await prisma.document.findUnique({
      where: { id },
      select: { id: true }
    });

    if (document) {
      return {
        documentId: document.id,
        source: 'document'
      };
    }

    // Second, check if it's a BookShopItem ID
    const bookShopItem = await prisma.bookShopItem.findUnique({
      where: { id },
      select: { documentId: true }
    });

    if (bookShopItem) {
      return {
        documentId: bookShopItem.documentId,
        source: 'bookShopItem'
      };
    }

    // Third, check if it's a MyJstudyroomItem ID
    const myJstudyroomItem = await prisma.myJstudyroomItem.findUnique({
      where: { id },
      include: {
        bookShopItem: {
          select: { documentId: true }
        }
      }
    });

    if (myJstudyroomItem) {
      return {
        documentId: myJstudyroomItem.bookShopItem.documentId,
        source: 'myJstudyroomItem'
      };
    }

    throw new Error('Document not found');
  } catch (error) {
    console.error('Error in resolveDocumentId:', error);
    throw new Error('Document not found');
  }
}`;

    const resolverPath = join(process.cwd(), 'lib/server/resolveDocumentId.temp.ts');
    await writeFile(resolverPath, tempResolverContent);
    console.log('✅ Created temporary resolver (with error handling)');

    console.log('\n🔧 Emergency Fix Applied!');
    console.log('\nTo use the emergency fix:');
    console.log('1. Rename route.temp.ts to route.ts in app/api/member/viewer/pages/[documentId]/');
    console.log('2. Rename resolveDocumentId.temp.ts to resolveDocumentId.ts in lib/server/');
    console.log('3. Refresh your browser');
    console.log('\nThis will bypass the conversionStatus field until you can run the migration.');

  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
  }
}

async function main() {
  await emergencyFix();
}

if (require.main === module) {
  main();
}