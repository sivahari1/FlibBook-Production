import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReaderDashboard } from '@/components/reader/ReaderDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReaderPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // Verify user has READER_USER role
  if (session.user.userRole !== 'READER_USER') {
    // Redirect to appropriate dashboard based on role
    if (session.user.userRole === 'ADMIN') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  }

  // Fetch shared documents for reader user
  let shares: any[] = [];
  
  try {
    const { getEmailSharesForUser } = await import('@/lib/documents');
    
    if (session.user.id && session.user.email) {
      const emailShares = await getEmailSharesForUser(session.user.id, session.user.email);
      
      // Filter out expired shares
      const now = new Date();
      shares = emailShares
        .filter((share: any) => !share.expiresAt || share.expiresAt > now)
        .map((share: any) => ({
          id: share.id,
          document: {
            id: share.document.id,
            title: share.document.title,
            filename: share.document.filename
          },
          sharedBy: {
            name: share.sharedBy.name,
            email: share.sharedBy.email
          },
          createdAt: share.createdAt.toISOString(),
          expiresAt: share.expiresAt?.toISOString(),
          canDownload: share.canDownload,
          note: share.note,
          type: 'email'
        }));
    }
  } catch (error) {
    console.error('Error fetching shared documents:', error);
    // Continue with empty shares array
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Reader Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            View documents shared with you
          </p>
        </div>

        {/* Reader Dashboard Content */}
        <ReaderDashboard shares={shares} />
      </div>
    </div>
  );
}
