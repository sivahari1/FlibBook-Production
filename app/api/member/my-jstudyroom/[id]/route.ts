import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { removeDocumentFromMyJstudyroom } from '@/lib/my-jstudyroom';
import { prisma } from '@/lib/db';

/**
 * DELETE /api/member/my-jstudyroom/[id]
 * Return (remove) a document from My jstudyroom
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify MEMBER or ADMIN role (admins can test member features)
    if (session.user.userRole !== 'MEMBER' && session.user.userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Member access only' },
        { status: 403 }
      );
    }

    const { id: itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Remove document from My jstudyroom
    const result = await removeDocumentFromMyJstudyroom(
      session.user.id,
      itemId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Fetch updated counts
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        freeDocumentCount: true,
        paidDocumentCount: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Document returned from My jstudyroom',
      counts: {
        free: user?.freeDocumentCount || 0,
        paid: user?.paidDocumentCount || 0,
        total: (user?.freeDocumentCount || 0) + (user?.paidDocumentCount || 0),
      },
    });
  } catch (error: unknown) {
    console.error('Error removing document from My jstudyroom:', error);
    return NextResponse.json(
      { error: 'Failed to remove document from My jstudyroom' },
      { status: 500 }
    );
  }
}
