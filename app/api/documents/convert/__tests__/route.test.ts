import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/db', () => ({
  prisma: {
    document: {
      findUnique: vi.fn(),
    },
  },
}));

describe('POST /api/documents/convert', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  };

  const mockDocument = {
    id: 'doc-123',
    userId: 'user-123',
    filename: 'test.pdf',
    storagePath: '/path/to/test.pdf',
    mimeType: 'application/pdf',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/documents/convert', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'doc-123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Unauthorized');
  });

  it('should return 400 if documentId is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);

    const request = new NextRequest('http://localhost:3000/api/documents/convert', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Document ID is required');
  });

  it('should return 404 if document does not exist', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.document.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/documents/convert', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'doc-123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Document not found');
  });

  it('should return 403 if user does not own the document', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.document.findUnique).mockResolvedValue({
      ...mockDocument,
      userId: 'different-user',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/documents/convert', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'doc-123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Access denied');
  });

  it('should return 400 if document is not a PDF', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.document.findUnique).mockResolvedValue({
      ...mockDocument,
      mimeType: 'image/jpeg',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/documents/convert', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'doc-123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Only PDF documents can be converted');
  });

  it('should queue document for conversion successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument as any);

    const request = new NextRequest('http://localhost:3000/api/documents/convert', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'doc-123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Document conversion queued');
    expect(data.documentId).toBe('doc-123');
    expect(data.status).toBe('queued');
  });

  it('should handle forceRegenerate parameter', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument as any);

    const request = new NextRequest('http://localhost:3000/api/documents/convert', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'doc-123', forceRegenerate: true }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
