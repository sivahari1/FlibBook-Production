import Link from 'next/link'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export default async function AdminDashboard() {
  // Fetch summary statistics with error handling
  let pendingRequests = 0
  let totalUsers = 0
  let platformUsers = 0
  let members = 0
  let admins = 0
  let hasError = false
  let errorMessage = ''

  try {
    const results = await Promise.allSettled([
      prisma.accessRequest.count({ where: { status: 'PENDING' } }),
      prisma.user.count(),
      prisma.user.count({ where: { userRole: 'PLATFORM_USER' } }),
      prisma.user.count({ where: { userRole: 'MEMBER' } }),
      prisma.user.count({ where: { userRole: 'ADMIN' } })
    ])

    // Process results safely
    if (results[0].status === 'fulfilled') pendingRequests = results[0].value
    if (results[1].status === 'fulfilled') totalUsers = results[1].value
    if (results[2].status === 'fulfilled') platformUsers = results[2].value
    if (results[3].status === 'fulfilled') members = results[3].value
    if (results[4].status === 'fulfilled') admins = results[4].value

    // Check if any queries failed
    const failedResults = results.filter(r => r.status === 'rejected')
    if (failedResults.length > 0) {
      hasError = true
      errorMessage = 'Some statistics could not be loaded due to database connectivity issues.'
      logger.error('Admin dashboard database queries failed', {
        failedCount: failedResults.length,
        errors: failedResults.map(r => r.status === 'rejected' ? r.reason?.message : 'Unknown')
      })
    }
  } catch (error: any) {
    hasError = true
    errorMessage = 'Unable to load dashboard statistics. Please check database connectivity.'
    logger.error('Admin dashboard critical error', error)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage access requests and users
        </p>
      </div>

      {/* Error Alert */}
      {hasError && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Database Connection Issue
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Requests
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {pendingRequests}
              </p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900 rounded-full p-3">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Users
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {totalUsers}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Platform Users
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {platformUsers}
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900 rounded-full p-3">
              <svg className="w-6 h-6 text-green-600 dark:text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Members
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {members}
              </p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-3">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/admin/access-requests"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Access Requests
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Review and approve Platform User requests
          </p>
          {pendingRequests > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              {pendingRequests} pending
            </span>
          )}
        </Link>

        <Link
          href="/admin/users"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Platform Users
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Manage Platform Users and permissions
          </p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {platformUsers} users
          </span>
        </Link>

        <Link
          href="/admin/bookshop"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Book Shop
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Manage Book Shop catalog and items
          </p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Manage catalog
          </span>
        </Link>

        <Link
          href="/admin/members"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Members
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            View and manage Member accounts
          </p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            {members} members
          </span>
        </Link>

        <Link
          href="/admin/payments"
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Payments
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Track payment transactions
          </p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
            View transactions
          </span>
        </Link>

        <Link
          href="/dashboard"
          className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-lg font-semibold text-white mb-2">
            📄 My Documents
          </h2>
          <p className="text-blue-50 mb-4">
            Upload, manage, and share documents with watermarks
          </p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
            Full access
          </span>
        </Link>
      </div>
    </div>
  )
}
