import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserWithDocuments } from '@/lib/documents';
import { DashboardClient } from '@/app/dashboard/DashboardClient';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/lib/razorpay';

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
    throw new Error(`Failed to fetch user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (!user) {
    console.error('User not found:', session.user.id);
    redirect('/login');
  }

  // Get subscription limits - ensure subscription field exists
  const subscription = (user.subscription as SubscriptionTier) || 'free';
  const limits = SUBSCRIPTION_PLANS[subscription];

  // Calculate storage usage - handle null/undefined storageUsed
  const storageUsed = user.storageUsed ? Number(user.storageUsed) : 0;
  const storageLimit = limits.storage;
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
  }));

  return (
    <DashboardClient
      documents={documents}
      subscription={subscription}
      documentCount={user.documents ? user.documents.length : 0}
      maxDocuments={limits.maxDocuments}
      storageUsed={storageUsedFormatted}
      storageLimit={storageLimitFormatted}
      storagePercentage={storagePercentage}
      userRole={session.user.userRole || 'MEMBER'}
    />
  );
}
