/**
 * Zod validation schemas for Secure Sharing & Inbox feature
 */

import { z } from 'zod'

export const createLinkShareSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  expiresAt: z.union([
    z.string().datetime({ message: 'Invalid date format' }),
    z.literal(''),
    z.undefined()
  ]).optional().transform(val => !val || val === '' ? undefined : val),
  maxViews: z.union([
    z.number().int().min(1).max(10000),
    z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)),
    z.null(),
    z.undefined()
  ]).optional().transform(val => val === null || val === undefined ? undefined : val),
  password: z.union([
    z.string().min(8, 'Password must be at least 8 characters').max(100),
    z.literal(''),
    z.undefined()
  ]).optional().transform(val => !val || val === '' ? undefined : val),
  restrictToEmail: z.union([
    z.string().email('Invalid email format'),
    z.literal(''),
    z.undefined()
  ]).optional().transform(val => !val || val === '' ? undefined : val),
  canDownload: z.boolean().optional().default(false),
})

export const createEmailShareSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  email: z.string().email('Invalid email format'),
  expiresAt: z.union([
    z.string().datetime({ message: 'Invalid date format' }),
    z.literal(''),
    z.undefined()
  ]).optional().transform(val => !val || val === '' ? undefined : val),
  canDownload: z.boolean().optional().default(false),
  note: z.union([
    z.string().max(500, 'Note must be 500 characters or less'),
    z.literal(''),
    z.undefined()
  ]).optional().transform(val => !val || val === '' ? undefined : val),
})

export const verifyPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

export const trackViewSchema = z.object({
  duration: z.number().int().min(0).optional(),
})

export const revokeShareSchema = z.object({
  shareId: z.string().min(1, 'Share ID is required'),
})

// Type exports for use in API routes
export type CreateLinkShareInput = z.infer<typeof createLinkShareSchema>
export type CreateEmailShareInput = z.infer<typeof createEmailShareSchema>
export type VerifyPasswordInput = z.infer<typeof verifyPasswordSchema>
export type TrackViewInput = z.infer<typeof trackViewSchema>
export type RevokeShareInput = z.infer<typeof revokeShareSchema>
