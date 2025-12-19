'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function InboxNavLink() {
  const [count, setCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    async function fetchInboxCount() {
      try {
        const response = await fetch('/api/inbox')
        if (response.ok) {
          const data = await response.json()
          setCount(data.shares?.length || 0)
        }
      } catch (error) {
        console.error('Failed to fetch inbox count:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInboxCount()
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchInboxCount, 30000)
    return () => clearInterval(interval)
    // Empty dependency array is correct here - we want to set up the interval once on mount
     
  }, [])

  const isActive = pathname === '/inbox'

  return (
    <Link
      href="/inbox"
      className={`${
        isActive
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
      } px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center relative`}
    >
      <svg
        className="w-4 h-4 mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      Inbox
      {!loading && count > 0 && (
        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
          {count}
        </span>
      )}
    </Link>
  )
}
