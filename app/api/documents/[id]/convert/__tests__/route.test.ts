/**
 * Manual Document Conversion Trigger API Tests
 * 
 * Tests for the manual conversion trigger endpoint including priority queue management,
 * user permission validation, and various conversion scenarios.
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { getServerSession } from 'next-auth';
import { getConversionJobManager } from '@/lib/services/conversion-job-manager';
import { getConversionManager } from '@/lib/services/centralized-conversion-manager';
import { db } from '@/lib/db';
import { vi } from 'vitest';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/services/conversion-job-manager');
vi.mock('@/lib/services/centralized-conversion-manager');
vi.mock('@/lib/db', () => ({
  db: {
    document: {
      findFirst: vi.fn(),
    },
    documentPage: {
      count: vi.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession as any;
const mockGetConversionJobManager = getConversionJobManager as any;
const mockGetConversionManager = getConversionManager as any;

describe('/api/documents/[id]/convert', () => {
  const mockSession = {
    user: { id: 'user-123', email: 'test@example.com' },
  };

  const mockDocument = {
    id: 'doc-123',
    title: 'Test Document',
    contentType: 'application/pdf',
    storagePath: 'documents/test.pdf',
    createdAt: new Date(),
  };

  const mockConversionManager = {
    getJobByDocumentId: vi.fn(),
    getMetrics: vi.fn(),
  };

  const mockCentralizedManager = {
    queueConversion: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConversionJobManager.mockReturnValue(mockConversionManager as any);
    mockGetConversionManager.mockReturnValue(mockCentralizedManager as any);
  });

  describe('POST /api/documents/[id]/convert', () => {
    it('should successfully queue manual conversion with default priority', async () => {
      // Setup mocks
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as any).mockResolvedValue(mockDocument);
      (db.documentPage.count as any).mockResolvedValue(0);
      mockConversionManager.getJobByDocumentId.mockResolvedValue(null);
      mockConversionManager.getMetrics.mockResolvedValue({
        queueDepth: 2,
        activeJobs: 1,
        averageProcessingTime: 45000,
      });
      mockCentralizedManager.queueConversion.mockResolvedValue({
        jobId: 'job-123',
        success: true,
      });

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.documentId).toBe('doc-123');
      expect(data.data.priority).toBe('normal');
      expect(data.data.conversionId).toBe('job-123');
      expect(mockCentralizedManager.queueConversion).toHaveBeenCalledWith({
        documentId: 'doc-123',
        memberId: 'user-123',
        priority: 'normal',
        metadata: expect.objectContaining({
          manualTrigger: true,
          force: false,
        }),
      });
    });

    it('should queue conversion with high priority when specified', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);
      (db.documentPage.count as jest.Mock).mockResolvedValue(0);
      mockConversionManager.getJobByDocumentId.mockResolvedValue(null);
      mockConversionManager.getMetrics.mockResolvedValue({
        queueDepth: 0,
        activeJobs: 0,
        averageProcessingTime: 30000,
      });
      mockCentralizedManager.queueConversion.mockResolvedValue({
        jobId: 'job-456',
        success: true,
      });

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert', {
        method: 'POST',
        body: JSON.stringify({
          priority: 'high',
          reason: 'Urgent document needed for presentation',
        }),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.priority).toBe('high');
      expect(mockCentralizedManager.queueConversion).toHaveBeenCalledWith({
        documentId: 'doc-123',
        memberId: 'user-123',
        priority: 'high',
        metadata: expect.objectContaining({
          manualTrigger: true,
          reason: 'Urgent document needed for presentation',
        }),
      });
    });

    it('should reject conversion if document already has pages and force is false', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);
      (db.documentPage.count as jest.Mock).mockResolvedValue(5);

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert', {
        method: 'POST',
        body: JSON.stringify({ priority: 'normal' }),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Document already converted');
      expect(data.existingPages).toBe(5);
      expect(data.suggestion).toContain('force": true');
    });

    it('should allow reconversion when force is true', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);
      (db.documentPage.count as jest.Mock).mockResolvedValue(5);
      mockConversionManager.getJobByDocumentId.mockResolvedValue(null);
      mockConversionManager.getMetrics.mockResolvedValue({
        queueDepth: 1,
        activeJobs: 0,
        averageProcessingTime: 60000,
      });
      mockCentralizedManager.queueConversion.mockResolvedValue({
        jobId: 'job-789',
        success: true,
      });

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert', {
        method: 'POST',
        body: JSON.stringify({
          force: true,
          reason: 'Previous conversion had issues',
        }),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.force).toBe(true);
      expect(data.message).toContain('reconversion');
      expect(mockCentralizedManager.queueConversion).toHaveBeenCalledWith({
        documentId: 'doc-123',
        memberId: 'user-123',
        priority: 'normal',
        metadata: expect.objectContaining({
          force: true,
          reason: 'Previous conversion had issues',
        }),
      });
    });

    it('should reject conversion if already in progress', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);
      mockConversionManager.getJobByDocumentId.mockResolvedValue({
        id: 'job-active',
        status: 'processing',
        progress: 45,
        estimatedCompletion: new Date(Date.now() + 30000),
      });

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Conversion already in progress');
      expect(data.jobId).toBe('job-active');
      expect(data.progress).toBe(45);
    });

    it('should reject non-PDF documents', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockResolvedValue({
        ...mockDocument,
        contentType: 'image/jpeg',
      });

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Document type not supported for conversion');
      expect(data.documentType).toBe('image/jpeg');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 404 for non-existent or inaccessible documents', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Document not found or access denied');
    });

    it('should validate request body and return 400 for invalid data', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert', {
        method: 'POST',
        body: JSON.stringify({
          priority: 'invalid-priority',
          force: 'not-a-boolean',
        }),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'priority',
            message: expect.stringContaining('Invalid enum value'),
          }),
        ])
      );
    });
  });

  describe('GET /api/documents/[id]/convert', () => {
    it('should return conversion options for convertible document', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);
      (db.documentPage.count as jest.Mock).mockResolvedValue(0);
      mockConversionManager.getJobByDocumentId.mockResolvedValue(null);
      mockConversionManager.getMetrics.mockResolvedValue({
        queueDepth: 3,
        activeJobs: 2,
        averageProcessingTime: 40000,
      });

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert');
      const response = await GET(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.convertible).toBe(true);
      expect(data.data.hasPages).toBe(false);
      expect(data.data.options.availablePriorities).toEqual(['high', 'normal', 'low']);
      expect(data.data.options.recommendedPriority).toBe('high');
      expect(data.data.queue.depth).toBe(3);
    });

    it('should return conversion options for document with existing pages', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);
      (db.documentPage.count as jest.Mock).mockResolvedValue(8);
      mockConversionManager.getJobByDocumentId.mockResolvedValue(null);
      mockConversionManager.getMetrics.mockResolvedValue({
        queueDepth: 1,
        activeJobs: 1,
        averageProcessingTime: 35000,
      });

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert');
      const response = await GET(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.hasPages).toBe(true);
      expect(data.data.existingPages).toBe(8);
      expect(data.data.options.canForceReconvert).toBe(true);
      expect(data.data.options.recommendedPriority).toBe('normal');
    });

    it('should include current conversion status if in progress', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);
      (db.documentPage.count as jest.Mock).mockResolvedValue(0);
      mockConversionManager.getJobByDocumentId.mockResolvedValue({
        id: 'job-current',
        status: 'processing',
        progress: 75,
        estimatedCompletion: new Date(Date.now() + 15000),
        startedAt: new Date(Date.now() - 45000),
      });
      mockConversionManager.getMetrics.mockResolvedValue({
        queueDepth: 0,
        activeJobs: 1,
        averageProcessingTime: 50000,
      });

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert');
      const response = await GET(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.currentConversion).toEqual({
        jobId: 'job-current',
        status: 'processing',
        progress: 75,
        estimatedCompletion: expect.any(String),
        startedAt: expect.any(String),
      });
    });

    it('should indicate non-convertible documents', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockResolvedValue({
        ...mockDocument,
        contentType: 'text/plain',
      });
      (db.documentPage.count as jest.Mock).mockResolvedValue(0);
      mockConversionManager.getJobByDocumentId.mockResolvedValue(null);
      mockConversionManager.getMetrics.mockResolvedValue({
        queueDepth: 0,
        activeJobs: 0,
        averageProcessingTime: 30000,
      });

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert');
      const response = await GET(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.convertible).toBe(false);
      expect(data.data.contentType).toBe('text/plain');
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert');
      const response = await GET(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 404 for non-existent documents', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert');
      const response = await GET(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Document not found or access denied');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to trigger manual conversion');
      expect(data.message).toBe('Database connection failed');
    });

    it('should handle conversion manager errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);
      (db.documentPage.count as jest.Mock).mockResolvedValue(0);
      mockConversionManager.getJobByDocumentId.mockResolvedValue(null);
      mockConversionManager.getMetrics.mockResolvedValue({
        queueDepth: 0,
        activeJobs: 0,
        averageProcessingTime: 30000,
      });
      mockCentralizedManager.queueConversion.mockRejectedValue(new Error('Queue is full'));

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to trigger manual conversion');
      expect(data.message).toBe('Queue is full');
    });

    it('should handle malformed JSON in request body', async () => {
      mockGetServerSession.mockResolvedValue(mockSession as any);
      (db.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);

      const request = new NextRequest('http://localhost/api/documents/doc-123/convert', {
        method: 'POST',
        body: 'invalid-json',
      });

      const response = await POST(request, { params: { id: 'doc-123' } });

      // Should still work because we catch JSON parsing errors and default to empty object
      expect(response.status).not.toBe(500);
    });
  });
});