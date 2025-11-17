import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MyJstudyroom } from '@/components/member/MyJstudyroom';

export const metadata = {
  title: 'My jstudyroom - jstudyroom Platform',
  description: 'Your personal document collection',
};

export default async function MyJstudyroomPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.userRole !== 'MEMBER') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My jstudyroom
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Your personal collection of documents (maximum 10 documents: 5 free + 5 paid)
        </p>
      </div>

      <MyJstudyroom />
    </div>
  );
}
