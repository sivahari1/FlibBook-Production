import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserSubscription } from '@/lib/documents';
import SubscriptionClient from './SubscriptionClient';

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SubscriptionPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch user subscription using shared data access layer
  const user = await getUserSubscription(session.user.id);

  if (!user) {
    redirect('/login');
  }

  const activeSubscription = user.subscriptions[0] || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Unlock powerful features and secure your documents with our flexible subscription plans
          </p>
        </div>

        <SubscriptionClient
          currentPlan={user.subscription}
          activeSubscription={activeSubscription}
        />
      </div>
    </div>
  );
}
