/**
 * Zod validation schemas for Secure Sharing & Inbox feature
 */

import { z } from 'zod'

export const createLinkShareSchema = z.object({
  documentId: z.string().cuid('Invalid document ID format'),
  expiresAt: z.string().datetime().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  maxViews: z.number().int().min(1).max(10000).optional().or(z.null()).transform(val => val === null ? undefined : val),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  restrictToEmail: z.string().email('Invalid email format').optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  canDownload: z.boolean().optional().default(false),
})

export const createEmailShareSchema = z.object({
  documentId: z.string().cuid('Invalid document ID format'),
  email: z.string().email('Invalid email format'),
  expiresAt: z.string().datetime().optional(),
  canDownload: z.boolean().optional().default(false),
  note: z.string().max(500, 'Note must be 500 characters or less').optional(),
})

export const verifyPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

export const trackViewSchema = z.object({
  duration: z.number().int().min(0).optional(),
})

export const revokeShareSchema = z.object({
  shareId: z.string().cuid('Invalid share ID format'),
})

// Type exports for use in API routes
export type CreateLinkShareInput = z.infer<typeof createLinkShareSchema>
export type CreateEmailShareInput = z.infer<typeof createEmailShareSchema>
export type VerifyPasswordInput = z.infer<typeof verifyPasswordSchema>
export type TrackViewInput = z.infer<typeof trackViewSchema>
export type RevokeShareInput = z.infer<typeof revokeShareSchema>
