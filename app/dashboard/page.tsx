import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getUserWithDocuments } from '@/lib/documents';
import { DashboardClient } from '@/app/dashboard/DashboardClient';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/lib/razorpay';
import type { UserRole } from '@/lib/rbac/admin-privileges';
import { DatabaseErrorUI } from '@/components/errors/DatabaseErrorUI';

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
      return <DatabaseErrorUI />;
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
