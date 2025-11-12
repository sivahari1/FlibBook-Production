import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import AnalyticsClient from './AnalyticsClient';

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

  // Fetch document details
  const document = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      filename: true,
      fileSize: true,
      createdAt: true,
      userId: true,
    },
  });

  if (!document) {
    redirect('/dashboard');
  }

  if (document.userId !== session.user.id) {
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
