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

  // Fetch user with documents using shared data access layer
  const user = await getUserWithDocuments(session.user.id);

  if (!user) {
    redirect('/login');
  }

  // Get subscription limits
  const subscription = (user.subscription as SubscriptionTier) || 'free';
  const limits = SUBSCRIPTION_PLANS[subscription];

  // Calculate storage usage
  const storageUsed = Number(user.storageUsed);
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

  // Serialize documents for client component
  const documents = user.documents.map(doc => ({
    ...doc,
    fileSize: doc.fileSize.toString(),
    createdAt: doc.createdAt.toISOString(),
  }));

  return (
    <DashboardClient
      documents={documents}
      subscription={subscription}
      documentCount={user.documents.length}
      maxDocuments={limits.maxDocuments}
      storageUsed={storageUsedFormatted}
      storageLimit={storageLimitFormatted}
      storagePercentage={storagePercentage}
    />
  );
}
