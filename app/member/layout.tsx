import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import LogoutButton from '@/components/dashboard/LogoutButton';
import Footer from '@/components/layout/Footer';
import { DashboardSwitcher } from '@/components/common/DashboardSwitcher';

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
              <div className="hidden md:flex space-x-2">
                {/* Admin Links - Only for ADMIN */}
                {isAdmin && (
                  <>
                    <Link
                      href="/admin"
                      className="px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-md transition-colors duration-200"
                    >
                      ← Back to Admin
                    </Link>
                    <Link
                      href="/admin/select-dashboard"
                      className="px-3 py-1.5 text-sm font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/30 rounded-md transition-colors duration-200"
                    >
                      Switch Dashboard
                    </Link>
                  </>
                )}
                <Link
                  href="/member"
                  className="px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-md transition-colors duration-200"
                >
                  Dashboard
                </Link>
                <Link
                  href="/member/shared"
                  className="px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors duration-200"
                >
                  Shared With Me
                </Link>
                <Link
                  href="/member/my-jstudyroom"
                  className="px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-md transition-colors duration-200"
                >
                  My jstudyroom
                </Link>
                <Link
                  href="/member/bookshop"
                  className="px-3 py-1.5 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-md transition-colors duration-200"
                >
                  Book Shop
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <DashboardSwitcher />
              <Link
                href="/"
                className="px-3 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-md transition-colors duration-200"
              >
                🏠 Home
              </Link>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium px-2">
                {session.user?.email}
              </div>
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
