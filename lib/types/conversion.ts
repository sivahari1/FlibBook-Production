export interface ConversionJob {
  id: string;
  documentId: string;
  memberId: string;
  status: ConversionStatus;
  progress: number;
  stage?: ConversionStage;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount?: number;
  priority: ConversionPriority;
  estimatedCompletion?: Date;
  totalPages?: number;
  processedPages?: number;
  resultData?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversionJobData {
  documentId: string;
  memberId: string;
  priority: ConversionPriority;
  metadata?: Record<string, any>;
}

export type ConversionStatus = 
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export enum ConversionJobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ConversionJobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

export type ConversionStage = 
  | 'queued'
  | 'initializing'
  | 'extracting_pages'
  | 'processing_pages'
  | 'uploading_pages'
  | 'finalizing'
  | 'completed'
  | 'failed';

export type ConversionPriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent';

export interface ConversionProgress {
  documentId: string;
  status: ConversionStatus;
  stage: ConversionStage;
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
  totalPages?: number;
  processedPages: number;
  retryCount: number;
}

export interface ConversionResult {
  success: boolean;
  documentId: string;
  totalPages?: number;
  processingTime?: number;
  error?: string;
}

export interface ConversionOptions {
  priority?: ConversionPriority;
  forceReconvert?: boolean;
  quality?: 'low' | 'medium' | 'high';
  maxRetries?: number;
}

export interface ConversionMetrics {
  averageProcessingTime: number;
  successRate: number;
  queueDepth: number;
  activeJobs: number;
  failureRate: number;
}

export interface RetryStrategy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

export const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
};

export const CONVERSION_STAGE_MESSAGES: Record<ConversionStage, string> = {
  queued: 'Waiting in queue...',
  initializing: 'Preparing document for conversion...',
  extracting_pages: 'Extracting pages from document...',
  processing_pages: 'Processing document pages...',
  uploading_pages: 'Uploading processed pages...',
  finalizing: 'Finalizing conversion...',
  completed: 'Conversion completed successfully',
  failed: 'Conversion failed',
};

export const CONVERSION_STAGE_PROGRESS: Record<ConversionStage, number> = {
  queued: 0,
  initializing: 10,
  extracting_pages: 25,
  processing_pages: 60,
  uploading_pages: 85,
  finalizing: 95,
  completed: 100,
  failed: 0,
};