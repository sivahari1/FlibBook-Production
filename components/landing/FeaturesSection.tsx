'use client';

import { Shield, Eye, Lock, BarChart3, FileText, Users, Globe, CheckCircle } from 'lucide-react';

export default function FeaturesSection() {
  const features = [
    {
      icon: Shield,
      title: 'Advanced DRM Protection',
      description: 'Military-grade encryption and access control to keep your documents secure from unauthorized access',
      color: 'from-blue-500 to-cyan-500',
      delay: '0s'
    },
    {
      icon: Eye,
      title: 'Dynamic Watermarking',
      description: 'Automatic watermarks with viewer email and timestamp for complete accountability and traceability',
      color: 'from-purple-500 to-pink-500',
      delay: '0.1s'
    },
    {
      icon: Lock,
      title: 'Secure Sharing',
      description: 'Password-protected links with expiration dates, view limits, and email-based access control',
      color: 'from-green-500 to-emerald-500',
      delay: '0.2s'
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Comprehensive tracking of who views your documents, when they view them, and from where',
      color: 'from-orange-500 to-red-500',
      delay: '0.3s'
    },
    {
      icon: FileText,
      title: 'Document Management',
      description: 'Organize, preview, and manage all your protected documents in one centralized dashboard',
      color: 'from-indigo-500 to-purple-500',
      delay: '0.4s'
    },
    {
      icon: Users,
      title: 'Role-Based Access',
      description: 'Flexible user roles for platform users who upload and reader users who only view content',
      color: 'from-teal-500 to-cyan-500',
      delay: '0.5s'
    },
  ];

  const userTypes = [
    {
      title: 'Platform Users',
      description: 'Full access to upload, manage, and share documents (requires admin approval)',
      features: [
        'Upload unlimited PDFs',
        'Create secure share links',
        'Set passwords and expiration',
        'View detailed analytics',
        'Manage document access',
        'Revoke shares anytime'
      ],
      color: 'from-blue-600 to-purple-600',
      icon: '🚀'
    },
    {
      title: 'Members',
      description: 'Self-register to access shared content and the Book Shop',
      features: [
        'View documents shared with you',
        'Browse the curated Book Shop',
        'Build your personal library (My jstudyroom)',
        'Add up to 10 documents (5 free, 5 paid)',
        'Purchase premium content',
        'Secure FlipBook viewer with watermarks'
      ],
      color: 'from-purple-600 to-pink-600',
      icon: '📚'
    }
  ];

  return (
    <>
      {/* Main Features Section */}
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
          {features.map((feature, index) => (
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

      {/* User Types Comparison */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16 animate-fadeIn">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            Choose Your Access Level
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Whether you need to share documents or view them, we have the right solution
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {userTypes.map((type, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-slideIn"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`bg-gradient-to-r ${type.color} p-6 text-white`}>
                <div className="text-4xl mb-3">{type.icon}</div>
                <h3 className="text-2xl font-bold mb-2">{type.title}</h3>
                <p className="text-white/90">{type.description}</p>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {type.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-12 border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Enterprise-Grade Security
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Your documents are protected with the same security standards used by Fortune 500 companies
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: '256-bit Encryption', value: '🔐' },
              { label: 'DRM Protection', value: '🛡️' },
              { label: '99.9% Uptime', value: '⚡' },
              { label: 'GDPR Compliant', value: '✅' }
            ].map((item, index) => (
              <div key={index} className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md">
                <div className="text-4xl mb-3">{item.value}</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
