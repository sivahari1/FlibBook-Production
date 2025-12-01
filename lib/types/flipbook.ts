export interface FlipbookPage {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
  size: number;
}

export interface FlipbookConversion {
  documentId: string;
  totalPages: number;
  pages: FlipbookPage[];
  conversionOptions?: ConversionOptions;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionOptions {
  quality?: number;
  density?: number;
  format?: 'jpeg' | 'png' | 'webp';
  width?: number;
  height?: number;
}

export interface ConversionResult {
  success: boolean;
  pages: FlipbookPage[];
  totalPages: number;
  error?: string;
}

export interface FlipBookViewerProps {
  documentId: string;
  pages: FlipbookPage[];
  watermarkText?: string;
  userEmail: string;
  allowTextSelection?: boolean;
  onPageChange?: (page: number) => void;
  className?: string;
}
