import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ThemeToggle from '@/components/theme/ThemeToggle';
import Footer from '@/components/layout/Footer';
import PremiumHero from '@/components/landing/PremiumHero';
import FeatureModeCards from '@/components/landing/FeatureModeCards';

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 transition-colors duration-300">
      {/* Navigation Header */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:scale-105 transition-transform">
              jStudyRoom
            </Link>
            
            <div className="flex items-center space-x-4">
              {session ? (
                <Link
                  href={
                    session.user.userRole === 'ADMIN' ? '/admin' :
                    session.user.userRole === 'MEMBER' ? '/member' :
                    session.user.userRole === 'READER_USER' ? '/reader' :
                    '/dashboard'
                  }
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Premium Hero Section */}
      <PremiumHero />

      {/* Feature Mode Cards */}
      <FeatureModeCards />

      {/* Footer */}
      <Footer />
    </div>
  );
}
