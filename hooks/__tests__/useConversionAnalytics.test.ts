import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConversionAnalytics, generateSessionId, PageViewTracker } from '../useConversionAnalytics';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

import { useSession } from 'next-auth/react';

const mockUseSession = useSession as any;

// Mock fetch
global.fetch = vi.fn();
const mockFetch = global.fetch as any;

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    connection: {
      effectiveType: '4g',
      downlink: 10,
    },
  },
  writable: true,
});

// Mock window
Object.defineProperty(global, 'window', {
  value: {
    innerWidth: 1920,
    innerHeight: 1080,
  },
  writable: true,
});

describe('useConversionAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({ data: null });
    });

    it('should not track conversion when user is not authenticated', async () => {
      const { result } = renderHook(() => useConversionAnalytics());

      await act(async () => {
        await result.current.trackConversion({
          documentId: 'doc-123',
          status: 'started',
        });
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not track document load when user is not authenticated', async () => {
      const { result } = renderHook(() => useConversionAnalytics());

      await act(async () => {
        await result.current.trackDocumentLoad({
          documentId: 'doc-123',
          status: 'started',
        });
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not track user experience when user is not authenticated', async () => {
      const { result } = renderHook(() => useConversionAnalytics());

      await act(async () => {
        await result.current.trackUserExperience({
          documentId: 'doc-123',
          actionType: 'view_start',
        });
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
      });
    });

    it('should track conversion analytics', async () => {
      const { result } = renderHook(() => useConversionAnalytics());

      const conversionData = {
        documentId: 'doc-123',
        conversionJobId: 'job-456',
        status: 'started' as const,
        totalPages: 10,
      };

      await act(async () => {
        await result.current.trackConversion(conversionData);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"type":"conversion"'),
      });

      // Verify the body contains the expected data
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.type).toBe('conversion');
      expect(body.data.documentId).toBe(conversionData.documentId);
      expect(body.data.conversionJobId).toBe(conversionData.conversionJobId);
      expect(body.data.status).toBe(conversionData.status);
      expect(body.data.totalPages).toBe(conversionData.totalPages);
      expect(body.data.startedAt).toBeDefined();
    });

    it('should track document load analytics with browser info', async () => {
      const { result } = renderHook(() => useConversionAnalytics());

      const loadData = {
        documentId: 'doc-123',
        sessionId: 'session-456',
        status: 'started' as const,
        totalPages: 10,
      };

      await act(async () => {
        await result.current.trackDocumentLoad(loadData);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"type":"document-load"'),
      });

      // Verify the body contains the expected data
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.type).toBe('document-load');
      expect(body.data.documentId).toBe(loadData.documentId);
      expect(body.data.sessionId).toBe(loadData.sessionId);
      expect(body.data.status).toBe(loadData.status);
      expect(body.data.totalPages).toBe(loadData.totalPages);
      expect(body.data.networkType).toBe('4g');
      expect(body.data.deviceType).toBe('desktop');
      expect(body.data.browserInfo).toBe('Chrome');
    });

    it('should track user experience analytics with viewport info', async () => {
      const { result } = renderHook(() => useConversionAnalytics());

      const uxData = {
        documentId: 'doc-123',
        sessionId: 'session-456',
        actionType: 'view_start' as const,
        pageNumber: 1,
      };

      await act(async () => {
        await result.current.trackUserExperience(uxData);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"type":"user-experience"'),
      });

      // Verify the body contains the expected data
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.type).toBe('user-experience');
      expect(body.data.documentId).toBe(uxData.documentId);
      expect(body.data.sessionId).toBe(uxData.sessionId);
      expect(body.data.actionType).toBe(uxData.actionType);
      expect(body.data.pageNumber).toBe(uxData.pageNumber);
      expect(body.data.viewportWidth).toBe(1920);
      expect(body.data.viewportHeight).toBe(1080);
      expect(body.data.connectionSpeed).toBe('fast');
    });

    it('should update conversion analytics', async () => {
      const { result } = renderHook(() => useConversionAnalytics());

      const updates = {
        status: 'completed' as const,
        completedAt: new Date(),
        durationMs: 5000,
      };

      await act(async () => {
        await result.current.updateConversion('tracking-123', updates);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/conversion/tracking-123', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
    });

    it('should update document load analytics', async () => {
      const { result } = renderHook(() => useConversionAnalytics());

      const updates = {
        status: 'completed' as const,
        fullyLoadedAt: new Date(),
        loadDurationMs: 2500,
      };

      await act(async () => {
        await result.current.updateDocumentLoad('tracking-123', updates);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/analytics/document-load/tracking-123', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useConversionAnalytics());

      await act(async () => {
        await result.current.trackConversion({
          documentId: 'doc-123',
          status: 'started',
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error tracking conversion analytics:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle non-ok responses gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useConversionAnalytics());

      await act(async () => {
        await result.current.trackConversion({
          documentId: 'doc-123',
          status: 'started',
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to track conversion analytics:', 'Bad Request');
      consoleSpy.mockRestore();
    });
  });
});

describe('generateSessionId', () => {
  it('should generate unique session IDs', () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();

    expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });
});

describe('PageViewTracker', () => {
  it('should track page view duration', async () => {
    const mockTrackUserExperience = vi.fn().mockResolvedValue({});
    
    const tracker = new PageViewTracker(
      'doc-123',
      'session-456',
      1,
      mockTrackUserExperience
    );

    // Wait a bit to simulate time spent
    await new Promise(resolve => setTimeout(resolve, 10));

    await tracker.endTracking();

    expect(mockTrackUserExperience).toHaveBeenCalledWith({
      documentId: 'doc-123',
      sessionId: 'session-456',
      actionType: 'page_change',
      pageNumber: 1,
      timeSpentMs: expect.any(Number),
    });

    const call = mockTrackUserExperience.mock.calls[0][0];
    expect(call.timeSpentMs).toBeGreaterThan(0);
  });
});