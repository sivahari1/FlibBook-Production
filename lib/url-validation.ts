/**
 * URL Validation and Fallback Mechanisms
 * 
 * This module provides comprehensive URL validation and fallback strategies
 * for document viewing in JStudyRoom. It addresses task 8.2 requirements:
 * - Validate URLs before passing to PDF viewer components
 * - Implement fallback URL generation strategies
 * - Add comprehensive error messages for URL failures
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

import { getSignedUrl, getBucketForContentType } from './storage';
import { ContentType } from './types/content';

export interface URLValidationResult {
  isValid: boolean;
  url?: string;
  error?: string;
  fallbackUsed?: boolean;
  fallbackStrategy?: string;
}

export interface URLValidationOptions {
  timeout?: number; // Timeout for URL validation in milliseconds
  allowRedirects?: boolean; // Whether to follow redirects
  maxRetries?: number; // Maximum number of retry attempts
  fallbackStrategies?: FallbackStrategy[]; // Custom fallback strategies
}

export interface FallbackStrategy {
  name: string;
  priority: number; // Lower numbers = higher priority
  canHandle: (error: Error, context: URLValidationContext) => boolean;
  execute: (context: URLValidationContext) => Promise<URLValidationResult>;
}

export interface URLValidationContext {
  originalUrl: string;
  documentId: string;
  storagePath?: string;
  contentType?: ContentType;
  userId?: string;
  retryCount: number;
  maxRetries: number;
  lastError?: Error;
}

/**
 * Validate if a URL is accessible and returns valid content
 */
export async function validateURL(
  url: string,
  options: URLValidationOptions = {}
): Promise<URLValidationResult> {
  const {
    timeout = 10000,
    allowRedirects = true,
    maxRetries = 3
  } = options;

  // Basic URL format validation
  try {
    new URL(url);
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format: URL cannot be parsed'
    };
  }

  // Check for common invalid URL patterns
  if (url.includes('undefined') || url.includes('null') || url.includes('{{')) {
    return {
      isValid: false,
      error: 'Invalid URL: Contains placeholder or undefined values'
    };
  }

  // Validate URL accessibility
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'HEAD', // Use HEAD to avoid downloading content
        signal: controller.signal,
        redirect: allowRedirects ? 'follow' : 'manual',
        headers: {
          'User-Agent': 'JStudyRoom-URLValidator/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          isValid: true,
          url: response.url // May be different if redirected
        };
      } else if (response.status === 404) {
        return {
          isValid: false,
          error: `URL not found (404): The document may have been moved or deleted`
        };
      } else if (response.status === 403) {
        return {
          isValid: false,
          error: `Access denied (403): The URL may have expired or you don't have permission`
        };
      } else if (response.status >= 500) {
        // Server errors might be temporary, continue retrying
        if (attempt === maxRetries) {
          return {
            isValid: false,
            error: `Server error (${response.status}): The storage service is temporarily unavailable`
          };
        }
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      } else {
        return {
          isValid: false,
          error: `HTTP error (${response.status}): ${response.statusText}`
        };
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          if (attempt === maxRetries) {
            return {
              isValid: false,
              error: `URL validation timeout: The URL took too long to respond (>${timeout}ms)`
            };
          }
        } else if (error.message.includes('fetch')) {
          if (attempt === maxRetries) {
            return {
              isValid: false,
              error: `Network error: Unable to reach the URL (${error.message})`
            };
          }
        } else {
          if (attempt === maxRetries) {
            return {
              isValid: false,
              error: `Validation error: ${error.message}`
            };
          }
        }
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return {
    isValid: false,
    error: 'URL validation failed after maximum retries'
  };
}

/**
 * Default fallback strategies for URL generation
 */
export const DEFAULT_FALLBACK_STRATEGIES: FallbackStrategy[] = [
  {
    name: 'regenerate-signed-url',
    priority: 1,
    canHandle: (error: Error, context: URLValidationContext) => {
      const message = error.message.toLowerCase();
      return (
        message.includes('expired') ||
        message.includes('403') ||
        message.includes('unauthorized') ||
        message.includes('access denied')
      ) && !!context.storagePath;
    },
    execute: async (context: URLValidationContext): Promise<URLValidationResult> => {
      if (!context.storagePath) {
        return {
          isValid: false,
          error: 'Cannot regenerate signed URL: No storage path available'
        };
      }

      try {
        const contentType = context.contentType || ContentType.PDF;
        const bucketName = getBucketForContentType(contentType);
        
        const { url, error } = await getSignedUrl(
          context.storagePath,
          3600, // 1 hour expiry
          bucketName,
          { download: false }
        );

        if (error || !url) {
          return {
            isValid: false,
            error: `Failed to regenerate signed URL: ${error || 'No URL returned'}`
          };
        }

        // Validate the new URL
        const validation = await validateURL(url, { maxRetries: 1 });
        
        return {
          isValid: validation.isValid,
          url: validation.isValid ? url : undefined,
          error: validation.error,
          fallbackUsed: true,
          fallbackStrategy: 'regenerate-signed-url'
        };
      } catch (error) {
        return {
          isValid: false,
          error: `Signed URL regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  },
  {
    name: 'alternative-bucket',
    priority: 2,
    canHandle: (error: Error, context: URLValidationContext) => {
      const message = error.message.toLowerCase();
      return (
        message.includes('not found') ||
        message.includes('404')
      ) && !!context.storagePath;
    },
    execute: async (context: URLValidationContext): Promise<URLValidationResult> => {
      if (!context.storagePath) {
        return {
          isValid: false,
          error: 'Cannot try alternative bucket: No storage path available'
        };
      }

      try {
        // Try different bucket names in case the document was moved
        const alternativeBuckets = ['documents', 'pdfs', 'files'];
        
        for (const bucketName of alternativeBuckets) {
          const { url, error } = await getSignedUrl(
            context.storagePath,
            3600,
            bucketName,
            { download: false }
          );

          if (!error && url) {
            const validation = await validateURL(url, { maxRetries: 1 });
            if (validation.isValid) {
              return {
                isValid: true,
                url,
                fallbackUsed: true,
                fallbackStrategy: `alternative-bucket-${bucketName}`
              };
            }
          }
        }

        return {
          isValid: false,
          error: 'Document not found in any available storage bucket'
        };
      } catch (error) {
        return {
          isValid: false,
          error: `Alternative bucket search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  },
  {
    name: 'direct-storage-path',
    priority: 3,
    canHandle: (error: Error, context: URLValidationContext) => {
      return !!context.storagePath && context.retryCount < 2;
    },
    execute: async (context: URLValidationContext): Promise<URLValidationResult> => {
      if (!context.storagePath) {
        return {
          isValid: false,
          error: 'Cannot use direct storage path: No storage path available'
        };
      }

      try {
        // Construct direct storage URL (for public buckets)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
          return {
            isValid: false,
            error: 'Cannot construct direct URL: Supabase URL not configured'
          };
        }

        const directUrl = `${supabaseUrl}/storage/v1/object/public/documents/${context.storagePath}`;
        
        const validation = await validateURL(directUrl, { maxRetries: 1 });
        
        return {
          isValid: validation.isValid,
          url: validation.isValid ? directUrl : undefined,
          error: validation.error,
          fallbackUsed: validation.isValid,
          fallbackStrategy: 'direct-storage-path'
        };
      } catch (error) {
        return {
          isValid: false,
          error: `Direct storage path failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  }
];

/**
 * Validate URL with comprehensive fallback mechanisms
 */
export async function validateURLWithFallbacks(
  url: string,
  context: Partial<URLValidationContext>,
  options: URLValidationOptions = {}
): Promise<URLValidationResult> {
  const {
    maxRetries = 3,
    fallbackStrategies = DEFAULT_FALLBACK_STRATEGIES
  } = options;

  const validationContext: URLValidationContext = {
    originalUrl: url,
    documentId: context.documentId || 'unknown',
    storagePath: context.storagePath,
    contentType: context.contentType,
    userId: context.userId,
    retryCount: context.retryCount || 0,
    maxRetries,
    lastError: context.lastError
  };

  // First, try to validate the original URL
  const initialValidation = await validateURL(url, options);
  
  if (initialValidation.isValid) {
    return initialValidation;
  }

  // If validation failed, try fallback strategies
  const error = new Error(initialValidation.error || 'URL validation failed');
  validationContext.lastError = error;

  // Sort strategies by priority (lower number = higher priority)
  const sortedStrategies = [...fallbackStrategies].sort((a, b) => a.priority - b.priority);

  for (const strategy of sortedStrategies) {
    if (strategy.canHandle(error, validationContext)) {
      console.log(`[URL Validation] Trying fallback strategy: ${strategy.name}`);
      
      try {
        const result = await strategy.execute(validationContext);
        
        if (result.isValid) {
          console.log(`[URL Validation] Fallback strategy '${strategy.name}' succeeded`);
          return result;
        } else {
          console.log(`[URL Validation] Fallback strategy '${strategy.name}' failed: ${result.error}`);
        }
      } catch (strategyError) {
        console.error(`[URL Validation] Fallback strategy '${strategy.name}' threw error:`, strategyError);
      }
    }
  }

  // All fallback strategies failed
  return {
    isValid: false,
    error: `URL validation failed: ${initialValidation.error}. All fallback strategies exhausted.`,
    fallbackUsed: false
  };
}

/**
 * Validate multiple URLs and return the first valid one
 */
export async function validateFirstValidURL(
  urls: string[],
  context: Partial<URLValidationContext>,
  options: URLValidationOptions = {}
): Promise<URLValidationResult> {
  if (urls.length === 0) {
    return {
      isValid: false,
      error: 'No URLs provided for validation'
    };
  }

  const errors: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[URL Validation] Validating URL ${i + 1}/${urls.length}: ${url.substring(0, 100)}...`);
    
    const result = await validateURLWithFallbacks(url, context, options);
    
    if (result.isValid) {
      return {
        ...result,
        fallbackUsed: i > 0 || result.fallbackUsed,
        fallbackStrategy: i > 0 ? `alternative-url-${i}` : result.fallbackStrategy
      };
    }
    
    errors.push(`URL ${i + 1}: ${result.error}`);
  }

  return {
    isValid: false,
    error: `All URLs failed validation:\n${errors.join('\n')}`
  };
}

/**
 * Get user-friendly error message for URL validation failures
 */
export function getUserFriendlyURLError(result: URLValidationResult): string {
  if (result.isValid) {
    return '';
  }

  const error = result.error || 'Unknown URL error';

  if (error.includes('Invalid URL format')) {
    return 'The document link is corrupted. Please try refreshing the page or contact support.';
  } else if (error.includes('expired') || error.includes('403')) {
    return 'The document access link has expired. We\'re generating a new one...';
  } else if (error.includes('404') || error.includes('not found')) {
    return 'The document file could not be found. It may have been moved or deleted.';
  } else if (error.includes('timeout')) {
    return 'The document is taking too long to load. Please check your internet connection and try again.';
  } else if (error.includes('Network error')) {
    return 'Unable to connect to the document storage. Please check your internet connection.';
  } else if (error.includes('Server error')) {
    return 'The document storage service is temporarily unavailable. Please try again in a few minutes.';
  } else {
    return 'Unable to access the document. Please try refreshing the page or contact support if the problem persists.';
  }
}