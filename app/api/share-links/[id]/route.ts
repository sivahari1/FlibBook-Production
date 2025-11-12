import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * PATCH /api/share-links/[id]
 * Deactivate a share link
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: shareLinkId } = await params;

    // Fetch share link to verify ownership
    const shareLink = await prisma.shareLink.findUnique({
      where: { id: shareLinkId },
      include: {
        document: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Verify ownership through document
    if (shareLink.document.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this share link' },
        { status: 403 }
      );
    }

    // Deactivate the share link
    const updatedShareLink = await prisma.shareLink.update({
      where: { id: shareLinkId },
      data: { isActive: false },
    });

    logger.info('Share link deactivated', {
      userId: session.user.id,
      shareLinkId,
      shareKey: shareLink.shareKey
    });

    return NextResponse.json({
      id: updatedShareLink.id,
      isActive: updatedShareLink.isActive,
      message: 'Share link deactivated successfully',
    });
  } catch (error) {
    logger.error('Error deactivating share link', error);
    return NextResponse.json(
      { error: 'Failed to deactivate share link' },
      { status: 500 }
    );
  }
}
