/**
 * PDF.js Network Optimizations
 * 
 * Provides network-level optimizations for PDF loading including:
 * - Request caching with Cache API
 * - Retry with exponential backoff
 * - HTTP/2 parallel request support
 * - Request deduplication
 * 
 * Requirements: 6.5 - Network optimizations for slow connections
 */

/**
 * Network Cache Options
 */
export interface NetworkCacheOptions {
  /** Cache name (default: 'pdfjs-network-cache') */
  cacheName?: string;
  
  /** Cache TTL in milliseconds (default: 1 hour) */
  cacheTTL?: number;
  
  /** Enable cache (default: true) */
  enabled?: boolean;
}

/**
 * Retry Options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  
  /** Enable retry (default: true) */
  enabled?: boolean;
}

/**
 * Fetch Options with Network Optimizations
 */
export interface OptimizedFetchOptions extends RequestInit {
  /** Cache options */
  cache?: NetworkCacheOptions;
  
  /** Retry options */
  retry?: RetryOptions;
  
  /** Progress callback */
  onProgress?: (loaded: number, total?: number) => void;
  
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Network Error Types
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * In-flight request tracker for deduplication
 */
const inFlightRequests = new Map<string, Promise<Response>>();

/**
 * Check if Cache API is available
 */
function isCacheAvailable(): boolean {
  return typeof caches !== 'undefined';
}

/**
 * Get cached response if available and valid
 * 
 * Requirements: 6.5 - Request caching
 */
async function getCachedResponse(
  url: string,
  options: NetworkCacheOptions
): Promise<Response | null> {
  if (!options.enabled || !isCacheAvailable()) {
    return null;
  }
  
  try {
    const cacheName = options.cacheName || 'pdfjs-network-cache';
    const cache = await caches.open(cacheName);
    const cached = await cache.match(url);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache entry is still valid
    const cacheTime = cached.headers.get('X-Cache-Time');
    if (cacheTime) {
      const age = Date.now() - parseInt(cacheTime, 10);
      const ttl = options.cacheTTL || 60 * 60 * 1000; // 1 hour default
      
      if (age > ttl) {
        // Cache expired, delete it
        await cache.delete(url);
        return null;
      }
    }
    
    return cached.clone();
  } catch (error) {
    console.warn('Failed to get cached response:', error);
    return null;
  }
}

/**
 * Store response in cache
 * 
 * Requirements: 6.5 - Request caching
 */
async function cacheResponse(
  url: string,
  response: Response,
  options: NetworkCacheOptions
): Promise<void> {
  if (!options.enabled || !isCacheAvailable()) {
    return;
  }
  
  try {
    const cacheName = options.cacheName || 'pdfjs-network-cache';
    const cache = await caches.open(cacheName);
    
    // Clone response and add cache timestamp
    const clonedResponse = response.clone();
    const headers = new Headers(clonedResponse.headers);
    headers.set('X-Cache-Time', Date.now().toString());
    
    const cachedResponse = new Response(clonedResponse.body, {
      status: clonedResponse.status,
      statusText: clonedResponse.statusText,
      headers,
    });
    
    await cache.put(url, cachedResponse);
  } catch (error) {
    console.warn('Failed to cache response:', error);
  }
}

/**
 * Calculate delay for exponential backoff
 * 
 * Requirements: 6.5 - Retry with exponential backoff
 */
function calculateBackoffDelay(
  attempt: number,
  options: RetryOptions
): number {
  const initialDelay = options.initialDelay || 1000;
  const maxDelay = options.maxDelay || 10000;
  const multiplier = options.backoffMultiplier || 2;
  
  const delay = initialDelay * Math.pow(multiplier, attempt);
  
  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  
  return Math.min(delay + jitter, maxDelay);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error, statusCode?: number): boolean {
  // Network errors are retryable
  if (error.name === 'TypeError' || error.message.includes('network')) {
    return true;
  }
  
  // Timeout errors are retryable
  if (error.message.includes('timeout')) {
    return true;
  }
  
  // 5xx server errors are retryable
  if (statusCode && statusCode >= 500 && statusCode < 600) {
    return true;
  }
  
  // 429 Too Many Requests is retryable
  if (statusCode === 429) {
    return true;
  }
  
  // 408 Request Timeout is retryable
  if (statusCode === 408) {
    return true;
  }
  
  return false;
}

/**
 * Perform fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout?: number
): Promise<Response> {
  if (!timeout) {
    return fetch(url, options);
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError(
        `Request timed out after ${timeout}ms`,
        'TIMEOUT'
      );
    }
    
    throw error;
  }
}

/**
 * Perform fetch with retry and exponential backoff
 * 
 * Requirements: 6.5 - Retry with exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOptions: RetryOptions,
  timeout?: number
): Promise<Response> {
  const maxRetries = retryOptions.maxRetries || 3;
  let lastError: Error | null = null;
  let lastStatusCode: number | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      
      // Check if response is successful
      if (response.ok) {
        return response;
      }
      
      // Store status code for retry decision
      lastStatusCode = response.status;
      
      // Check if we should retry based on status code
      if (attempt < maxRetries && isRetryableError(new Error('HTTP error'), response.status)) {
        const delay = calculateBackoffDelay(attempt, retryOptions);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Non-retryable error or max retries reached
      throw new NetworkError(
        `HTTP error ${response.status}: ${response.statusText}`,
        'HTTP_ERROR',
        response.status
      );
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      lastStatusCode = error instanceof NetworkError ? error.statusCode : undefined;
      
      // Check if we should retry
      if (attempt < maxRetries && isRetryableError(lastError, lastStatusCode)) {
        const delay = calculateBackoffDelay(attempt, retryOptions);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Max retries reached or non-retryable error
      throw lastError;
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError || new NetworkError('Request failed', 'UNKNOWN_ERROR');
}

/**
 * Optimized fetch with caching, retry, and progress tracking
 * 
 * This function provides comprehensive network optimizations:
 * - Request caching using Cache API
 * - Retry with exponential backoff
 * - Request deduplication
 * - Progress tracking
 * - Timeout handling
 * 
 * Requirements: 6.5 - Network optimizations
 */
export async function optimizedFetch(
  url: string,
  options: OptimizedFetchOptions = {}
): Promise<Response> {
  console.log('[optimizedFetch] Starting fetch for URL:', url);
  
  const {
    cache: cacheOptions = { enabled: true },
    retry: retryOptions = { enabled: true },
    onProgress,
    timeout,
    ...fetchOptions
  } = options;
  
  console.log('[optimizedFetch] Options:', {
    cacheEnabled: cacheOptions.enabled,
    retryEnabled: retryOptions.enabled,
    timeout,
  });
  
  // Check for in-flight request (deduplication)
  const inFlight = inFlightRequests.get(url);
  if (inFlight) {
    console.log('[optimizedFetch] Using in-flight request');
    return inFlight.then(r => r.clone());
  }
  
  // Check cache first
  console.log('[optimizedFetch] Checking cache...');
  const cached = await getCachedResponse(url, cacheOptions);
  if (cached) {
    console.log('[optimizedFetch] Using cached response');
    // Report progress as complete for cached responses
    if (onProgress) {
      const contentLength = parseInt(cached.headers.get('Content-Length') || '0', 10);
      onProgress(contentLength, contentLength);
    }
    return cached;
  }
  
  console.log('[optimizedFetch] No cache, performing fetch...');
  
  // Create fetch promise
  const fetchPromise = (async () => {
    try {
      // Perform fetch with retry if enabled
      console.log('[optimizedFetch] Fetching with retry:', retryOptions.enabled);
      const response = retryOptions.enabled
        ? await fetchWithRetry(url, fetchOptions, retryOptions, timeout)
        : await fetchWithTimeout(url, fetchOptions, timeout);
      
      console.log('[optimizedFetch] Fetch completed, status:', response.status);
      
      // Cache successful responses
      if (response.ok) {
        await cacheResponse(url, response, cacheOptions);
      }
      
      // Handle progress tracking if callback provided
      if (onProgress && response.body) {
        const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10);
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          chunks.push(value);
          loaded += value.length;
          onProgress(loaded, contentLength || undefined);
        }
        
        // Reconstruct response with collected chunks
        const blob = new Blob(chunks);
        return new Response(blob, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
      
      return response;
      
    } finally {
      // Remove from in-flight requests
      inFlightRequests.delete(url);
    }
  })();
  
  // Track in-flight request
  inFlightRequests.set(url, fetchPromise);
  
  return fetchPromise;
}

/**
 * Prefetch multiple URLs in parallel using HTTP/2
 * 
 * HTTP/2 allows multiple requests over a single connection,
 * improving performance for parallel requests.
 * 
 * Requirements: 6.5 - HTTP/2 for parallel requests
 */
export async function prefetchParallel(
  urls: string[],
  options: OptimizedFetchOptions = {}
): Promise<Map<string, Response>> {
  const results = new Map<string, Response>();
  
  // Fetch all URLs in parallel
  // Modern browsers will use HTTP/2 multiplexing automatically
  const promises = urls.map(async (url) => {
    try {
      const response = await optimizedFetch(url, options);
      results.set(url, response);
    } catch (error) {
      console.warn(`Failed to prefetch ${url}:`, error);
    }
  });
  
  await Promise.all(promises);
  
  return results;
}

/**
 * Clear network cache
 */
export async function clearNetworkCache(cacheName?: string): Promise<void> {
  if (!isCacheAvailable()) {
    return;
  }
  
  try {
    const name = cacheName || 'pdfjs-network-cache';
    await caches.delete(name);
  } catch (error) {
    console.warn('Failed to clear network cache:', error);
  }
}

/**
 * Get cache size estimate
 */
export async function getCacheSize(cacheName?: string): Promise<number> {
  if (!isCacheAvailable()) {
    return 0;
  }
  
  try {
    const name = cacheName || 'pdfjs-network-cache';
    const cache = await caches.open(name);
    const keys = await cache.keys();
    return keys.length;
  } catch (error) {
    console.warn('Failed to get cache size:', error);
    return 0;
  }
}

/**
 * Prune expired cache entries
 */
export async function pruneCache(
  cacheName?: string,
  ttl?: number
): Promise<number> {
  if (!isCacheAvailable()) {
    return 0;
  }
  
  try {
    const name = cacheName || 'pdfjs-network-cache';
    const cache = await caches.open(name);
    const keys = await cache.keys();
    const maxAge = ttl || 60 * 60 * 1000; // 1 hour default
    let pruned = 0;
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const cacheTime = response.headers.get('X-Cache-Time');
        if (cacheTime) {
          const age = Date.now() - parseInt(cacheTime, 10);
          if (age > maxAge) {
            await cache.delete(request);
            pruned++;
          }
        }
      }
    }
    
    return pruned;
  } catch (error) {
    console.warn('Failed to prune cache:', error);
    return 0;
  }
}
