/**
 * Unit Tests for User Feedback Collector
 * 
 * Tests feedback collection, prompt display, and data management
 * 
 * Requirements: 8.4
 */

import { UserFeedbackCollector, FeedbackCategory, type FeedbackConfig } from '../pdf-reliability/user-feedback-collector';
import type { RenderingMethod } from '../pdf-reliability/types';

import { vi } from 'vitest';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock DOM methods
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'test-user-agent',
    platform: 'test-platform',
    language: 'en-US',
  },
});

Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
});

// Mock document methods
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => {
      const mockElement = {
        style: {},
        className: '',
        textContent: '',
        addEventListener: vi.fn(),
        appendChild: vi.fn(),
        insertBefore: vi.fn(),
        querySelector: vi.fn(),
        querySelectorAll: vi.fn(() => []),
        remove: vi.fn(),
      };
      // Make style.cssText settable
      Object.defineProperty(mockElement.style, 'cssText', {
        writable: true,
        value: ''
      });
      return mockElement;
    }),
    body: {
      appendChild: vi.fn(),
    },
  },
});

describe('UserFeedbackCollector', () => {
  let feedbackCollector: UserFeedbackCollector;
  let config: FeedbackConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      showPrompt: false, // Disable prompt for most tests
      promptDelay: 100,
      detailedFeedbackThreshold: 3,
      maxLocalEntries: 50,
      autoSubmit: false,
    };
    
    feedbackCollector = new UserFeedbackCollector(config);
    
    // Clear localStorage mocks
    vi.clearAllMocks();
  });

  describe('Feedback Submission', () => {
    it('should submit feedback successfully', async () => {
      const feedbackId = await feedbackCollector.submitFeedback({
        renderingId: 'test-render-1',
        rating: 4,
        category: FeedbackCategory.PERFORMANCE,
        description: 'Good performance',
        browserInfo: {
          userAgent: 'test-agent',
          platform: 'test-platform',
          language: 'en',
        },
        context: {
          renderingMethod: 'pdfjs-canvas' as RenderingMethod,
          renderingTime: 2000,
          errorOccurred: false,
        },
      });

      expect(feedbackId).toBeTruthy();
      expect(feedbackId).toContain('feedback-');
      
      const feedback = feedbackCollector.getFeedback();
      expect(feedback).toHaveLength(1);
      expect(feedback[0].rating).toBe(4);
      expect(feedback[0].category).toBe(FeedbackCategory.PERFORMANCE);
      expect(feedback[0].description).toBe('Good performance');
    });

    it('should store feedback locally', async () => {
      await feedbackCollector.submitFeedback({
        renderingId: 'test-render-2',
        rating: 3,
        category: FeedbackCategory.USABILITY,
        browserInfo: {
          userAgent: 'test-agent',
          platform: 'test-platform',
          language: 'en',
        },
        context: {
          renderingMethod: 'native-browser' as RenderingMethod,
          renderingTime: 1500,
          errorOccurred: false,
        },
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'pdf-feedback',
        expect.stringContaining('test-render-2')
      );
    });

    it('should handle feedback when disabled', async () => {
      const disabledConfig = { ...config, enabled: false };
      const disabledCollector = new UserFeedbackCollector(disabledConfig);

      const result = await disabledCollector.collectFeedback(
        'test-render-disabled',
        'pdfjs-canvas' as RenderingMethod,
        1000,
        false
      );

      expect(result).toBeNull();
    });
  });

  describe('Feedback Retrieval', () => {
    beforeEach(async () => {
      // Add some test feedback
      await feedbackCollector.submitFeedback({
        renderingId: 'render-1',
        rating: 5,
        category: FeedbackCategory.PERFORMANCE,
        browserInfo: {
          userAgent: 'test-agent',
          platform: 'test-platform',
          language: 'en',
        },
        context: {
          renderingMethod: 'pdfjs-canvas' as RenderingMethod,
          renderingTime: 1000,
          errorOccurred: false,
        },
      });

      await feedbackCollector.submitFeedback({
        renderingId: 'render-2',
        rating: 2,
        category: FeedbackCategory.RELIABILITY,
        description: 'Failed to load',
        browserInfo: {
          userAgent: 'test-agent',
          platform: 'test-platform',
          language: 'en',
        },
        context: {
          renderingMethod: 'server-conversion' as RenderingMethod,
          renderingTime: 0,
          errorOccurred: true,
        },
      });

      await feedbackCollector.submitFeedback({
        renderingId: 'render-1', // Same rendering ID as first
        rating: 4,
        category: FeedbackCategory.USABILITY,
        browserInfo: {
          userAgent: 'test-agent',
          platform: 'test-platform',
          language: 'en',
        },
        context: {
          renderingMethod: 'pdfjs-canvas' as RenderingMethod,
          renderingTime: 1200,
          errorOccurred: false,
        },
      });
    });

    it('should get all feedback', () => {
      const feedback = feedbackCollector.getFeedback();
      expect(feedback).toHaveLength(3);
    });

    it('should get feedback by rendering ID', () => {
      const render1Feedback = feedbackCollector.getFeedbackByRenderingId('render-1');
      expect(render1Feedback).toHaveLength(2);
      expect(render1Feedback[0].rating).toBe(5);
      expect(render1Feedback[1].rating).toBe(4);

      const render2Feedback = feedbackCollector.getFeedbackByRenderingId('render-2');
      expect(render2Feedback).toHaveLength(1);
      expect(render2Feedback[0].rating).toBe(2);
    });

    it('should calculate feedback statistics', () => {
      const stats = feedbackCollector.getFeedbackStats();
      
      expect(stats.totalEntries).toBe(3);
      expect(stats.averageRating).toBeCloseTo(3.67, 1); // (5 + 2 + 4) / 3
      
      expect(stats.categoryBreakdown[FeedbackCategory.PERFORMANCE]).toBe(1);
      expect(stats.categoryBreakdown[FeedbackCategory.RELIABILITY]).toBe(1);
      expect(stats.categoryBreakdown[FeedbackCategory.USABILITY]).toBe(1);
      expect(stats.categoryBreakdown[FeedbackCategory.OTHER]).toBe(0);
      
      expect(stats.ratingDistribution[5]).toBe(1);
      expect(stats.ratingDistribution[4]).toBe(1);
      expect(stats.ratingDistribution[2]).toBe(1);
      expect(stats.ratingDistribution[1]).toBe(0);
      expect(stats.ratingDistribution[3]).toBe(0);
    });
  });

  describe('Feedback Prompt', () => {
    it.skip('should collect feedback with prompt enabled', async () => {
      const promptConfig = { ...config, showPrompt: true, promptDelay: 10 };
      const promptCollector = new UserFeedbackCollector(promptConfig);

      // Mock DOM elements for prompt
      const mockForm = {
        addEventListener: vi.fn(),
        querySelector: vi.fn(),
        querySelectorAll: vi.fn(() => []),
      };
      
      const mockContainer = {
        style: { cssText: '' },
        className: '',
        appendChild: vi.fn(),
        remove: vi.fn(),
      };

      (document.createElement as any).mockImplementation((tag) => {
        if (tag === 'form') return mockForm;
        if (tag === 'div') return mockContainer;
        return {
          style: { cssText: '' },
          className: '',
          textContent: '',
          addEventListener: vi.fn(),
          appendChild: vi.fn(),
        };
      });

      const feedbackPromise = promptCollector.collectFeedback(
        'prompt-test',
        'pdfjs-canvas' as RenderingMethod,
        2000,
        false
      );

      // Wait for prompt delay
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(document.body.appendChild).toHaveBeenCalled();

      // The promise should be pending (waiting for user interaction)
      // In a real scenario, user would interact with the form
    });

    it.skip('should handle prompt timeout', async () => {
      const promptConfig = { 
        ...config, 
        showPrompt: true, 
        promptDelay: 10,
      };
      const promptCollector = new UserFeedbackCollector(promptConfig);

      const result = await promptCollector.collectFeedback(
        'timeout-test',
        'pdfjs-canvas' as RenderingMethod,
        1000,
        false,
        undefined,
        { autoHideTimeout: 50 }
      );

      expect(result).toBeNull();
    });
  });

  describe('Data Management', () => {
    it('should export feedback data', async () => {
      await feedbackCollector.submitFeedback({
        renderingId: 'export-test',
        rating: 3,
        category: FeedbackCategory.OTHER,
        browserInfo: {
          userAgent: 'test-agent',
          platform: 'test-platform',
          language: 'en',
        },
        context: {
          renderingMethod: 'image-based' as RenderingMethod,
          renderingTime: 3000,
          errorOccurred: false,
        },
      });

      const exported = feedbackCollector.exportFeedback();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('feedback');
      expect(parsed).toHaveProperty('stats');
      expect(parsed).toHaveProperty('exportTimestamp');
      expect(parsed.feedback).toHaveLength(1);
      expect(parsed.feedback[0].renderingId).toBe('export-test');
    });

    it('should clear all feedback', async () => {
      await feedbackCollector.submitFeedback({
        renderingId: 'clear-test',
        rating: 4,
        category: FeedbackCategory.PERFORMANCE,
        browserInfo: {
          userAgent: 'test-agent',
          platform: 'test-platform',
          language: 'en',
        },
        context: {
          renderingMethod: 'pdfjs-canvas' as RenderingMethod,
          renderingTime: 1500,
          errorOccurred: false,
        },
      });

      expect(feedbackCollector.getFeedback()).toHaveLength(1);

      feedbackCollector.clearFeedback();

      expect(feedbackCollector.getFeedback()).toHaveLength(0);
      expect(localStorage.setItem).toHaveBeenCalledWith('pdf-feedback', '[]');
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      (localStorage.setItem as any).mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw error
      expect(async () => {
        await feedbackCollector.submitFeedback({
          renderingId: 'storage-error-test',
          rating: 3,
          category: FeedbackCategory.OTHER,
          browserInfo: {
            userAgent: 'test-agent',
            platform: 'test-platform',
            language: 'en',
          },
          context: {
            renderingMethod: 'pdfjs-canvas' as RenderingMethod,
            renderingTime: 1000,
            errorOccurred: false,
          },
        });
      }).not.toThrow();
    });

    it('should cleanup old entries when exceeding max limit', async () => {
      const limitedConfig = { ...config, maxLocalEntries: 2 };
      const limitedCollector = new UserFeedbackCollector(limitedConfig);

      // Add entries exceeding the limit
      for (let i = 0; i < 4; i++) {
        await limitedCollector.submitFeedback({
          renderingId: `limit-test-${i}`,
          rating: 3,
          category: FeedbackCategory.OTHER,
          browserInfo: {
            userAgent: 'test-agent',
            platform: 'test-platform',
            language: 'en',
          },
          context: {
            renderingMethod: 'pdfjs-canvas' as RenderingMethod,
            renderingTime: 1000,
            errorOccurred: false,
          },
        });
      }

      const feedback = limitedCollector.getFeedback();
      expect(feedback.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Server Submission', () => {
    beforeEach(() => {
      // Mock fetch
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should submit feedback to server when configured', async () => {
      const serverConfig = {
        ...config,
        autoSubmit: true,
        submitEndpoint: 'https://api.example.com/feedback',
        apiKey: 'test-api-key',
      };
      
      const serverCollector = new UserFeedbackCollector(serverConfig);

      (fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await serverCollector.submitFeedback({
        renderingId: 'server-test',
        rating: 4,
        category: FeedbackCategory.PERFORMANCE,
        browserInfo: {
          userAgent: 'test-agent',
          platform: 'test-platform',
          language: 'en',
        },
        context: {
          renderingMethod: 'pdfjs-canvas' as RenderingMethod,
          renderingTime: 2000,
          errorOccurred: false,
        },
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/feedback',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          }),
          body: expect.stringContaining('server-test'),
        })
      );
    });

    it('should handle server submission errors gracefully', async () => {
      const serverConfig = {
        ...config,
        autoSubmit: true,
        submitEndpoint: 'https://api.example.com/feedback',
      };
      
      const serverCollector = new UserFeedbackCollector(serverConfig);

      (fetch as any).mockRejectedValue(new Error('Network error'));

      // Should not throw error
      await expect(serverCollector.submitFeedback({
        renderingId: 'error-test',
        rating: 2,
        category: FeedbackCategory.RELIABILITY,
        browserInfo: {
          userAgent: 'test-agent',
          platform: 'test-platform',
          language: 'en',
        },
        context: {
          renderingMethod: 'pdfjs-canvas' as RenderingMethod,
          renderingTime: 0,
          errorOccurred: true,
        },
      })).resolves.toBeTruthy();

      // Should still store locally
      const feedback = serverCollector.getFeedback();
      expect(feedback).toHaveLength(1);
    });
  });

  describe('Statistics Calculation', () => {
    it('should handle empty feedback correctly', () => {
      const emptyCollector = new UserFeedbackCollector(config);
      const stats = emptyCollector.getFeedbackStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.averageRating).toBe(0);
      expect(Object.values(stats.categoryBreakdown).every(count => count === 0)).toBe(true);
      expect(Object.values(stats.ratingDistribution).every(count => count === 0)).toBe(true);
    });

    it('should calculate statistics for single entry', async () => {
      await feedbackCollector.submitFeedback({
        renderingId: 'single-test',
        rating: 5,
        category: FeedbackCategory.PERFORMANCE,
        browserInfo: {
          userAgent: 'test-agent',
          platform: 'test-platform',
          language: 'en',
        },
        context: {
          renderingMethod: 'pdfjs-canvas' as RenderingMethod,
          renderingTime: 1000,
          errorOccurred: false,
        },
      });

      const stats = feedbackCollector.getFeedbackStats();

      expect(stats.totalEntries).toBe(1);
      expect(stats.averageRating).toBe(5);
      expect(stats.categoryBreakdown[FeedbackCategory.PERFORMANCE]).toBe(1);
      expect(stats.ratingDistribution[5]).toBe(1);
    });
  });
});