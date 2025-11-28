import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MemberDashboard() {
  const session = await getServerSession(authOptions);

  // Verify authentication
  if (!session) {
    redirect('/login');
  }

  // Allow ADMIN users to access member dashboard for testing and verification
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

  // Fetch user data with document counts
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      freeDocumentCount: true,
      paidDocumentCount: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  const totalDocuments = (user.freeDocumentCount || 0) + (user.paidDocumentCount || 0);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome, {user.name || 'Member'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Access your shared documents, manage your personal bookshelf, and explore the Book Shop.
        </p>
      </div>

      {/* Document Count Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-lg shadow-sm p-6 border-2 border-blue-200 dark:border-blue-700 hover:shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Free Documents
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2 animate-pulse">
                {user.freeDocumentCount || 0} / 5
              </p>
            </div>
            <div className="p-3 bg-blue-200 dark:bg-blue-800 rounded-full hover:rotate-12 transition-transform duration-300">
              <svg
                className="w-8 h-8 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg shadow-sm p-6 border-2 border-purple-200 dark:border-purple-700 hover:shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Paid Documents
              </p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2 animate-pulse" style={{ animationDelay: '0.5s' }}>
                {user.paidDocumentCount || 0} / 5
              </p>
            </div>
            <div className="p-3 bg-purple-200 dark:bg-purple-800 rounded-full hover:rotate-12 transition-transform duration-300">
              <svg
                className="w-8 h-8 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg shadow-sm p-6 border-2 border-green-200 dark:border-green-700 hover:shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Total Documents
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2 animate-pulse" style={{ animationDelay: '1s' }}>
                {totalDocuments} / 10
              </p>
            </div>
            <div className="p-3 bg-green-200 dark:bg-green-800 rounded-full hover:rotate-12 transition-transform duration-300">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/member/shared"
          className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-lg shadow-md p-6 border-2 border-blue-300 dark:border-blue-600 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 group animate-slide-in-left"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-200 dark:bg-blue-700 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              <svg
                className="w-6 h-6 text-blue-700 dark:text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 group-hover:text-blue-700 dark:group-hover:text-blue-200 transition-colors">
                Files Shared With Me
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                View documents shared by others
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/member/my-jstudyroom"
          className="bg-gradient-to-br from-purple-100 to-fuchsia-100 dark:from-purple-900/40 dark:to-fuchsia-900/40 rounded-lg shadow-md p-6 border-2 border-purple-300 dark:border-purple-600 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 group animate-slide-in-up"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-200 dark:bg-purple-700 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              <svg
                className="w-6 h-6 text-purple-700 dark:text-purple-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 group-hover:text-purple-700 dark:group-hover:text-purple-200 transition-colors">
                My Study Room
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Your personal collection
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/member/bookshop"
          className="bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/40 dark:to-teal-900/40 rounded-lg shadow-md p-6 border-2 border-green-300 dark:border-green-600 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 group animate-slide-in-right"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-200 dark:bg-green-700 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              <svg
                className="w-6 h-6 text-green-700 dark:text-green-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 group-hover:text-green-700 dark:group-hover:text-green-200 transition-colors">
                Book Shop
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Browse and add documents
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Information Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <svg
            className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              About Your Study Room
            </h3>
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              Your Study Room is your personal collection space that can hold up to 10 content items: 
              5 free items and 5 paid items. Browse the Book Shop to discover and add educational content 
              to your collection. You can remove items at any time to make room for new ones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
