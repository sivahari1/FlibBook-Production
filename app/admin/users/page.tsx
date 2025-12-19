'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import UsersTable from '@/components/admin/UsersTable'
import UserEditModal from '@/components/admin/UserEditModal'
import { ResetPasswordModal } from '@/components/admin/ResetPasswordModal'
import { Button } from '@/components/ui/Button'

interface User {
  id: string
  email: string
  name: string | null
  userRole: string
  pricePlan: string | null
  notes: string | null
  isActive: boolean
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
  _count?: {
    documents: number
  }
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [resetPasswordResult, setResetPasswordResult] = useState<{ password: string; email: string } | null>(null)
  
  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })

  // Check authentication and authorization
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.userRole !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      })

      if (roleFilter !== 'all') {
        params.append('role', roleFilter)
      }

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/admin/users?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.userRole === 'ADMIN') {
      fetchUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, page, roleFilter, searchQuery])

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleEditSubmit = async (data: any) => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to update user')
      }

      // Refresh users list
      await fetchUsers()
      setShowEditModal(false)
      setSelectedUser(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const handleResetPassword = (user: User) => {
    setResetPasswordUser(user)
    setShowResetPasswordModal(true)
  }

  const confirmResetPassword = async (password: string) => {
    if (!resetPasswordUser) return

    try {
      const response = await fetch(`/api/admin/users/${resetPasswordUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      })

      if (!response.ok) {
        throw new Error('Failed to reset password')
      }

      const data = await response.json()
      
      // Close modal
      setShowResetPasswordModal(false)
      setResetPasswordUser(null)
      
      // Show success with the password
      setResetPasswordResult({
        password: data.password,
        email: resetPasswordUser.email
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reset password')
    }
  }

  const handleToggleActive = async (user: User) => {
    const action = user.isActive ? 'deactivate' : 'activate'
    if (!confirm(`Are you sure you want to ${action} ${user.email}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !user.isActive
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`)
      }

      // Refresh users list
      await fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} user`)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' || session?.user?.userRole !== 'ADMIN') {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          User Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage all users and their access
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value)
              setPage(1)
            }}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="PLATFORM_USER">Platform User</option>
            <option value="READER_USER">Reader User</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pagination.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {users.filter(u => u.isActive).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Inactive Users</p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {users.filter(u => !u.isActive).length}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <UsersTable
          users={users}
          onEdit={handleEdit}
          onResetPassword={handleResetPassword}
          onToggleActive={handleToggleActive}
        />
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <Button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            variant="secondary"
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            variant="secondary"
          >
            Next
          </Button>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <UserEditModal
          user={selectedUser}
          onSubmit={handleEditSubmit}
          onCancel={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
        />
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordUser && (
        <ResetPasswordModal
          isOpen={showResetPasswordModal}
          onClose={() => {
            setShowResetPasswordModal(false)
            setResetPasswordUser(null)
          }}
          userEmail={resetPasswordUser.email}
          onConfirm={confirmResetPassword}
        />
      )}

      {/* Password Reset Result Modal */}
      {resetPasswordResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Password Reset Successful
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              New password for <strong>{resetPasswordResult.email}</strong>:
            </p>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4">
              <code className="text-lg font-mono text-gray-900 dark:text-white break-all">
                {resetPasswordResult.password}
              </code>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => copyToClipboard(resetPasswordResult.password)}
                variant="secondary"
                className="flex-1"
              >
                Copy Password
              </Button>
              <Button
                onClick={() => setResetPasswordResult(null)}
                variant="primary"
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
