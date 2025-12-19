import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import SimplePDFViewerTest from '@/components/viewers/SimplePDFViewerTest';

export const dynamic = 'force-dynamic';

export default async function TestNavigationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // Get a test document
  const document = await prisma.document.findFirst({
    where: {
      contentType: 'pdf'
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!document) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No PDF Documents Found</h1>
          <p>Please upload a PDF document first.</p>
        </div>
      </div>
    );
  }

  // Create a simple signed URL for testing
  const testPdfUrl = document.storagePath;

  return (
    <SimplePDFViewerTest
      pdfUrl={testPdfUrl}
      documentTitle={`Test Navigation - ${document.title}`}
    />
  );
}