'use client'

import { Button } from '@/components/ui/Button'

interface BookShopItem {
  id: string
  documentId: string
  title: string
  description: string | null
  category: string
  contentType: string
  isFree: boolean
  price: number | null
  isPublished: boolean
  linkUrl: string | null
  createdAt: Date
  updatedAt: Date
  document: {
    id: string
    title: string
    filename: string
    fileSize: number
    contentType: string
    linkUrl: string | null
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

interface BookShopTableProps {
  items: BookShopItem[]
  onEdit: (item: BookShopItem) => void
  onDelete: (item: BookShopItem) => void
}

export default function BookShopTable({ items, onEdit, onDelete }: BookShopTableProps) {
  const formatPrice = (price: number | null) => {
    if (price === null) return 'Free'
    return `₹${(price / 100).toFixed(2)}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No Book Shop items found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Document
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Usage
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.title}
                </div>
                {item.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                    {item.description}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {item.category}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.contentType === 'LINK'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                      : item.contentType === 'PDF'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : item.contentType === 'IMAGE'
                      ? 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
                      : item.contentType === 'VIDEO'
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {item.contentType}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.isFree 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                  }`}>
                    {item.isFree ? 'Free' : 'Paid'}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {formatPrice(item.price)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  item.isPublished
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {item.isPublished ? 'Published' : 'Unpublished'}
                </span>
              </td>
              <td className="px-6 py-4">
                {item.contentType === 'LINK' && item.linkUrl ? (
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      link
                    </div>
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                    >
                      {item.linkUrl.length > 50 ? `${item.linkUrl.substring(0, 50)}...` : item.linkUrl}
                    </a>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      by {item.document.user.name || item.document.user.email}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {item.document.filename}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(item.document.fileSize)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      by {item.document.user.name || item.document.user.email}
                    </div>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                <div>In {item._count?.myJstudyroomItems || 0} collections</div>
                <div>{item._count?.payments || 0} purchases</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {formatDate(item.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => onEdit(item)}
                    variant="secondary"
                    className="text-xs"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => onDelete(item)}
                    variant="secondary"
                    className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
