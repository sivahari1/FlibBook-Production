'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import BookShopTable from '@/components/admin/BookShopTable'
import BookShopItemForm from '@/components/admin/BookShopItemForm'
import { Button } from '@/components/ui/Button'

interface BookShopItem {
  id: string
  documentId: string
  title: string
  description: string | null
  category: string
  isFree: boolean
  price: number | null
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
  document: {
    id: string
    title: string
    filename: string
    fileSize: number
    userId: string
    user: {
      name: string | null
      email: string
    }
  }
  _count?: {
    myJstudyroomItems: number
    payments: number
  }
}

export default function BookShopPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [items, setItems] = useState<BookShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<BookShopItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [publishedFilter, setPublishedFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [categories, setCategories] = useState<string[]>([])

  // Check authentication and authorization
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.userRole !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/bookshop/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }

  // Fetch Book Shop items
  const fetchItems = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      })

      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter)
      }

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      if (publishedFilter !== 'all') {
        params.append('isPublished', publishedFilter)
      }

      const response = await fetch(`/api/admin/bookshop?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch Book Shop items')
      }

      const data = await response.json()
      setItems(data.items)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Book Shop items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.userRole === 'ADMIN') {
      fetchCategories()
      fetchItems()
    }
  }, [status, session, page, categoryFilter, searchQuery, publishedFilter])

  const handleCreate = () => {
    setSelectedItem(null)
    setFormMode('create')
    setShowForm(true)
  }

  const handleEdit = (item: BookShopItem) => {
    setSelectedItem(item)
    setFormMode('edit')
    setShowForm(true)
  }

  const handleFormSubmit = async (data: any) => {
    try {
      const url = formMode === 'create' 
        ? '/api/admin/bookshop'
        : `/api/admin/bookshop/${selectedItem?.id}`
      
      const method = formMode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save Book Shop item')
      }

      // Refresh items list and categories
      await fetchItems()
      await fetchCategories()
      setShowForm(false)
      setSelectedItem(null)
    } catch (err) {
      throw err // Let the form component handle the error display
    }
  }

  const handleDelete = async (item: BookShopItem) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"? This will remove it from the Book Shop but will not delete the underlying document.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/bookshop/${item.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete Book Shop item')
      }

      // Refresh items list
      await fetchItems()
      await fetchCategories()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete Book Shop item')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Book Shop items...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' || session?.user?.userRole !== 'ADMIN') {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Book Shop Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage Book Shop items and categories
          </p>
        </div>
        <Button onClick={handleCreate} variant="primary">
          Create New Item
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by title or description..."
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
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setPage(1)
            }}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={publishedFilter}
            onChange={(e) => {
              setPublishedFilter(e.target.value)
              setPage(1)
            }}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="true">Published</option>
            <option value="false">Unpublished</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pagination.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Published</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {items.filter(i => i.isPublished).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Free Items</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {items.filter(i => i.isFree).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Paid Items</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {items.filter(i => !i.isFree).length}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Book Shop Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <BookShopTable
          items={items}
          onEdit={handleEdit}
          onDelete={handleDelete}
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

      {/* Form Modal */}
      {showForm && (
        <BookShopItemForm
          item={selectedItem}
          mode={formMode}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false)
            setSelectedItem(null)
          }}
          existingCategories={categories}
        />
      )}
    </div>
  )
}
