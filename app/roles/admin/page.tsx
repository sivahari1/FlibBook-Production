'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Users, Settings, BarChart3, BookOpen, CreditCard } from 'lucide-react';
import AccessRequestForm from '@/components/landing/AccessRequestForm';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              jStudyRoom
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 items-center justify-center mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Administrators
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Complete platform control and user management
          </p>
          <div className="mt-4">
            <span className="inline-block px-4 py-2 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-sm font-semibold">
              By Invitation Only
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">What You Can Do</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <Users className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">User Management</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Create, manage, and control access for all platform users and members</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Access Requests</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Review and approve platform user access requests</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">BookShop Management</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Curate and manage the BookShop catalog for members</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Payment Oversight</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monitor member payments and transaction history</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Platform Analytics</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">View comprehensive analytics and usage statistics</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Security Control</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage security settings and audit logs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Responsibilities */}
        <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 border border-rose-200 dark:border-gray-700 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Admin Responsibilities
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-700 dark:text-gray-300">Review and approve platform user access requests within 24-48 hours</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-700 dark:text-gray-300">Create and manage member accounts with appropriate access levels</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-700 dark:text-gray-300">Curate and maintain the BookShop catalog with quality educational content</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-700 dark:text-gray-300">Monitor platform usage and ensure compliance with security policies</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-700 dark:text-gray-300">Provide support and assistance to platform users and members</p>
            </div>
          </div>
        </div>

        {/* Request Admin Access Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            Request Admin Access
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            Admin access is granted by invitation only. Fill out the form below to express your interest.
          </p>
          <AccessRequestForm />
        </div>

        {/* Contact */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Questions about admin access?
          </p>
          <a
            href="mailto:sivaramj83@gmail.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
          >
            Contact Current Admin
          </a>
        </div>
      </div>
    </div>
  );
}
