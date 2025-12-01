import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import LogoutButton from '@/components/dashboard/LogoutButton';
import ThemeToggle from '@/components/theme/ThemeToggle';
import Footer from '@/components/layout/Footer';
import { InboxNavLink } from '@/components/dashboard/InboxNavLink';
import { DashboardSwitcher } from '@/components/common/DashboardSwitcher';

export default async function DashboardLayout({
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
  const isPlatformUser = userRole === 'PLATFORM_USER';
  const isReader = userRole === 'READER_USER';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-300">
      {/* Navigation Header */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <Link href="/dashboard" className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  jStudyRoom
                </Link>
                {isAdmin && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Platform User View
                  </span>
                )}
              </div>
              <div className="hidden md:flex space-x-4">
                {/* Admin Link - Only for ADMIN */}
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
                      className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
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
                
                {/* Documents Link - Only for PLATFORM_USER and ADMIN */}
                {(isPlatformUser || isAdmin) && (
                  <Link
                    href="/dashboard"
                    className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Documents
                  </Link>
                )}
                
                {/* Reader Dashboard Link - Only for READER_USER */}
                {isReader && (
                  <Link
                    href="/reader"
                    className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    My Documents
                  </Link>
                )}
                
                <InboxNavLink />
                
                {/* Subscription Link - Only for PLATFORM_USER and ADMIN */}
                {(isPlatformUser || isAdmin) && (
                  <Link
                    href="/dashboard/subscription"
                    className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Subscription
                  </Link>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <DashboardSwitcher />
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
