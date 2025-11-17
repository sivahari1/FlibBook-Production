'use client'

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import UserCreationModal from './UserCreationModal'

interface AccessRequest {
  id: string
  email: string
  name: string | null
  purpose: string
  numDocuments: number | null
  numUsers: number | null
  requestedRole: string | null
  extraMessage: string | null
  status: string
  adminNotes: string | null
  reviewedBy: string | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface AccessRequestDetailProps {
  request: AccessRequest
  onClose: () => void
  onRequestUpdated: () => void
}

export default function AccessRequestDetail({
  request,
  onClose,
  onRequestUpdated
}: AccessRequestDetailProps) {
  const [adminNotes, setAdminNotes] = useState(request.adminNotes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUserCreationModal, setShowUserCreationModal] = useState(false)

  const handleApprove = () => {
    setShowUserCreationModal(true)
  }

  const handleUserCreated = () => {
    onRequestUpdated()
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (newStatus === 'REJECTED' && !confirm('Are you sure you want to reject this request?')) {
      return
    }

    if (newStatus === 'CLOSED' && !confirm('Are you sure you want to close this request?')) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/access-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          adminNotes
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update request')
      }

      onRequestUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotes = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/access-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save notes')
      }

      onRequestUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
    return styles[status as keyof typeof styles] || styles.PENDING
  }

  const getRoleLabel = (role: string | null) => {
    if (!role) return 'Not specified'
    return role === 'PLATFORM_USER' ? 'Platform User' : 'Reader User'
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(request.status)}`}>
          {request.status}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Submitted {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Request Information */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <p className="text-gray-900 dark:text-white">{request.email}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name
          </label>
          <p className="text-gray-900 dark:text-white">{request.name || 'Not provided'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Purpose
          </label>
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{request.purpose}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Number of Documents
            </label>
            <p className="text-gray-900 dark:text-white">{request.numDocuments || 'Not specified'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Number of Users
            </label>
            <p className="text-gray-900 dark:text-white">{request.numUsers || 'Not specified'}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Requested Role
          </label>
          <p className="text-gray-900 dark:text-white">{getRoleLabel(request.requestedRole)}</p>
        </div>

        {request.extraMessage && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Additional Message
            </label>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{request.extraMessage}</p>
          </div>
        )}
      </div>

      {/* Review Information */}
      {request.reviewedBy && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Reviewed by {request.reviewedBy} on{' '}
            {request.reviewedAt && format(new Date(request.reviewedAt), 'PPpp')}
          </p>
        </div>
      )}

      {/* Admin Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Admin Notes
        </label>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          placeholder="Add internal notes about this request..."
        />
        <button
          onClick={handleSaveNotes}
          disabled={loading}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
        >
          Save Notes
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={loading}
        >
          Close
        </Button>

        {request.status === 'PENDING' && (
          <>
            <Button
              variant="secondary"
              onClick={() => handleUpdateStatus('CLOSED')}
              disabled={loading}
            >
              Mark as Closed
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleUpdateStatus('REJECTED')}
              disabled={loading}
              className="!bg-red-600 !text-white hover:!bg-red-700"
            >
              Reject
            </Button>
            <Button
              variant="primary"
              onClick={handleApprove}
              disabled={loading}
            >
              Approve & Create User
            </Button>
          </>
        )}

        {(request.status === 'APPROVED' || request.status === 'REJECTED') && (
          <Button
            variant="secondary"
            onClick={() => handleUpdateStatus('CLOSED')}
            disabled={loading}
          >
            Mark as Closed
          </Button>
        )}
      </div>

      {/* User Creation Modal */}
      <UserCreationModal
        isOpen={showUserCreationModal}
        onClose={() => setShowUserCreationModal(false)}
        accessRequest={request}
        onUserCreated={handleUserCreated}
      />
    </div>
  )
}
