import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDocumentById } from '@/lib/documents';
import AnalyticsClient from './AnalyticsClient';

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DocumentAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { id } = await params;

  // Fetch document using shared data access layer
  const document = await getDocumentById(id, session.user.id);

  if (!document) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{document.title}</h1>
        <p className="text-gray-600">
          Uploaded on {new Date(document.createdAt).toLocaleDateString()} • {(Number(document.fileSize) / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>

      <AnalyticsClient documentId={id} />
    </div>
  );
}
