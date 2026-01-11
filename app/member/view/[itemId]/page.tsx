import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { resolveDocumentId } from '@/lib/server/resolveDocumentId';
import { MyJstudyroomViewerClient } from '@/app/member/view/[itemId]/MyJstudyroomViewerClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MemberViewPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { itemId } = await params;

  if (!session?.user) redirect('/login');

  // Allow MEMBER or ADMIN role (admins can test member features)
  if (session.user.userRole !== 'MEMBER' && session.user.userRole !== 'ADMIN') {
    redirect('/dashboard');
  }

  try {
    // Resolve the itemId to a documentId
    const resolution = await resolveDocumentId(itemId);
    const documentId = resolution.documentId;

    // Get the document with necessary details
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        filename: true,
        contentType: true,
        storagePath: true,
        linkUrl: true,
        thumbnailUrl: true,
        metadata: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        // conversionStatus: true, // Commented out until migration
        // pageCount: true, // Commented out until migration
      },
    });

    if (!document) {
      redirect('/member/my-jstudyroom');
    }

    // For members, verify they have access to this document
    if (session.user.userRole === 'MEMBER') {
      // Check if document is in their study room
      const hasAccess = await prisma.myJstudyroomItem.findFirst({
        where: {
          userId: session.user.id,
          bookShopItem: {
            documentId: documentId
          }
        },
        include: {
          bookShopItem: {
            select: {
              title: true
            }
          }
        }
      });

      if (!hasAccess) {
        redirect('/member/my-jstudyroom');
      }

      return (
        <MyJstudyroomViewerClient
          document={document}
          bookShopTitle={hasAccess.bookShopItem.title}
          memberName={session.user.name || session.user.email}
          originalItemId={itemId}
          resolvedDocumentId={documentId}
        />
      );
    }

    // Admin access - no additional checks needed
    return (
      <MyJstudyroomViewerClient
        document={document}
        bookShopTitle="Admin Access"
        memberName={session.user.name || session.user.email}
        originalItemId={itemId}
        resolvedDocumentId={documentId}
      />
    );

  } catch (error) {
    console.error('Error resolving document ID:', error);
    redirect('/member/my-jstudyroom');
  }
}
