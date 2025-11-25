'use client';

import Link from 'next/link';
import { Sparkles, Zap, UserPlus } from 'lucide-react';

export default function LandingHero() {
  const scrollToRequestForm = () => {
    const formElement = document.getElementById('request-access');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
      <div className="text-center animate-fadeIn">
        <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-scaleIn">
          <Sparkles className="w-4 h-4" />
          <span>Welcome to jStudyRoom</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-slideIn">
          Your Personal Study Room
          <br />
          <span className="text-4xl md:text-6xl">Secure & Accessible</span>
        </h1>
        
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto animate-slideIn" style={{ animationDelay: '0.1s' }}>
          jStudyRoom is a secure document sharing and Personal Learning Space.          
        </p>

        <div className="mb-8 max-w-2xl mx-auto text-left bg-green-50 dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 animate-slideIn" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Three User Roles:</h3>
          <ul className="space-y-2 text-gray-600 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
              <span><strong className="text-gray-900 dark:text-white">Platform Users:</strong> Upload, manage, and share protected documents with full control (requires admin approval)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
              <span><strong className="text-gray-900 dark:text-white">Members:</strong> Self-register to access shared documents, browse the Book Shop, and build your personal library (My jStudyRoom)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-600 dark:text-pink-400 font-bold">•</span>
              <span><strong className="text-gray-900 dark:text-white">Admins:</strong> Manage users, curate the Book Shop, and oversee platform operations</span>
            </li>
          </ul>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slideIn" style={{ animationDelay: '0.3s' }}>
          <Link
            href="/register"
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Become a Member
          </Link>
          <button
            onClick={scrollToRequestForm}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            <Zap className="w-5 h-5" />
            Request Platform Access
          </button>
          <a
            href="#features"
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-8 py-4 rounded-lg text-lg font-semibold border-2 border-gray-200 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-400 transition-all duration-300 hover:scale-105"
          >
            Learn More
          </a>
        </div>

        {/* Key Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto animate-fadeIn" style={{ animationDelay: '0.4s' }}>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">🔒</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Enterprise Security</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Military-grade encryption & DRM</div>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">💧</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Dynamic Watermarks</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Automatic viewer identification</div>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl font-bold text-pink-600 dark:text-pink-400 mb-2">📊</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Real-time Analytics</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Track every document view</div>
          </div>
        </div>
      </div>
    </section>
  );
}
