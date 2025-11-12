/**
 * TypeScript types for Secure Sharing & Inbox feature
 */

export interface LinkShareCreate {
  documentId: string
  expiresAt?: Date
  maxViews?: number
  password?: string
  restrictToEmail?: string
  canDownload?: boolean
}

export interface EmailShareCreate {
  documentId: string
  email: string
  expiresAt?: Date
  canDownload?: boolean
  note?: string
}

export interface ShareAccess {
  isValid: boolean
  canAccess: boolean
  requiresPassword: boolean
  document?: {
    id: string
    title: string
    storagePath: string
  }
  error?: {
    code: string
    message: string
  }
}

export interface InboxItem {
  id: string
  document: {
    id: string
    title: string
    filename: string
  }
  sharedBy: {
    name: string
    email: string
  }
  createdAt: Date
  expiresAt?: Date
  canDownload: boolean
  note?: string
  type: 'link' | 'email'
}

export interface LinkShareResponse {
  shareKey: string
  url: string
  expiresAt?: string
  maxViews?: number
  canDownload: boolean
  restrictToEmail?: string
}

export interface EmailShareResponse {
  success: true
  shareId: string
}

export interface InboxResponse {
  shares: InboxItem[]
  total: number
  page: number
  pageSize: number
}
