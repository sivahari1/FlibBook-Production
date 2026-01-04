import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { MyJstudyroomViewerClient } from '@/app/member/view/[itemId]/MyJstudyroomViewerClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MyJstudyroomViewerPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { itemId } = await params;

  if (!session?.user) {
    redirect('/login');
  }

  // Allow MEMBER or ADMIN role (admins can test member features)
  if (session.user.userRole !== 'MEMBER' && session.user.userRole !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Verify the item belongs to the user
  const item = await prisma.myJstudyroomItem.findUnique({
    where: { id: itemId },
    include: {
      bookShopItem: {
        include: {
          document: {
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
            },
          },
        },
      },
    },
  });

  if (!item) {
    redirect('/member/my-jstudyroom');
  }

  if (item.userId !== session.user.id) {
    redirect('/member/my-jstudyroom');
  }

  return (
  <div className="w-full">
    <div className="w-full max-w-7xl mx-auto px-4">
      <MyJstudyroomViewerClient
        document={item.bookShopItem.document}
        bookShopTitle={item.bookShopItem.title}
        memberName={session.user.name || session.user.email}
        itemId={itemId}
      />
    </div>
  </div>
 );

}
