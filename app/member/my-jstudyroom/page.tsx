import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MyJstudyroom } from '@/components/member/MyJstudyroom';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MyJstudyroomPage() {
  const session = await getServerSession(authOptions);

  // Verify authentication
  if (!session) {
    redirect('/login');
  }

  // Allow ADMIN users to access member my-jstudyroom for testing and verification
  // Redirect non-member, non-admin users to their appropriate dashboards
  if (session.user?.userRole !== 'MEMBER' && session.user?.userRole !== 'ADMIN') {
    if (session.user?.userRole === 'PLATFORM_USER') {
      redirect('/dashboard');
    } else if (session.user?.userRole === 'READER_USER') {
      redirect('/reader');
    } else {
      redirect('/login');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          My Study Room
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your personal collection of documents
        </p>
      </div>
      <MyJstudyroom />
    </div>
  );
}
