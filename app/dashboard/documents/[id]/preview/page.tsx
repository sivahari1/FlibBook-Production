import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSignedUrl } from '@/lib/storage';
import PreviewWrapper from './PreviewWrapper';

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { id: documentId } = await params;

  // Fetch document and verify ownership
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      title: true,
      filename: true,
      storagePath: true,
      userId: true,
    },
  });

  if (!document) {
    redirect('/dashboard');
  }

  if (document.userId !== session.user.id) {
    redirect('/dashboard');
  }

  // Generate signed URL for the document
  const { url: signedUrl, error } = await getSignedUrl(
    document.storagePath,
    3600 // 1 hour
  );

  if (error || !signedUrl) {
    redirect('/dashboard');
  }

  return (
    <PreviewWrapper
      documentTitle={document.title}
      pdfUrl={signedUrl}
      userEmail={session.user.email || ''}
    />
  );
}
