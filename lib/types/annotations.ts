/**
 * Document Annotation Types
 * Defines TypeScript interfaces for the media annotation system
 */

export type MediaType = 'AUDIO' | 'VIDEO';

export type AnnotationVisibility = 'public' | 'private';

export interface DocumentAnnotation {
  id: string;
  documentId: string;
  userId: string;
  pageNumber: number;
  selectedText?: string;
  mediaType: MediaType;
  mediaUrl?: string;
  externalUrl?: string;
  visibility: AnnotationVisibility;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  user?: {
    id: string;
    name?: string;
    email: string;
  };
}

export interface CreateAnnotationData {
  documentId: string;
  pageNumber: number;
  selectedText?: string;
  mediaType: MediaType;
  mediaUrl?: string;
  externalUrl?: string;
  visibility?: AnnotationVisibility;
}

export interface UpdateAnnotationData {
  selectedText?: string;
  mediaUrl?: string;
  externalUrl?: string;
  visibility?: AnnotationVisibility;
}

export interface AnnotationFilters {
  documentId: string;
  pageNumber?: number;
  userId?: string;
  mediaType?: MediaType;
  visibility?: AnnotationVisibility;
}

// Utility functions
export const isValidMediaType = (type: string): type is MediaType => {
  return type === 'AUDIO' || type === 'VIDEO';
};

export const getMediaTypeIcon = (type: MediaType): string => {
  return type === 'AUDIO' ? '🎵' : '🎬';
};

export const formatAnnotationText = (text?: string, maxLength: number = 50): string => {
  if (!text) return 'No text selected';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};
