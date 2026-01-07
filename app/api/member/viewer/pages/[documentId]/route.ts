import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canViewDocument } from '@/lib/authz/canViewDocument';
import { prisma } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = params;
    const { searchParams } = new URL(request.url);

    const from = Number.parseInt(searchParams.get('from') || '1', 10);
    const to = Number.parseInt(searchParams.get('to') || '20', 10);

    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from) {
      return NextResponse.json({ error: 'Invalid pagination parameters.' }, { status: 400 });
    }

    const pageCount = to - from + 1;
    if (pageCount > 50) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters. Max 50 pages per request.' },
        { status: 400 }
      );
    }

    const authResult = await canViewDocument(session, documentId);
    if (!authResult.allowed) {
      return NextResponse.json(
        { error: authResult.reason || 'Access denied' },
        { status: 403 }
      );
    }

    const document = authResult.document!;

    const dbPages = await prisma.documentPage.findMany({
      where: {
        documentId,
        pageNumber: { gte: from, lte: to },
      },
      orderBy: { pageNumber: 'asc' },
      select: {
        pageNumber: true,
        storagePath: true,
      },
    });

    const totalPages = await prisma.documentPage.count({ where: { documentId } });

    if (totalPages === 0) {
      return NextResponse.json(
        {
          documentId,
          title: document.title,
          totalPages: 0,
          pages: [],
          status: 'no_pages',
          message: 'Pages not available yet. Please try later.',
        },
        {
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    // NOTE: Use a longer expiry for reading stability
    const SIGNED_URL_TTL_SECONDS = 3600; // 60 minutes

    const pages = await Promise.all(
      dbPages.map(async (page) => {
        const storagePath = page.storagePath;

        if (!storagePath) {
          // Do NOT leak public URLs; return null so client can retry / show error.
          return { pageNo: page.pageNumber, url: null as string | null };
        }

        const { data, error } = await supabase.storage
          .from('document-pages')
          .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

        if (error || !data?.signedUrl) {
          console.error(`Signed URL error for page ${page.pageNumber}`, error);
          return { pageNo: page.pageNumber, url: null as string | null };
        }

        return { pageNo: page.pageNumber, url: data.signedUrl };
      })
    );

    return NextResponse.json(
      {
        documentId,
        title: document.title,
        totalPages,
        pages,
        status: 'success',
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('Error in flipbook pages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
