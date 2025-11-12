import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Shield, Lock, Eye, BarChart3, FileText, Users, Sparkles, Zap, Globe, CheckCircle } from 'lucide-react';
import ThemeToggle from '@/components/theme/ThemeToggle';
import Footer from '@/components/layout/Footer';

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 transition-colors duration-300">
      {/* Navigation Header */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:scale-105 transition-transform">
              FlipBook DRM
            </Link>
            
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              {session ? (
                <Link
                  href="/dashboard"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center animate-fadeIn">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-scaleIn">
            <Sparkles className="w-4 h-4" />
            <span>Secure PDF Sharing Platform</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-slideIn">
            Protect Your Documents
            <br />
            <span className="text-4xl md:text-6xl">With Advanced DRM</span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto animate-slideIn" style={{ animationDelay: '0.1s' }}>
            Upload, share, and protect your PDF documents with enterprise-grade security, 
            dynamic watermarking, and comprehensive analytics.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slideIn" style={{ animationDelay: '0.2s' }}>
            <Link
              href="/register"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-8 py-4 rounded-lg text-lg font-semibold border-2 border-gray-200 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-400 transition-all duration-300 hover:scale-105"
            >
              Learn More
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-3xl mx-auto animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">256-bit</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Encryption</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">99.9%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-pink-600 dark:text-pink-400">24/7</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16 animate-fadeIn">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            Powerful Features
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Everything you need to secure and manage your PDF documents
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Shield,
              title: 'Advanced DRM Protection',
              description: 'Military-grade encryption and access control to keep your documents secure',
              color: 'from-blue-500 to-cyan-500',
              delay: '0s'
            },
            {
              icon: Eye,
              title: 'Dynamic Watermarking',
              description: 'Automatic watermarks with viewer email and timestamp for accountability',
              color: 'from-purple-500 to-pink-500',
              delay: '0.1s'
            },
            {
              icon: Lock,
              title: 'Secure Sharing',
              description: 'Password-protected links with expiration dates and view limits',
              color: 'from-green-500 to-emerald-500',
              delay: '0.2s'
            },
            {
              icon: BarChart3,
              title: 'Real-time Analytics',
              description: 'Track who views your documents, when, and from where',
              color: 'from-orange-500 to-red-500',
              delay: '0.3s'
            },
            {
              icon: FileText,
              title: 'Document Management',
              description: 'Organize, preview, and manage all your documents in one place',
              color: 'from-indigo-500 to-purple-500',
              delay: '0.4s'
            },
            {
              icon: Globe,
              title: 'Global CDN',
              description: 'Fast document delivery worldwide with 99.9% uptime guarantee',
              color: 'from-teal-500 to-cyan-500',
              delay: '0.5s'
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 dark:border-gray-700 animate-scaleIn"
              style={{ animationDelay: feature.delay }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 animate-float`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16 animate-fadeIn">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Get started in minutes with our simple 3-step process
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Upload Your PDF',
              description: 'Drag and drop your PDF document or select from your device',
              icon: FileText,
            },
            {
              step: '02',
              title: 'Configure Security',
              description: 'Set passwords, expiration dates, and view limits for your document',
              icon: Lock,
            },
            {
              step: '03',
              title: 'Share Securely',
              description: 'Generate a secure link and share it with your intended recipients',
              icon: Users,
            },
          ].map((step, index) => (
            <div
              key={index}
              className="relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 animate-slideIn"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="absolute -top-6 left-8 w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {step.step}
              </div>
              <div className="mt-6">
                <step.icon className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 md:p-16 text-center text-white shadow-2xl animate-scaleIn">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Secure Your Documents?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of users who trust FlipBook DRM to protect their valuable documents
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-2xl transition-all duration-300 hover:scale-105 inline-flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300 hover:scale-105"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
