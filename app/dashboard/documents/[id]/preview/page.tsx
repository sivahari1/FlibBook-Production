import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDocumentForPreview } from '@/lib/documents';
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

  // Fetch document using shared data access layer
  const document = await getDocumentForPreview(documentId, session.user.id);

  if (!document) {
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
