import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserWithDocuments } from '@/lib/documents';
import { DashboardClient } from '@/app/dashboard/DashboardClient';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/lib/razorpay';
import { hasUnlimitedUploads, getUploadQuotaRemaining } from '@/lib/rbac/admin-privileges';
import type { UserRole } from '@/lib/rbac/admin-privileges';

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Redirect READER_USER to reader dashboard
  if (session.user.userRole === 'READER_USER') {
    redirect('/reader');
  }

  // Allow ADMIN users to access dashboard for document management
  // ADMIN users can access both /admin and /dashboard

  // Fetch user with documents using shared data access layer
  let user;
  try {
    user = await getUserWithDocuments(session.user.id);
  } catch (error) {
    console.error('Error fetching user with documents:', error);
    
    // Check if it's a database connection error
    if (error instanceof Error && error.message.includes("Can't reach database server")) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
              Database Connection Error
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              Unable to connect to the database. Your Supabase project might be paused.
            </p>
            <div className="space-y-3">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-center transition-colors"
              >
                Open Supabase Dashboard
              </a>
              <button
                onClick={() => window.location.reload()}
                className="block w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg text-center transition-colors"
              >
                Retry Connection
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              If your project is paused, click "Resume Project" in the Supabase dashboard, wait 1-2 minutes, then retry.
            </p>
          </div>
        </div>
      );
    }
    
    throw new Error(`Failed to fetch user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (!user) {
    console.error('User not found:', session.user.id);
    redirect('/login');
  }

  // Check if user is admin for unlimited privileges
  const userRole = (session.user.userRole as UserRole) || 'PLATFORM_USER';
  const isAdmin = userRole === 'ADMIN';

  // Get subscription limits - ensure subscription field exists
  const subscription = (user.subscription as SubscriptionTier) || 'free';
  const limits = SUBSCRIPTION_PLANS[subscription];

  // Calculate storage usage - handle null/undefined storageUsed
  const storageUsed = user.storageUsed ? Number(user.storageUsed) : 0;
  const storageLimit = isAdmin ? Infinity : limits.storage;
  const storagePercentage = storageLimit === Infinity 
    ? 0 
    : Math.min((storageUsed / storageLimit) * 100, 100);

  // Format storage values
  const formatStorage = (bytes: number): string => {
    if (bytes === Infinity) return 'Unlimited';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const storageUsedFormatted = formatStorage(storageUsed);
  const storageLimitFormatted = formatStorage(storageLimit);

  // Serialize documents for client component - handle null/undefined documents
  const documents = (user.documents || []).map(doc => ({
    ...doc,
    fileSize: doc.fileSize ? doc.fileSize.toString() : '0',
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    contentType: doc.contentType || 'PDF',
    metadata: doc.metadata || {},
    linkUrl: doc.linkUrl || undefined,
  }));

  // Get document quota - unlimited for admins
  const documentQuota = isAdmin 
    ? 'Unlimited' 
    : limits.maxDocuments;

  return (
    <DashboardClient
      documents={documents}
      subscription={subscription}
      documentCount={user.documents ? user.documents.length : 0}
      maxDocuments={documentQuota}
      storageUsed={storageUsedFormatted}
      storageLimit={storageLimitFormatted}
      storagePercentage={storagePercentage}
      userRole={session.user.userRole || 'MEMBER'}
    />
  );
}
