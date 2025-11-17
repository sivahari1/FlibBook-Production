'use client'

import { useState, useEffect } from 'react'
import AccessRequestsTable from '@/components/admin/AccessRequestsTable'
import AccessRequestDetail from '@/components/admin/AccessRequestDetail'
import { Modal } from '@/components/ui/Modal'

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

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(statusFilter !== 'ALL' && { status: statusFilter })
      })

      const response = await fetch(`/api/admin/access-requests?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch access requests')
      }

      const data = await response.json()
      setRequests(data.requests)
      setTotalPages(data.pagination.totalPages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [statusFilter, page])

  const handleViewDetails = (request: AccessRequest) => {
    setSelectedRequest(request)
    setShowDetailModal(true)
  }

  const handleApprove = (request: AccessRequest) => {
    setSelectedRequest(request)
    setShowDetailModal(true)
  }

  const handleReject = async (request: AccessRequest) => {
    if (!confirm('Are you sure you want to reject this access request?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/access-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' })
      })

      if (!response.ok) {
        throw new Error('Failed to reject access request')
      }

      // Refresh the list
      fetchRequests()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject request')
    }
  }

  const handleCloseModal = () => {
    setShowDetailModal(false)
    setSelectedRequest(null)
  }

  const handleRequestUpdated = () => {
    fetchRequests()
    handleCloseModal()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Access Requests
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage user access requests and approvals
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Status:
        </label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <AccessRequestsTable
              requests={requests}
              onViewDetails={handleViewDetails}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <Modal
          isOpen={showDetailModal}
          onClose={handleCloseModal}
          title="Access Request Details"
        >
          <AccessRequestDetail
            request={selectedRequest}
            onClose={handleCloseModal}
            onRequestUpdated={handleRequestUpdated}
          />
        </Modal>
      )}
    </div>
  )
}
