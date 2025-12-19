/**
 * Annotation API Permission Integration Tests
 * Tests that API endpoints correctly enforce role-based permissions
 * 
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getAnnotations, POST as createAnnotation } from '../route';
import { 
  GET as getAnnotation, 
  PATCH as updateAnnotation, 
  DELETE as deleteAnnotation 
} from '../[id]/route';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock annotation service
vi.mock('@/lib/services/annotations', () => ({
  annotationService: {
    getAnnotations: vi.fn(),
    createAnnotation: vi.fn(),
    getAnnotationById: vi.fn(),
    updateAnnotation: vi.fn(),
    deleteAnnotation: vi.fn(),
  },
}));

import { getServerSession } from 'next-auth';
import { annotationService } from '@/lib/services/annotations';

type MockedFunction = ReturnType<typeof vi.fn>;
const mockGetServerSession = getServerSession as unknown as MockedFunction;
const mockAnnotationService = annotationService as {
  getAnnotations: MockedFunction;
  createAnnotation: MockedFunction;
  getAnnotationById: MockedFunction;
  updateAnnotation: MockedFunction;
  deleteAnnotation: MockedFunction;
};

describe('Annotation API Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/annotations - Create Annotation', () => {
    const createMockRequest = (body: unknown) => {
      return {
        json: async () => body,
        url: 'http://localhost:3000/api/annotations',
      } as NextRequest;
    };

    test('PLATFORM_USER can create annotations', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'PLATFORM_USER' },
      });

      mockAnnotationService.createAnnotation.mockResolvedValue({
        id: 'annotation-1',
        documentId: 'doc-1',
        userId: 'user-1',
        pageNumber: 1,
        selectedText: 'Test text',
        mediaType: 'AUDIO',
        mediaUrl: 'https://example.com/audio.mp3',
        visibility: 'public',
      });

      const request = createMockRequest({
        documentId: 'doc-1',
        pageNumber: 1,
        selectedText: 'Test text',
        mediaType: 'AUDIO',
        mediaUrl: 'https://example.com/audio.mp3',
        visibility: 'public',
      });

      const response = await createAnnotation(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('annotation-1');
    });

    test('MEMBER cannot create annotations - returns 403', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'member-1', role: 'MEMBER' },
      });

      const request = createMockRequest({
        documentId: 'doc-1',
        pageNumber: 1,
        selectedText: 'Test text',
        mediaType: 'AUDIO',
        mediaUrl: 'https://example.com/audio.mp3',
        visibility: 'public',
      });

      const response = await createAnnotation(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Insufficient permissions');
      expect(data.error).toContain('PLATFORM_USER');
    });

    test('READER cannot create annotations - returns 403', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'reader-1', role: 'READER' },
      });

      const request = createMockRequest({
        documentId: 'doc-1',
        pageNumber: 1,
        selectedText: 'Test text',
        mediaType: 'AUDIO',
        mediaUrl: 'https://example.com/audio.mp3',
        visibility: 'public',
      });

      const response = await createAnnotation(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Insufficient permissions');
    });

    test('ADMIN can create annotations', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      mockAnnotationService.createAnnotation.mockResolvedValue({
        id: 'annotation-2',
        documentId: 'doc-1',
        userId: 'admin-1',
        pageNumber: 1,
        selectedText: 'Admin annotation',
        mediaType: 'VIDEO',
        mediaUrl: 'https://example.com/video.mp4',
        visibility: 'public',
      });

      const request = createMockRequest({
        documentId: 'doc-1',
        pageNumber: 1,
        selectedText: 'Admin annotation',
        mediaType: 'VIDEO',
        mediaUrl: 'https://example.com/video.mp4',
        visibility: 'public',
      });

      const response = await createAnnotation(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('annotation-2');
    });

    test('Unauthenticated user cannot create annotations - returns 401', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = createMockRequest({
        documentId: 'doc-1',
        pageNumber: 1,
        selectedText: 'Test text',
        mediaType: 'AUDIO',
        mediaUrl: 'https://example.com/audio.mp3',
        visibility: 'public',
      });

      const response = await createAnnotation(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('GET /api/annotations - List Annotations', () => {
    const createMockRequest = (params: Record<string, string>) => {
      const url = new URL('http://localhost:3000/api/annotations');
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      return {
        url: url.toString(),
      } as NextRequest;
    };

    test('All authenticated users can read public annotations', async () => {
      const roles = ['PLATFORM_USER', 'MEMBER', 'READER', 'ADMIN'];

      for (const role of roles) {
        mockGetServerSession.mockResolvedValue({
          user: { id: `user-${role}`, role },
        });

        mockAnnotationService.getAnnotations.mockResolvedValue({
          annotations: [
            {
              id: 'annotation-1',
              visibility: 'public',
              userId: 'other-user',
            },
          ],
          total: 1,
        });

        const request = createMockRequest({ documentId: 'doc-1' });
        const response = await getAnnotations(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.annotations).toHaveLength(1);
      }
    });

    test('Unauthenticated users cannot list annotations - returns 401', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = createMockRequest({ documentId: 'doc-1' });
      const response = await getAnnotations(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('PATCH /api/annotations/[id] - Update Annotation', () => {
    const createMockRequest = (body: unknown) => {
      return {
        json: async () => body,
      } as NextRequest;
    };

    test('PLATFORM_USER can update own annotations', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'PLATFORM_USER' },
      });

      mockAnnotationService.updateAnnotation.mockResolvedValue({
        id: 'annotation-1',
        userId: 'user-1',
        selectedText: 'Updated text',
        visibility: 'private',
      });

      const request = createMockRequest({
        selectedText: 'Updated text',
        visibility: 'private',
      });

      const response = await updateAnnotation(request, {
        params: { id: 'annotation-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.selectedText).toBe('Updated text');
    });

    test('PLATFORM_USER cannot update other users annotations - returns 403', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'PLATFORM_USER' },
      });

      mockAnnotationService.updateAnnotation.mockRejectedValue(
        new Error('Access denied')
      );

      const request = createMockRequest({
        selectedText: 'Updated text',
      });

      const response = await updateAnnotation(request, {
        params: { id: 'annotation-2' },
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    test('MEMBER cannot update any annotations - returns 403', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'member-1', role: 'MEMBER' },
      });

      mockAnnotationService.updateAnnotation.mockRejectedValue(
        new Error('Access denied')
      );

      const request = createMockRequest({
        selectedText: 'Updated text',
      });

      const response = await updateAnnotation(request, {
        params: { id: 'annotation-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    test('READER cannot update any annotations - returns 403', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'reader-1', role: 'READER' },
      });

      mockAnnotationService.updateAnnotation.mockRejectedValue(
        new Error('Access denied')
      );

      const request = createMockRequest({
        selectedText: 'Updated text',
      });

      const response = await updateAnnotation(request, {
        params: { id: 'annotation-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    test('ADMIN can update any annotation', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      mockAnnotationService.updateAnnotation.mockResolvedValue({
        id: 'annotation-1',
        userId: 'other-user',
        selectedText: 'Admin updated',
      });

      const request = createMockRequest({
        selectedText: 'Admin updated',
      });

      const response = await updateAnnotation(request, {
        params: { id: 'annotation-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.selectedText).toBe('Admin updated');
    });
  });

  describe('DELETE /api/annotations/[id] - Delete Annotation', () => {
    test('PLATFORM_USER can delete own annotations', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'PLATFORM_USER' },
      });

      mockAnnotationService.deleteAnnotation.mockResolvedValue(true);

      const request = {} as NextRequest;
      const response = await deleteAnnotation(request, {
        params: { id: 'annotation-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('deleted successfully');
    });

    test('PLATFORM_USER cannot delete other users annotations - returns 403', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'PLATFORM_USER' },
      });

      mockAnnotationService.deleteAnnotation.mockRejectedValue(
        new Error('Access denied')
      );

      const request = {} as NextRequest;
      const response = await deleteAnnotation(request, {
        params: { id: 'annotation-2' },
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    test('MEMBER cannot delete any annotations - returns 403', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'member-1', role: 'MEMBER' },
      });

      mockAnnotationService.deleteAnnotation.mockRejectedValue(
        new Error('Access denied')
      );

      const request = {} as NextRequest;
      const response = await deleteAnnotation(request, {
        params: { id: 'annotation-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    test('READER cannot delete any annotations - returns 403', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'reader-1', role: 'READER' },
      });

      mockAnnotationService.deleteAnnotation.mockRejectedValue(
        new Error('Access denied')
      );

      const request = {} as NextRequest;
      const response = await deleteAnnotation(request, {
        params: { id: 'annotation-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    test('ADMIN can delete any annotation', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      mockAnnotationService.deleteAnnotation.mockResolvedValue(true);

      const request = {} as NextRequest;
      const response = await deleteAnnotation(request, {
        params: { id: 'annotation-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('deleted successfully');
    });

    test('Unauthenticated user cannot delete annotations - returns 401', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = {} as NextRequest;
      const response = await deleteAnnotation(request, {
        params: { id: 'annotation-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('GET /api/annotations/[id] - Get Single Annotation', () => {
    test('All authenticated users can view public annotations', async () => {
      const roles = ['PLATFORM_USER', 'MEMBER', 'READER', 'ADMIN'];

      for (const role of roles) {
        mockGetServerSession.mockResolvedValue({
          user: { id: `user-${role}`, role },
        });

        mockAnnotationService.getAnnotationById.mockResolvedValue({
          id: 'annotation-1',
          visibility: 'public',
          userId: 'other-user',
        });

        const request = {} as NextRequest;
        const response = await getAnnotation(request, {
          params: { id: 'annotation-1' },
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.id).toBe('annotation-1');
      }
    });

    test('Owner can view own private annotations', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'PLATFORM_USER' },
      });

      mockAnnotationService.getAnnotationById.mockResolvedValue({
        id: 'annotation-1',
        visibility: 'private',
        userId: 'user-1',
      });

      const request = {} as NextRequest;
      const response = await getAnnotation(request, {
        params: { id: 'annotation-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('annotation-1');
    });

    test('Non-owner MEMBER cannot view private annotations - returns 404', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'member-1', role: 'MEMBER' },
      });

      mockAnnotationService.getAnnotationById.mockResolvedValue(null);

      const request = {} as NextRequest;
      const response = await getAnnotation(request, {
        params: { id: 'annotation-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Annotation not found');
    });

    test('ADMIN can view any private annotation', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' },
      });

      mockAnnotationService.getAnnotationById.mockResolvedValue({
        id: 'annotation-1',
        visibility: 'private',
        userId: 'other-user',
      });

      const request = {} as NextRequest;
      const response = await getAnnotation(request, {
        params: { id: 'annotation-1' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('annotation-1');
    });
  });
});
