/**
 * Annotation Validation Schemas
 * Zod schemas for validating annotation data
 */
import { z } from 'zod';

// Media type enum
export const mediaTypeSchema = z.enum(['AUDIO', 'VIDEO'], {
  message: 'Media type must be either AUDIO or VIDEO'
});

// Visibility enum
export const visibilitySchema = z.enum(['public', 'private']).default('public');

// Create annotation schema
export const createAnnotationSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  pageNumber: z.number().int().min(1, 'Page number must be at least 1'),
  selectedText: z.string().max(5000, 'Selected text must be 5000 characters or less').optional(),
  mediaType: mediaTypeSchema,
  mediaUrl: z.string().url('Invalid media URL').optional(),
  externalUrl: z.string().url('Invalid external URL').optional(),
  visibility: visibilitySchema,
}).refine(
  (data) => data.mediaUrl || data.externalUrl,
  {
    message: 'Either mediaUrl or externalUrl must be provided',
    path: ['mediaUrl']
  }
);

// Update annotation schema
export const updateAnnotationSchema = z.object({
  selectedText: z.string().max(5000, 'Selected text must be 5000 characters or less').optional(),
  mediaUrl: z.string().url('Invalid media URL').optional(),
  externalUrl: z.string().url('Invalid external URL').optional(),
  visibility: visibilitySchema.optional(),
});

// Annotation filters schema
export const annotationFiltersSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  pageNumber: z.number().int().min(1).optional(),
  userId: z.string().optional(),
  mediaType: mediaTypeSchema.optional(),
  visibility: visibilitySchema.optional(),
});

// Media upload schema
export const mediaUploadSchema = z.object({
  file: z.any(), // File validation happens separately
  mediaType: mediaTypeSchema,
});

// External URL schema
export const externalUrlSchema = z.object({
  url: z.string().url('Invalid URL format'),
  mediaType: mediaTypeSchema,
});

// Validation helper functions
export const validateCreateAnnotation = (data: unknown) => {
  return createAnnotationSchema.safeParse(data);
};

export const validateUpdateAnnotation = (data: unknown) => {
  return updateAnnotationSchema.safeParse(data);
};

export const validateAnnotationFilters = (data: unknown) => {
  return annotationFiltersSchema.safeParse(data);
};

export const validateMediaUpload = (data: unknown) => {
  return mediaUploadSchema.safeParse(data);
};

export const validateExternalUrl = (data: unknown) => {
  return externalUrlSchema.safeParse(data);
};

// Type exports for use in API routes
export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;
export type UpdateAnnotationInput = z.infer<typeof updateAnnotationSchema>;
export type AnnotationFiltersInput = z.infer<typeof annotationFiltersSchema>;
export type MediaUploadInput = z.infer<typeof mediaUploadSchema>;
export type ExternalUrlInput = z.infer<typeof externalUrlSchema>;
