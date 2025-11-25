'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ContentTypeSelector } from '@/components/upload/ContentTypeSelector'
import { FileUploader } from '@/components/upload/FileUploader'
import { LinkUploader } from '@/components/upload/LinkUploader'
import { ContentType, LinkMetadata } from '@/lib/types/content'

interface BookShopItem {
  id: string
  documentId: string
  title: string
  description: string | null
  category: string
  isFree: boolean
  price: number | null
  isPublished: boolean
  contentType?: string
  linkUrl?: string | null
  metadata?: any
}

interface Document {
  id: string
  title: string
  filename: string
  fileSize: number
  contentType?: string
}

interface BookShopItemFormProps {
  item: BookShopItem | null
  mode: 'create' | 'edit'
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  existingCategories: string[]
}

export default function BookShopItemForm({
  item,
  mode,
  onSubmit,
  onCancel,
  existingCategories
}: BookShopItemFormProps) {
  // Determine initial content type
  const initialContentType = item?.contentType 
    ? (item.contentType as ContentType) 
    : ContentType.PDF

  const [contentType, setContentType] = useState<ContentType>(initialContentType)
  const [formData, setFormData] = useState({
    documentId: item?.documentId || '',
    title: item?.title || '',
    description: item?.description || '',
    category: item?.category || '',
    isFree: item?.isFree !== false,
    price: item?.price ? (item.price / 100).toString() : '',
    isPublished: item?.isPublished !== false
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [useNewCategory, setUseNewCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  
  // File/Link upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState(item?.linkUrl || '')
  const [linkMetadata, setLinkMetadata] = useState<LinkMetadata | null>(null)
  const [useExistingDocument, setUseExistingDocument] = useState(mode === 'edit')

  // Fetch available documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoadingDocuments(true)
        const response = await fetch('/api/documents')
        if (response.ok) {
          const data = await response.json()
          setDocuments(data.documents || [])
        }
      } catch (err) {
        console.error('Failed to fetch documents:', err)
      } finally {
        setLoadingDocuments(false)
      }
    }

    fetchDocuments()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)

      // Validation
      if (!formData.title.trim()) {
        throw new Error('Title is required')
      }

      const finalCategory = useNewCategory ? newCategory.trim() : formData.category
      if (!finalCategory) {
        throw new Error('Category is required')
      }

      if (!formData.isFree) {
        const priceValue = parseFloat(formData.price)
        if (isNaN(priceValue) || priceValue <= 0) {
          throw new Error('Price must be a positive number for paid items')
        }
      }

      // Content type specific validation
      if (mode === 'create') {
        if (contentType === ContentType.LINK) {
          if (!linkUrl.trim()) {
            throw new Error('Please enter a URL for the link')
          }
        } else if (!useExistingDocument) {
          if (!selectedFile) {
            throw new Error(`Please select a ${contentType.toLowerCase()} file`)
          }
        } else {
          if (!formData.documentId) {
            throw new Error('Please select an existing document')
          }
        }
      }

      // Prepare data
      const submitData: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: finalCategory,
        isFree: formData.isFree,
        isPublished: formData.isPublished,
        contentType: contentType
      }

      // Add content type specific data
      if (mode === 'create') {
        if (contentType === ContentType.LINK) {
          submitData.linkUrl = linkUrl
          if (linkMetadata) {
            submitData.metadata = {
              domain: linkMetadata.domain,
              title: linkMetadata.title,
              description: linkMetadata.description,
              previewImage: linkMetadata.previewImage,
              fetchedAt: linkMetadata.fetchedAt
            }
          }
        } else if (useExistingDocument) {
          submitData.documentId = formData.documentId
        } else {
          submitData.file = selectedFile
        }
      } else {
        // Edit mode - keep existing document
        submitData.documentId = formData.documentId
      }

      if (!formData.isFree) {
        // Convert price to paise (₹1 = 100 paise)
        submitData.price = Math.round(parseFloat(formData.price) * 100)
      }

      await onSubmit(submitData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  const handlePriceChange = (value: string) => {
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setFormData(prev => ({ ...prev, price: value }))
    }
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    // Auto-fill title if empty
    if (!formData.title) {
      const fileName = file.name.replace(/\.[^/.]+$/, '') // Remove extension
      setFormData(prev => ({ ...prev, title: fileName }))
    }
  }

  const handleLinkSubmit = (url: string, title: string, description?: string) => {
    setLinkUrl(url)
    // Auto-fill form fields if empty
    if (!formData.title) {
      setFormData(prev => ({ ...prev, title }))
    }
    if (!formData.description && description) {
      setFormData(prev => ({ ...prev, description }))
    }
  }

  const handleMetadataFetch = (metadata: LinkMetadata) => {
    setLinkMetadata(metadata)
  }

  const handleContentTypeChange = (newType: ContentType) => {
    setContentType(newType)
    // Reset file/link state when changing type
    setSelectedFile(null)
    setLinkUrl('')
    setLinkMetadata(null)
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={mode === 'create' ? 'Create Book Shop Item' : 'Edit Book Shop Item'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Content Type Selector (Create mode only) */}
        {mode === 'create' && (
          <ContentTypeSelector
            selectedType={contentType}
            onTypeChange={handleContentTypeChange}
            allowedTypes={[ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK]}
            disabled={loading}
          />
        )}

        {/* Content Upload Section (Create mode only) */}
        {mode === 'create' && (
          <div className="space-y-4">
            {/* Option to use existing document or upload new */}
            {contentType !== ContentType.LINK && (
              <div className="flex gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!useExistingDocument}
                    onChange={() => {
                      setUseExistingDocument(false)
                      setFormData(prev => ({ ...prev, documentId: '' }))
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Upload new file</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={useExistingDocument}
                    onChange={() => {
                      setUseExistingDocument(true)
                      setSelectedFile(null)
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Use existing document</span>
                </label>
              </div>
            )}

            {/* File Upload or Document Selector */}
            {contentType === ContentType.LINK ? (
              <LinkUploader
                onLinkSubmit={handleLinkSubmit}
                onMetadataFetch={handleMetadataFetch}
                disabled={loading}
                initialUrl={linkUrl}
                initialTitle={formData.title}
                initialDescription={formData.description}
              />
            ) : useExistingDocument ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Existing Document <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.documentId}
                  onChange={(e) => {
                    const selectedDoc = documents.find(d => d.id === e.target.value)
                    setFormData(prev => ({
                      ...prev,
                      documentId: e.target.value,
                      // Auto-fill title if empty
                      title: prev.title || selectedDoc?.title || ''
                    }))
                  }}
                  disabled={loadingDocuments}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                  required
                >
                  <option value="">
                    {loadingDocuments ? 'Loading documents...' : 'Select a document'}
                  </option>
                  {documents
                    .filter(doc => !doc.contentType || doc.contentType === contentType)
                    .map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title} ({doc.filename})
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <FileUploader
                contentType={contentType}
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onFileRemove={() => setSelectedFile(null)}
                disabled={loading}
              />
            )}
          </div>
        )}

        {/* Edit mode - show current document info */}
        {mode === 'edit' && (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">Content Type:</span> {contentType}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Content cannot be changed after creation. You can only update title, description, category, pricing, and visibility.
            </p>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter item title"
            disabled={loading}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter item description (optional)"
            rows={3}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          
          {!useNewCategory ? (
            <div className="space-y-2">
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                required={!useNewCategory}
              >
                <option value="">Select a category</option>
                {existingCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setUseNewCategory(true)}
                disabled={loading}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
              >
                + Create new category
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter new category name"
                disabled={loading}
                required={useNewCategory}
              />
              <button
                type="button"
                onClick={() => {
                  setUseNewCategory(false)
                  setNewCategory('')
                }}
                disabled={loading}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
              >
                ← Use existing category
              </button>
            </div>
          )}
        </div>

        {/* Pricing Section */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Pricing & Visibility
          </h3>

          {/* Type (Free/Paid) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pricing <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={formData.isFree}
                  onChange={() => setFormData(prev => ({ ...prev, isFree: true, price: '' }))}
                  disabled={loading}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Free</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!formData.isFree}
                  onChange={() => setFormData(prev => ({ ...prev, isFree: false }))}
                  disabled={loading}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Paid</span>
              </label>
            </div>
          </div>

          {/* Price (only for paid items) */}
          {!formData.isFree && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  ₹
                </span>
                <input
                  type="text"
                  value={formData.price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder="0.00"
                  disabled={loading}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
                  required={!formData.isFree}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter price in rupees (e.g., 99.00)
              </p>
            </div>
          )}

          {/* Published Status */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                disabled={loading}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Published (visible to members)
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formData.isPublished 
                ? 'This item will be visible in the BookShop catalog' 
                : 'This item will be saved as a draft and hidden from members'}
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : mode === 'create' ? 'Create Item' : 'Update Item'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
