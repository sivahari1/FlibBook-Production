import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import LogoutButton from '@/components/dashboard/LogoutButton';
import ThemeToggle from '@/components/theme/ThemeToggle';
import Footer from '@/components/layout/Footer';

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const userRole = session.user?.userRole;
  const isAdmin = userRole === 'ADMIN';
  const isMember = userRole === 'MEMBER';

  // Allow ADMIN and MEMBER to access this layout
  if (!isAdmin && !isMember) {
    // Redirect non-members and non-admins to appropriate dashboard
    if (userRole === 'PLATFORM_USER') {
      redirect('/dashboard');
    } else if (userRole === 'READER_USER') {
      redirect('/reader');
    } else {
      redirect('/login');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-300">
      {/* Navigation Header */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <Link href="/member" className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent hover:scale-105 transition-transform">
                  jStudyRoom
                </Link>
                {isAdmin && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Member View
                  </span>
                )}
              </div>
              <div className="hidden md:flex space-x-4">
                {/* Admin Links - Only for ADMIN */}
                {isAdmin && (
                  <>
                    <Link
                      href="/admin"
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center bg-purple-50 dark:bg-purple-900/20"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                      </svg>
                      Back to Admin
                    </Link>
                    <Link
                      href="/admin/select-dashboard"
                      className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                        />
                      </svg>
                      Switch Dashboard
                    </Link>
                  </>
                )}
                <Link
                  href="/member"
                  className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/member/shared"
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Shared With Me
                </Link>
                <Link
                  href="/member/my-jstudyroom"
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  My jstudyroom
                </Link>
                <Link
                  href="/member/bookshop"
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Book Shop
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                🏠 Home
              </Link>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {session.user?.email}
              </div>
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
