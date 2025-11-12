import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { InboxClient } from './InboxClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InboxPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // Fetch inbox data
  const response = await fetch(
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/inbox`,
    {
      headers: {
        Cookie: `next-auth.session-token=${session.user.id}`,
      },
      cache: 'no-store',
    }
  );

  let shares = [];
  if (response.ok) {
    const data = await response.json();
    shares = data.shares || [];
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Inbox
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Documents shared with you by other users
          </p>
        </div>

        {/* Inbox Content */}
        <InboxClient initialShares={shares} />
      </div>
    </div>
  );
}
