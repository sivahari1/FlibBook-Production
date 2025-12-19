import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import FilesSharedWithMe from '@/components/member/FilesSharedWithMe';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SharedFilesPage() {
  const session = await getServerSession(authOptions);

  // Verify authentication
  if (!session) {
    redirect('/login');
  }

  // Allow MEMBER or ADMIN role (admins can test member features)
  if (session.user?.userRole !== 'MEMBER' && session.user?.userRole !== 'ADMIN') {
    // Redirect to appropriate dashboard based on role
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
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <svg
              className="w-6 h-6 text-blue-600 dark:text-blue-400"
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Files Shared With Me
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              View and access documents that have been shared with you
            </p>
          </div>
        </div>
      </div>

      {/* Shared Files Component */}
      <FilesSharedWithMe />
    </div>
  );
}
