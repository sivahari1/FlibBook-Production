'use client';

import Link from 'next/link';
import { UserPlus, BookOpen, ShoppingBag, Share2, CheckCircle } from 'lucide-react';

export default function MemberCTA() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20 rounded-3xl p-12 border border-purple-200 dark:border-purple-800 shadow-2xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <UserPlus className="w-4 h-4" />
            <span>Free to Join</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            Become a Member Today
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Join jstudyroom and get instant access to shared documents, a curated Book Shop, 
            and your own personal digital library.
          </p>
        </div>

        {/* Member Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Files Shared With You
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Access all documents shared directly to your email by Platform Users. View them securely with dynamic watermarks.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Book Shop
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Browse our curated catalog of documents. Add free content or purchase premium materials to expand your knowledge.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              My jstudyroom
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Your personal virtual bookshelf. Store up to 10 documents (5 free, 5 paid) and access them anytime, anywhere.
            </p>
          </div>
        </div>

        {/* What You Get */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mb-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            What You Get as a Member
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              'Instant access after email verification',
              'View all documents shared with your email',
              'Browse the complete Book Shop catalog',
              'Add up to 5 free documents to your library',
              'Purchase up to 5 premium documents',
              'Secure FlipBook viewer with DRM protection',
              'Dynamic watermarks for accountability',
              'Access your library from any device'
            ].map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-5 rounded-xl text-lg font-bold hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <UserPlus className="w-6 h-6" />
            Register as a Member - It's Free!
          </Link>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
