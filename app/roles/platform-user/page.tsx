'use client';

import Link from 'next/link';
import { ArrowLeft, Rocket, Upload, Share2, BarChart3, Shield } from 'lucide-react';
import AccessRequestForm from '@/components/landing/AccessRequestForm';

export default function PlatformUserPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
          <div className="inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 items-center justify-center mb-6">
            <Rocket className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Platform Users
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Full document control with enterprise-grade security
          </p>
          <div className="mt-4">
            <span className="inline-block px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-semibold">
              Requires Admin Approval
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">What You Can Do</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Upload Documents</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Upload and manage your PDF documents with automatic DRM protection</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Secure Sharing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Share via email or link with password protection and expiration</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">DRM Protection</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Automatic watermarking and copy protection on all shared documents</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Analytics</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Track who views your documents and when with detailed analytics</p>
              </div>
            </div>
          </div>
        </div>

        {/* Request Access Form */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 border border-blue-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            Request Platform User Access
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            Fill out the form below and our admin will review your request
          </p>
          <AccessRequestForm />
        </div>

        {/* Contact Admin */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Have questions? Contact our admin directly
          </p>
          <a
            href="mailto:sivaramj83@gmail.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Contact Admin
          </a>
        </div>
      </div>
    </div>
  );
}
