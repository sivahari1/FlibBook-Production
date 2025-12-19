import { useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface ConversionTrackingData {
  documentId: string;
  conversionJobId?: string;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  status: 'started' | 'processing' | 'completed' | 'failed' | 'cancelled';
  errorType?: string;
  errorMessage?: string;
  pagesProcessed?: number;
  totalPages?: number;
  fileSizeBytes?: number;
  processingMethod?: string;
  qualityLevel?: string;
  retryCount?: number;
}

export interface DocumentLoadTrackingData {
  documentId: string;
  sessionId?: string;
  startedAt?: Date;
  firstPageLoadedAt?: Date;
  fullyLoadedAt?: Date;
  loadDurationMs?: number;
  firstPageDurationMs?: number;
  status: 'started' | 'loading' | 'completed' | 'failed';
  errorType?: string;
  errorMessage?: string;
  pagesLoaded?: number;
  totalPages?: number;
  cacheHitRate?: number;
  networkType?: string;
  deviceType?: string;
  browserInfo?: string;
  retryCount?: number;
}

export interface UserExperienceTrackingData {
  documentId: string;
  sessionId?: string;
  actionType: 'view_start' | 'page_change' | 'error_encountered' | 'retry_attempt' | 'session_end';
  actionTimestamp?: Date;
  pageNumber?: number;
  timeSpentMs?: number;
  errorType?: string;
  userAgent?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  connectionSpeed?: string;
  satisfactionScore?: number;
  feedbackText?: string;
}

export function useConversionAnalytics() {
  const { data: session } = useSession();

  const trackConversion = useCallback(async (data: ConversionTrackingData) => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/analytics/conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'conversion',
          data: {
            ...data,
            startedAt: data.startedAt || new Date(),
          },
        }),
      });

      if (!response.ok) {
        console.error('Failed to track conversion analytics:', response.statusText);
      }

      return await response.json();
    } catch (error) {
      console.error('Error tracking conversion analytics:', error);
    }
  }, [session]);

  const trackDocumentLoad = useCallback(async (data: DocumentLoadTrackingData) => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/analytics/conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'document-load',
          data: {
            ...data,
            startedAt: data.startedAt || new Date(),
            networkType: data.networkType || getNetworkType(),
            deviceType: data.deviceType || getDeviceType(),
            browserInfo: data.browserInfo || getBrowserInfo(),
          },
        }),
      });

      if (!response.ok) {
        console.error('Failed to track document load analytics:', response.statusText);
      }

      return await response.json();
    } catch (error) {
      console.error('Error tracking document load analytics:', error);
    }
  }, [session]);

  const trackUserExperience = useCallback(async (data: UserExperienceTrackingData) => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/analytics/conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'user-experience',
          data: {
            ...data,
            actionTimestamp: data.actionTimestamp || new Date(),
            userAgent: data.userAgent || navigator.userAgent,
            viewportWidth: data.viewportWidth || window.innerWidth,
            viewportHeight: data.viewportHeight || window.innerHeight,
            connectionSpeed: data.connectionSpeed || getConnectionSpeed(),
          },
        }),
      });

      if (!response.ok) {
        console.error('Failed to track user experience analytics:', response.statusText);
      }

      return await response.json();
    } catch (error) {
      console.error('Error tracking user experience analytics:', error);
    }
  }, [session]);

  const updateConversion = useCallback(async (trackingId: string, updates: Partial<ConversionTrackingData>) => {
    if (!session?.user) return;

    try {
      const response = await fetch(`/api/analytics/conversion/${trackingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        console.error('Failed to update conversion analytics:', response.statusText);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating conversion analytics:', error);
    }
  }, [session]);

  const updateDocumentLoad = useCallback(async (trackingId: string, updates: Partial<DocumentLoadTrackingData>) => {
    if (!session?.user) return;

    try {
      const response = await fetch(`/api/analytics/document-load/${trackingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        console.error('Failed to update document load analytics:', response.statusText);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating document load analytics:', error);
    }
  }, [session]);

  return {
    trackConversion,
    trackDocumentLoad,
    trackUserExperience,
    updateConversion,
    updateDocumentLoad,
  };
}

// Helper functions to gather browser/device information
function getNetworkType(): string {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return connection?.effectiveType || 'unknown';
  }
  return 'unknown';
}

function getDeviceType(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
    return 'mobile';
  } else if (/tablet|ipad/i.test(userAgent)) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

function getBrowserInfo(): string {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome')) {
    return 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    return 'Firefox';
  } else if (userAgent.includes('Safari')) {
    return 'Safari';
  } else if (userAgent.includes('Edge')) {
    return 'Edge';
  } else {
    return 'Unknown';
  }
}

function getConnectionSpeed(): string {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    const downlink = connection?.downlink;
    
    if (downlink) {
      if (downlink >= 10) return 'fast';
      if (downlink >= 1.5) return 'medium';
      return 'slow';
    }
  }
  return 'unknown';
}

// Session ID generator for tracking user sessions
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to track page view duration
export class PageViewTracker {
  private startTime: number;
  private documentId: string;
  private sessionId: string;
  private pageNumber: number;
  private trackUserExperience: (data: UserExperienceTrackingData) => Promise<any>;

  constructor(
    documentId: string,
    sessionId: string,
    pageNumber: number,
    trackUserExperience: (data: UserExperienceTrackingData) => Promise<any>
  ) {
    this.startTime = Date.now();
    this.documentId = documentId;
    this.sessionId = sessionId;
    this.pageNumber = pageNumber;
    this.trackUserExperience = trackUserExperience;
  }

  async endTracking() {
    const timeSpent = Date.now() - this.startTime;
    
    await this.trackUserExperience({
      documentId: this.documentId,
      sessionId: this.sessionId,
      actionType: 'page_change',
      pageNumber: this.pageNumber,
      timeSpentMs: timeSpent,
    });
  }
}