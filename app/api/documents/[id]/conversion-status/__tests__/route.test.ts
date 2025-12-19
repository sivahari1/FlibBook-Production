import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/db', () => ({
  default: {
    document: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/conversion-job-manager', () => ({
  getConversionJobManager: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { getConversionJobManager } from '@/lib/services/conversion-job-manager';

const mockGetServerSession = getServerSession as any;
const mockDb = db as any;
const mockGetConversionJobManager = getConversionJobManager as any;

describe('/api/documents/[id]/conversion-status', () => {
  const mockConversionManager = {
    getProgress: vi.fn(),
    createJob: vi.fn(),
    retryJob: vi.fn(),
    getActiveJob: vi.fn(),
    cancelJob: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConversionJobManager.mockReturnValue(mockConversionManager);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/documents/doc-123/conversion-status');
      const response = await GET(request, { params: { id: 'doc-123' } });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if document not found', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
      mockDb.document.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/documents/doc-123/conversion-status');
      const response = await GET(request, { params: { id: 'doc-123' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Document not found or access denied');
    });

    it('should return conversion progress if job exists', async () => {
      const mockProgress = {
        documentId: 'doc-123',
        status: 'processing',
        stage: 'processing_pages',
        progress: 50,
        message: 'Processing document pages...',
        totalPages: 10,
        processedPages: 5,
        retryCount: 0,
      };

      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
      mockDb.document.findFirst.mockResolvedValue({ id: 'doc-123', userId: 'user-123' });
      mockConversionManager.getProgress.mockResolvedValue(mockProgress);

      const request = new NextRequest('http://localhost/api/documents/doc-123/conversion-status');
      const response = await GET(request, { params: { id: 'doc-123' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockProgress);
    });

    it('should return not_started status if no job exists', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
      mockDb.document.findFirst.mockResolvedValue({ id: 'doc-123', userId: 'user-123' });
      mockConversionManager.getProgress.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/documents/doc-123/conversion-status');
      const response = await GET(request, { params: { id: 'doc-123' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('not_started');
      expect(data.documentId).toBe('doc-123');
    });
  });

  describe('POST', () => {
    it('should start conversion job', async () => {
      const mockProgress = {
        documentId: 'doc-123',
        status: 'queued',
        stage: 'queued',
        progress: 0,
        message: 'Waiting in queue...',
        totalPages: null,
        processedPages: 0,
        retryCount: 0,
      };

      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
      mockDb.document.findFirst.mockResolvedValue({ id: 'doc-123', userId: 'user-123' });
      mockConversionManager.createJob.mockResolvedValue({ id: 'job-123' });
      mockConversionManager.getProgress.mockResolvedValue(mockProgress);

      const request = new NextRequest('http://localhost/api/documents/doc-123/conversion-status', {
        method: 'POST',
        body: JSON.stringify({ action: 'start', priority: 'high' }),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Conversion job created');
      expect(data.job).toEqual(mockProgress);
      expect(mockConversionManager.createJob).toHaveBeenCalledWith('doc-123', { priority: 'high' });
    });

    it('should retry conversion job', async () => {
      const mockProgress = {
        documentId: 'doc-123',
        status: 'queued',
        stage: 'queued',
        progress: 0,
        message: 'Waiting in queue...',
        totalPages: null,
        processedPages: 0,
        retryCount: 1,
      };

      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
      mockDb.document.findFirst.mockResolvedValue({ id: 'doc-123', userId: 'user-123' });
      mockConversionManager.retryJob.mockResolvedValue({ id: 'job-123' });
      mockConversionManager.getProgress.mockResolvedValue(mockProgress);

      const request = new NextRequest('http://localhost/api/documents/doc-123/conversion-status', {
        method: 'POST',
        body: JSON.stringify({ action: 'retry' }),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Conversion job retried');
      expect(mockConversionManager.retryJob).toHaveBeenCalledWith('doc-123');
    });

    it('should cancel conversion job', async () => {
      const mockActiveJob = { id: 'job-123', status: 'processing' };

      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
      mockDb.document.findFirst.mockResolvedValue({ id: 'doc-123', userId: 'user-123' });
      mockConversionManager.getActiveJob.mockResolvedValue(mockActiveJob);
      mockConversionManager.cancelJob.mockResolvedValue({ id: 'job-123', status: 'cancelled' });

      const request = new NextRequest('http://localhost/api/documents/doc-123/conversion-status', {
        method: 'POST',
        body: JSON.stringify({ action: 'cancel' }),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Conversion job cancelled');
      expect(mockConversionManager.cancelJob).toHaveBeenCalledWith('job-123');
    });

    it('should return 400 for invalid action', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
      mockDb.document.findFirst.mockResolvedValue({ id: 'doc-123', userId: 'user-123' });

      const request = new NextRequest('http://localhost/api/documents/doc-123/conversion-status', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid' }),
      });

      const response = await POST(request, { params: { id: 'doc-123' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid action. Use: start, retry, or cancel');
    });
  });
});