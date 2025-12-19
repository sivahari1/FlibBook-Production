'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface User {
  id: string
  email: string
  name: string | null
  userRole: string
  pricePlan: string | null
  notes: string | null
  isActive: boolean
}

interface UserEditModalProps {
  user: User
  onSubmit: (data: {
    userRole?: string
    pricePlan?: string
    notes?: string
    isActive?: boolean
  }) => Promise<void>
  onCancel: () => void
}

export default function UserEditModal({
  user,
  onSubmit,
  onCancel
}: UserEditModalProps) {
  const [formData, setFormData] = useState({
    userRole: user.userRole,
    pricePlan: user.pricePlan || '',
    notes: user.notes || '',
    isActive: user.isActive
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)

      await onSubmit({
        userRole: formData.userRole,
        pricePlan: formData.pricePlan || undefined,
        notes: formData.notes || undefined,
        isActive: formData.isActive
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={`Edit User: ${user.email}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* User Info (Read-only) */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name || '-'}</p>
            </div>
          </div>
        </div>

        {/* Role Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            User Role
          </label>
          <select
            value={formData.userRole}
            onChange={(e) => setFormData(prev => ({ ...prev, userRole: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
            disabled={loading}
            required
          >
            <option value="ADMIN">Admin - Full system access</option>
            <option value="PLATFORM_USER">Platform User - Can upload and share documents</option>
            <option value="READER_USER">Reader User - Can only view shared documents</option>
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Changing the role will affect the user&apos;s permissions immediately
          </p>
        </div>

        {/* Price Plan */}
        <Input
          label="Price Plan"
          type="text"
          value={formData.pricePlan}
          onChange={(e) => setFormData(prev => ({ ...prev, pricePlan: e.target.value }))}
          placeholder="e.g., Starter – 10 docs / 5 users – ₹500/month"
          disabled={loading}
          helperText="Pricing information for reference"
        />

        {/* Admin Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Admin Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
            placeholder="Internal notes about this user..."
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            These notes are for internal use only
          </p>
        </div>

        {/* Active/Inactive Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Account Status
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Inactive users cannot log in to the system
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              formData.isActive 
                ? 'bg-green-600' 
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
            disabled={loading}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Status Indicator */}
        <div className={`p-3 rounded-lg border ${
          formData.isActive 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <p className={`text-sm font-medium ${
            formData.isActive 
              ? 'text-green-800 dark:text-green-200'
              : 'text-red-800 dark:text-red-200'
          }`}>
            {formData.isActive 
              ? '✓ User account is active and can log in'
              : '⚠ User account is inactive and cannot log in'
            }
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={loading}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
