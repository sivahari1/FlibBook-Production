'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { generateSecurePassword } from '@/lib/password-generator'

interface AccessRequest {
  id: string
  email: string
  name: string | null
  requestedRole: string | null
}

interface UserCreationModalProps {
  isOpen: boolean
  onClose: () => void
  accessRequest: AccessRequest
  onUserCreated: () => void
}

export default function UserCreationModal({
  isOpen,
  onClose,
  accessRequest,
  onUserCreated
}: UserCreationModalProps) {
  const [formData, setFormData] = useState({
    email: accessRequest.email,
    name: accessRequest.name || '',
    role: accessRequest.requestedRole || 'READER_USER',
    password: '',
    pricePlan: '',
    notes: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  // Generate password on mount
  useEffect(() => {
    if (isOpen && !formData.password) {
      setFormData(prev => ({ ...prev, password: generateSecurePassword(16) }))
    }
  }, [isOpen, formData.password])

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword(16)
    setFormData(prev => ({ ...prev, password: newPassword }))
    setCopied(false)
  }

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy password:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password || !formData.role) {
      setError('Email, password, and role are required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessRequestId: accessRequest.id,
          email: formData.email,
          name: formData.name || undefined,
          role: formData.role,
          password: formData.password,
          pricePlan: formData.pricePlan || undefined,
          notes: formData.notes || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create user')
      }

      const result = await response.json()
      
      // Show success message with password
      alert(`User created successfully!\n\nEmail: ${result.user.email}\nPassword: ${result.password}\n\nAn approval email has been sent to the user.`)
      
      onUserCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        email: accessRequest.email,
        name: accessRequest.name || '',
        role: accessRequest.requestedRole || 'READER_USER',
        password: '',
        pricePlan: '',
        notes: ''
      })
      setError(null)
      setCopied(false)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create User Account"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Email */}
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
          disabled={loading}
        />

        {/* Name */}
        <Input
          label="Name (Optional)"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          disabled={loading}
        />

        {/* Role Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            User Role
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
            disabled={loading}
            required
          >
            <option value="PLATFORM_USER">Platform User - Can upload and share documents</option>
            <option value="READER_USER">Reader User - Can only view shared documents</option>
          </select>
        </div>

        {/* Password Generator */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 font-mono"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                disabled={loading}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleCopyPassword}
              disabled={loading || !formData.password}
              className="whitespace-nowrap"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleGeneratePassword}
              disabled={loading}
              className="whitespace-nowrap"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Generate
            </Button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            16 characters with uppercase, lowercase, numbers, and symbols
          </p>
        </div>

        {/* Price Plan */}
        <Input
          label="Price Plan (Optional)"
          type="text"
          value={formData.pricePlan}
          onChange={(e) => setFormData(prev => ({ ...prev, pricePlan: e.target.value }))}
          placeholder="e.g., Starter – 10 docs / 5 users – ₹500/month"
          disabled={loading}
          helperText="Pricing information to include in the approval email"
        />

        {/* Admin Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Admin Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
            placeholder="Internal notes about this user..."
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            These notes are for internal use only and won't be sent to the user
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
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
            Create User & Send Email
          </Button>
        </div>
      </form>
    </Modal>
  )
}
