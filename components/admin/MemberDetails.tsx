'use client'

import { useEffect, useState, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatDistanceToNow, format } from 'date-fns'

interface MemberData {
  id: string
  email: string
  name: string | null
  emailVerified: boolean
  emailVerifiedAt: Date | null
  createdAt: Date
  freeDocumentCount: number
  paidDocumentCount: number
  isActive: boolean
  myJstudyroomItems: Array<{
    id: string
    isFree: boolean
    addedAt: Date
    bookShopItem: {
      id: string
      title: string
      category: string
      price: number | null
    }
  }>
  payments: Array<{
    id: string
    amount: number
    status: string
    createdAt: Date
    bookShopItem: {
      title: string
    }
  }>
}

interface MemberDetailsProps {
  memberId: string
  onClose: () => void
}

export default function MemberDetails({ memberId, onClose }: MemberDetailsProps) {
  const [member, setMember] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchMemberDetails = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/members/${memberId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch member details')
      }

      const data = await response.json()
      setMember(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    fetchMemberDetails()
  }, [fetchMemberDetails])

  const handleToggleActive = async () => {
    if (!member) return

    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/members/${memberId}/toggle-active`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to update member status')
      }

      await fetchMemberDetails()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!member) return

    if (!confirm(`Send password reset email to ${member.email}?`)) {
      return
    }

    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/members/${memberId}/reset-password`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to send password reset email')
      }

      alert('Password reset email sent successfully')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Member Details">
      <div className="space-y-6">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading member details...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {member && (
          <>
            {/* Member Information */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Member Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {member.name || 'No name'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {member.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Registration Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {format(new Date(member.createdAt), 'PPP')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <div className="flex gap-2 mt-1">
                    {member.emailVerified ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Unverified
                      </span>
                    )}
                    {member.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Document Counts</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Free: {member.freeDocumentCount}/5 | Paid: {member.paidDocumentCount}/5
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    Total: {member.freeDocumentCount + member.paidDocumentCount}/10
                  </p>
                </div>
              </div>
            </div>

            {/* My jstudyroom Contents */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                My jstudyroom ({member.myJstudyroomItems.length}/10)
              </h3>
              {member.myJstudyroomItems.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">No documents in My jstudyroom</p>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Title
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Added
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {member.myJstudyroomItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {item.bookShopItem.title}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {item.bookShopItem.category}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {item.isFree ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                Free
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                Paid (₹{(item.bookShopItem.price || 0) / 100})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {formatDistanceToNow(new Date(item.addedAt), { addSuffix: true })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Purchase History */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Purchase History ({member.payments.filter(p => p.status === 'success').length})
              </h3>
              {member.payments.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">No purchases yet</p>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Document
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {member.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {payment.bookShopItem.title}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            ₹{payment.amount / 100}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {payment.status === 'success' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Success
                              </span>
                            ) : payment.status === 'pending' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                Failed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {format(new Date(payment.createdAt), 'PPP')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={handleToggleActive}
                disabled={actionLoading}
                variant={member.isActive ? 'danger' : 'primary'}
              >
                {member.isActive ? 'Deactivate Account' : 'Activate Account'}
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={actionLoading}
                variant="secondary"
              >
                Send Password Reset
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
