/**
 * Zod validation schemas for jstudyroom platform
 * Requirements: 18.1, 18.2 - Validate all user inputs on client and server
 */

import { z } from 'zod'

// ============================================================================
// Member Registration and Authentication
// ============================================================================

export const memberRegistrationSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must not exceed 254 characters')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .transform(val => val.trim()),
})

export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(1, 'Password is required'),
})

export const passwordResetRequestSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .transform(val => val.toLowerCase().trim()),
})

export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters'),
})

// ============================================================================
// Book Shop Management (Admin)
// ============================================================================

export const createBookShopItemSchema = z.object({
  documentId: z.string()
    .min(1, 'Document ID is required')
    .max(100, 'Document ID is too long'),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters')
    .transform(val => val.trim()),
  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional()
    .transform(val => val?.trim() || ''),
  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category must not exceed 50 characters')
    .transform(val => val.trim()),
  isFree: z.boolean(),
  price: z.number()
    .int('Price must be an integer')
    .min(0, 'Price cannot be negative')
    .max(1000000, 'Price is too high')
    .optional()
    .nullable(),
  isPublished: z.boolean().default(true),
})

export const updateBookShopItemSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters')
    .transform(val => val.trim())
    .optional(),
  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .transform(val => val?.trim() || '')
    .optional(),
  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category must not exceed 50 characters')
    .transform(val => val.trim())
    .optional(),
  isFree: z.boolean().optional(),
  price: z.number()
    .int('Price must be an integer')
    .min(0, 'Price cannot be negative')
    .max(1000000, 'Price is too high')
    .optional()
    .nullable(),
  isPublished: z.boolean().optional(),
})

export const bookShopQuerySchema = z.object({
  category: z.string()
    .max(50, 'Category is too long')
    .optional()
    .transform(val => val?.trim()),
  search: z.string()
    .max(200, 'Search query is too long')
    .optional()
    .transform(val => val?.trim()),
  page: z.number()
    .int()
    .min(1)
    .default(1)
    .optional(),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .optional(),
})

// ============================================================================
// My jstudyroom
// ============================================================================

export const addToMyJstudyroomSchema = z.object({
  bookShopItemId: z.string()
    .min(1, 'Book Shop Item ID is required')
    .max(100, 'Book Shop Item ID is too long'),
})

export const removeFromMyJstudyroomSchema = z.object({
  id: z.string()
    .min(1, 'My jstudyroom Item ID is required')
    .max(100, 'My jstudyroom Item ID is too long'),
})

// ============================================================================
// Payment
// ============================================================================

export const createPaymentOrderSchema = z.object({
  bookShopItemId: z.string()
    .min(1, 'Book Shop Item ID is required')
    .max(100, 'Book Shop Item ID is too long'),
})

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string()
    .min(1, 'Razorpay Order ID is required')
    .max(100, 'Razorpay Order ID is too long'),
  razorpayPaymentId: z.string()
    .min(1, 'Razorpay Payment ID is required')
    .max(100, 'Razorpay Payment ID is too long'),
  razorpaySignature: z.string()
    .min(1, 'Razorpay Signature is required')
    .max(200, 'Razorpay Signature is too long'),
  bookShopItemId: z.string()
    .min(1, 'Book Shop Item ID is required')
    .max(100, 'Book Shop Item ID is too long'),
})

// ============================================================================
// Member Management (Admin)
// ============================================================================

export const memberQuerySchema = z.object({
  search: z.string()
    .max(200, 'Search query is too long')
    .optional()
    .transform(val => val?.trim()),
  verified: z.enum(['true', 'false', 'all'])
    .optional()
    .default('all'),
  page: z.number()
    .int()
    .min(1)
    .default(1)
    .optional(),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .optional(),
})

export const toggleMemberActiveSchema = z.object({
  isActive: z.boolean(),
})

// ============================================================================
// Access Request (Platform User)
// ============================================================================

export const accessRequestSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must not exceed 254 characters')
    .transform(val => val.toLowerCase().trim()),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .transform(val => val.trim()),
  organization: z.string()
    .max(200, 'Organization must not exceed 200 characters')
    .optional()
    .transform(val => val?.trim() || ''),
  purpose: z.string()
    .min(10, 'Purpose must be at least 10 characters')
    .max(1000, 'Purpose must not exceed 1000 characters')
    .transform(val => val.trim()),
})

// ============================================================================
// Type Exports
// ============================================================================

export type MemberRegistrationInput = z.infer<typeof memberRegistrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetInput = z.infer<typeof passwordResetSchema>
export type CreateBookShopItemInput = z.infer<typeof createBookShopItemSchema>
export type UpdateBookShopItemInput = z.infer<typeof updateBookShopItemSchema>
export type BookShopQueryInput = z.infer<typeof bookShopQuerySchema>
export type AddToMyJstudyroomInput = z.infer<typeof addToMyJstudyroomSchema>
export type RemoveFromMyJstudyroomInput = z.infer<typeof removeFromMyJstudyroomSchema>
export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>
export type MemberQueryInput = z.infer<typeof memberQuerySchema>
export type ToggleMemberActiveInput = z.infer<typeof toggleMemberActiveSchema>
export type AccessRequestInput = z.infer<typeof accessRequestSchema>
