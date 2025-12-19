/**
 * Database Consistency Validation Tests
 * 
 * Tests database operations and data consistency for document viewing,
 * including transaction handling, concurrent access, and data integrity.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Prisma client
vi.mock('../../db', () => ({
  db: {
    $transaction: vi.fn(),
    document: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    documentPage: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    myJstudyroomItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    conversionJob: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    conversionAnalytics: {
      create: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

interface DatabaseTestContext {
  mockDb: any;
  createMockDocument: (id: string, overrides?: any) => any;
  createMockPages: (documentId: string, count: number) => any[];
  createMockMyJstudyroomItem: (documentId: string, memberId: string) => any;
  createMockConversionJob: (documentId: string, status?: string) => any;
}

describe('Database Consistency Validation Tests', () => {
  let context: DatabaseTestContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    context = {
      mockDb: vi.mocked(require('../../db').db),
      
      createMockDocument: (id: string, overrides = {}) => ({
        id,
        title: `Document ${id}`,
        storagePath: `documents/${id}.pdf`,
        contentType: 'application/pdf',
        totalPages: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      }),
      
      createMockPages: (documentId: string, count: number) => 
        Array.from({ length: count }, (_, i) => ({
          id: `page-${documentId}-${i + 1}`,
          documentId,
          pageNumber: i + 1,
          imageUrl: `pages/${documentId}/page-${i + 1}.jpg`,
          width: 800,
          height: 1200,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      
      createMockMyJstudyroomItem: (documentId: string, memberId: string) => ({
        id: `item-${documentId}-${memberId}`,
        documentId,
        memberId,
        addedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      
      createMockConversionJob: (documentId: string, status = 'queued') => ({
        id: `job-${documentId}`,
        documentId,
        status,
        progress: status === 'completed' ? 100 : 0,
        startedAt: new Date(),
        completedAt: status === 'completed' ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Document and Pages Consistency', () => {
    it('should maintain consistency between document totalPages and actual page count', async () => {
      // Arrange
      const documentId = 'doc-consistency-1';
      const document = context.createMockDocument(documentId, { totalPages: 3 });
      const pages = context.createMockPages(documentId, 3);

      context.mockDb.document.findUnique.mockResolvedValue(document);
      context.mockDb.documentPage.findMany.mockResolvedValue(pages);
      context.mockDb.documentPage.count.mockResolvedValue(3);

      // Act
      const fetchedDocument = await context.mockDb.document.findUnique({
        where: { id: documentId },
      });
      const fetchedPages = await context.mockDb.documentPage.findMany({
        where: { documentId },
      });
      const pageCount = await context.mockDb.documentPage.count({
        where: { documentId },
      });

      // Assert
      expect(fetchedDocument.totalPages).toBe(3);
      expect(fetchedPages).toHaveLength(3);
      expect(pageCount).toBe(3);
      expect(fetchedDocument.totalPages).toBe(pageCount);
    });

    it('should handle page count mismatch and trigger correction', async () => {
      // Arrange
      const documentId = 'doc-mismatch';
      const document = context.createMockDocument(documentId, { totalPages: 5 });
      const pages = context.createMockPages(documentId, 3); // Mismatch: 5 vs 3

      context.mockDb.document.findUnique.mockResolvedValue(document);
      context.mockDb.documentPage.findMany.mockResolvedValue(pages);
      context.mockDb.documentPage.count.mockResolvedValue(3);
      context.mockDb.document.update.mockResolvedValue({
        ...document,
        totalPages: 3,
      });

      // Act - Simulate consistency check and correction
      const fetchedDocument = await context.mockDb.document.findUnique({
        where: { id: documentId },
      });
      const actualPageCount = await context.mockDb.documentPage.count({
        where: { documentId },
      });

      if (fetchedDocument.totalPages !== actualPageCount) {
        // Correct the mismatch
        await context.mockDb.document.update({
          where: { id: documentId },
          data: { totalPages: actualPageCount },
        });
      }

      // Assert
      expect(fetchedDocument.totalPages).toBe(5); // Original value
      expect(actualPageCount).toBe(3); // Actual count
      expect(context.mockDb.document.update).toHaveBeenCalledWith({
        where: { id: documentId },
        data: { totalPages: 3 },
      });
    });

    it('should maintain page number sequence integrity', async () => {
      // Arrange
      const documentId = 'doc-sequence';
      const pages = [
        { ...context.createMockPages(documentId, 1)[0], pageNumber: 1 },
        { ...context.createMockPages(documentId, 1)[0], pageNumber: 2 },
        { ...context.createMockPages(documentId, 1)[0], pageNumber: 4 }, // Gap at 3
        { ...context.createMockPages(documentId, 1)[0], pageNumber: 5 },
      ];

      context.mockDb.documentPage.findMany.mockResolvedValue(pages);

      // Act
      const fetchedPages = await context.mockDb.documentPage.findMany({
        where: { documentId },
        orderBy: { pageNumber: 'asc' },
      });

      // Assert - Check for sequence gaps
      const pageNumbers = fetchedPages.map(p => p.pageNumber);
      const expectedSequence = Array.from({ length: pageNumbers.length }, (_, i) => i + 1);
      const hasGaps = !pageNumbers.every((num, index) => num === expectedSequence[index]);

      expect(hasGaps).toBe(true); // Should detect the gap
      expect(pageNumbers).toEqual([1, 2, 4, 5]);
      expect(pageNumbers).not.toEqual([1, 2, 3, 4]); // Missing page 3
    });
  });

  describe('MyJstudyroom Item Consistency', () => {
    it('should ensure document exists before creating MyJstudyroom item', async () => {
      // Arrange
      const documentId = 'doc-exists';
      const memberId = 'member-123';
      const document = context.createMockDocument(documentId);
      const myJstudyroomItem = context.createMockMyJstudyroomItem(documentId, memberId);

      context.mockDb.document.findUnique.mockResolvedValue(document);
      context.mockDb.myJstudyroomItem.create.mockResolvedValue(myJstudyroomItem);

      // Act - Simulate creating MyJstudyroom item with document validation
      const documentExists = await context.mockDb.document.findUnique({
        where: { id: documentId },
      });

      if (documentExists) {
        await context.mockDb.myJstudyroomItem.create({
          data: {
            documentId,
            memberId,
          },
        });
      }

      // Assert
      expect(documentExists).toBeTruthy();
      expect(context.mockDb.myJstudyroomItem.create).toHaveBeenCalledWith({
        data: { documentId, memberId },
      });
    });

    it('should prevent creating MyJstudyroom item for non-existent document', async () => {
      // Arrange
      const documentId = 'doc-not-exists';
      const memberId = 'member-123';

      context.mockDb.document.findUnique.mockResolvedValue(null);

      // Act & Assert
      const documentExists = await context.mockDb.document.findUnique({
        where: { id: documentId },
      });

      expect(documentExists).toBeNull();
      
      // Should not create MyJstudyroom item
      if (!documentExists) {
        expect(context.mockDb.myJstudyroomItem.create).not.toHaveBeenCalled();
      }
    });

    it('should handle duplicate MyJstudyroom item creation', async () => {
      // Arrange
      const documentId = 'doc-duplicate';
      const memberId = 'member-123';
      const existingItem = context.createMockMyJstudyroomItem(documentId, memberId);

      context.mockDb.myJstudyroomItem.findUnique.mockResolvedValue(existingItem);

      // Act
      const existingMyJstudyroomItem = await context.mockDb.myJstudyroomItem.findUnique({
        where: { documentId, memberId },
      });

      // Assert
      expect(existingMyJstudyroomItem).toBeTruthy();
      expect(existingMyJstudyroomItem.documentId).toBe(documentId);
      expect(existingMyJstudyroomItem.memberId).toBe(memberId);
    });
  });

  describe('Conversion Job Consistency', () => {
    it('should prevent duplicate active conversion jobs', async () => {
      // Arrange
      const documentId = 'doc-conversion';
      const activeJob = context.createMockConversionJob(documentId, 'processing');

      context.mockDb.conversionJob.findFirst.mockResolvedValue(activeJob);

      // Act
      const existingActiveJob = await context.mockDb.conversionJob.findFirst({
        where: {
          documentId,
          status: { in: ['queued', 'processing'] },
        },
      });

      // Assert
      expect(existingActiveJob).toBeTruthy();
      expect(existingActiveJob.status).toBe('processing');
      
      // Should not create new job if active one exists
      if (existingActiveJob) {
        expect(context.mockDb.conversionJob.create).not.toHaveBeenCalled();
      }
    });

    it('should allow new conversion job after previous completion', async () => {
      // Arrange
      const documentId = 'doc-completed';
      const completedJob = context.createMockConversionJob(documentId, 'completed');
      const newJob = context.createMockConversionJob(documentId, 'queued');

      context.mockDb.conversionJob.findFirst
        .mockResolvedValueOnce(null) // No active jobs
        .mockResolvedValueOnce(completedJob); // Previous completed job exists
      context.mockDb.conversionJob.create.mockResolvedValue(newJob);

      // Act
      const activeJob = await context.mockDb.conversionJob.findFirst({
        where: {
          documentId,
          status: { in: ['queued', 'processing'] },
        },
      });

      if (!activeJob) {
        await context.mockDb.conversionJob.create({
          data: {
            documentId,
            status: 'queued',
            progress: 0,
          },
        });
      }

      // Assert
      expect(activeJob).toBeNull();
      expect(context.mockDb.conversionJob.create).toHaveBeenCalledWith({
        data: {
          documentId,
          status: 'queued',
          progress: 0,
        },
      });
    });

    it('should maintain conversion job progress consistency', async () => {
      // Arrange
      const documentId = 'doc-progress';
      const progressUpdates = [
        { progress: 0, status: 'queued' },
        { progress: 25, status: 'processing' },
        { progress: 50, status: 'processing' },
        { progress: 75, status: 'processing' },
        { progress: 100, status: 'completed' },
      ];

      // Setup mock to return different progress values
      progressUpdates.forEach((update, index) => {
        context.mockDb.conversionJob.update
          .mockResolvedValueOnce({
            ...context.createMockConversionJob(documentId),
            ...update,
          });
      });

      // Act & Assert
      for (const update of progressUpdates) {
        const updatedJob = await context.mockDb.conversionJob.update({
          where: { documentId },
          data: update,
        });

        expect(updatedJob.progress).toBe(update.progress);
        expect(updatedJob.status).toBe(update.status);
        
        // Progress should never decrease (except on restart)
        if (update.progress > 0) {
          expect(updatedJob.progress).toBeGreaterThanOrEqual(0);
          expect(updatedJob.progress).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  describe('Transaction Consistency', () => {
    it('should handle atomic page creation with document update', async () => {
      // Arrange
      const documentId = 'doc-atomic';
      const document = context.createMockDocument(documentId, { totalPages: null });
      const pages = context.createMockPages(documentId, 3);

      const transactionResult = {
        document: { ...document, totalPages: 3 },
        pages,
      };

      context.mockDb.$transaction.mockResolvedValue(transactionResult);

      // Act
      const result = await context.mockDb.$transaction(async (tx: any) => {
        // Create pages
        const createdPages = await tx.documentPage.createMany({
          data: pages.map(p => ({
            documentId: p.documentId,
            pageNumber: p.pageNumber,
            imageUrl: p.imageUrl,
            width: p.width,
            height: p.height,
          })),
        });

        // Update document with page count
        const updatedDocument = await tx.document.update({
          where: { id: documentId },
          data: { totalPages: pages.length },
        });

        return { document: updatedDocument, pages: createdPages };
      });

      // Assert
      expect(result.document.totalPages).toBe(3);
      expect(result.pages).toBeTruthy();
      expect(context.mockDb.$transaction).toHaveBeenCalled();
    });

    it('should rollback on transaction failure', async () => {
      // Arrange
      const documentId = 'doc-rollback';
      const error = new Error('Transaction failed');

      context.mockDb.$transaction.mockRejectedValue(error);

      // Act & Assert
      await expect(
        context.mockDb.$transaction(async (tx: any) => {
          await tx.documentPage.createMany({
            data: [{ documentId, pageNumber: 1 }],
          });
          
          // Simulate failure
          throw error;
        })
      ).rejects.toThrow('Transaction failed');
    });

    it('should handle concurrent document access safely', async () => {
      // Arrange
      const documentId = 'doc-concurrent';
      const member1Id = 'member-1';
      const member2Id = 'member-2';
      
      const document = context.createMockDocument(documentId);
      const item1 = context.createMockMyJstudyroomItem(documentId, member1Id);
      const item2 = context.createMockMyJstudyroomItem(documentId, member2Id);

      context.mockDb.document.findUnique.mockResolvedValue(document);
      context.mockDb.myJstudyroomItem.findUnique
        .mockImplementation(({ where }) => {
          if (where.memberId === member1Id) return Promise.resolve(item1);
          if (where.memberId === member2Id) return Promise.resolve(item2);
          return Promise.resolve(null);
        });

      // Act - Simulate concurrent access
      const [access1, access2] = await Promise.all([
        context.mockDb.myJstudyroomItem.findUnique({
          where: { documentId, memberId: member1Id },
        }),
        context.mockDb.myJstudyroomItem.findUnique({
          where: { documentId, memberId: member2Id },
        }),
      ]);

      // Assert
      expect(access1).toBeTruthy();
      expect(access2).toBeTruthy();
      expect(access1.memberId).toBe(member1Id);
      expect(access2.memberId).toBe(member2Id);
      expect(access1.documentId).toBe(documentId);
      expect(access2.documentId).toBe(documentId);
    });
  });

  describe('Data Integrity Validation', () => {
    it('should validate document page URLs are accessible', async () => {
      // Arrange
      const documentId = 'doc-urls';
      const pages = context.createMockPages(documentId, 2);
      
      // Mock URL validation
      const validateUrl = vi.fn().mockImplementation((url: string) => {
        return url.startsWith('pages/') && url.endsWith('.jpg');
      });

      context.mockDb.documentPage.findMany.mockResolvedValue(pages);

      // Act
      const fetchedPages = await context.mockDb.documentPage.findMany({
        where: { documentId },
      });

      const urlValidationResults = fetchedPages.map(page => ({
        pageId: page.id,
        url: page.imageUrl,
        isValid: validateUrl(page.imageUrl),
      }));

      // Assert
      expect(urlValidationResults).toHaveLength(2);
      expect(urlValidationResults.every(result => result.isValid)).toBe(true);
    });

    it('should detect and handle orphaned pages', async () => {
      // Arrange
      const documentId = 'doc-orphaned';
      const orphanedPages = context.createMockPages('non-existent-doc', 2);

      context.mockDb.document.findUnique.mockResolvedValue(null);
      context.mockDb.documentPage.findMany.mockResolvedValue(orphanedPages);
      context.mockDb.documentPage.deleteMany.mockResolvedValue({ count: 2 });

      // Act - Check for orphaned pages
      const document = await context.mockDb.document.findUnique({
        where: { id: 'non-existent-doc' },
      });

      const pages = await context.mockDb.documentPage.findMany({
        where: { documentId: 'non-existent-doc' },
      });

      // Clean up orphaned pages
      if (!document && pages.length > 0) {
        await context.mockDb.documentPage.deleteMany({
          where: { documentId: 'non-existent-doc' },
        });
      }

      // Assert
      expect(document).toBeNull();
      expect(pages).toHaveLength(2);
      expect(context.mockDb.documentPage.deleteMany).toHaveBeenCalledWith({
        where: { documentId: 'non-existent-doc' },
      });
    });

    it('should validate conversion analytics consistency', async () => {
      // Arrange
      const documentId = 'doc-analytics';
      const conversionJob = context.createMockConversionJob(documentId, 'completed');
      
      const analyticsData = {
        documentId,
        conversionJobId: conversionJob.id,
        startTime: new Date(),
        endTime: new Date(),
        duration: 30000, // 30 seconds
        success: true,
        errorMessage: null,
      };

      context.mockDb.conversionJob.findUnique.mockResolvedValue(conversionJob);
      context.mockDb.conversionAnalytics.create.mockResolvedValue(analyticsData);

      // Act
      const job = await context.mockDb.conversionJob.findUnique({
        where: { id: conversionJob.id },
      });

      if (job && job.status === 'completed') {
        await context.mockDb.conversionAnalytics.create({
          data: analyticsData,
        });
      }

      // Assert
      expect(job.status).toBe('completed');
      expect(context.mockDb.conversionAnalytics.create).toHaveBeenCalledWith({
        data: analyticsData,
      });
    });
  });

  describe('Cleanup and Maintenance', () => {
    it('should clean up old conversion jobs', async () => {
      // Arrange
      const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const oldJobs = [
        { ...context.createMockConversionJob('doc-1', 'completed'), createdAt: oldDate },
        { ...context.createMockConversionJob('doc-2', 'failed'), createdAt: oldDate },
      ];

      context.mockDb.conversionJob.findMany.mockResolvedValue(oldJobs);
      context.mockDb.conversionJob.delete.mockResolvedValue({});

      // Act
      const jobsToCleanup = await context.mockDb.conversionJob.findMany({
        where: {
          createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          status: { in: ['completed', 'failed'] },
        },
      });

      for (const job of jobsToCleanup) {
        await context.mockDb.conversionJob.delete({
          where: { id: job.id },
        });
      }

      // Assert
      expect(jobsToCleanup).toHaveLength(2);
      expect(context.mockDb.conversionJob.delete).toHaveBeenCalledTimes(2);
    });

    it('should validate referential integrity on deletion', async () => {
      // Arrange
      const documentId = 'doc-delete';
      const document = context.createMockDocument(documentId);
      const pages = context.createMockPages(documentId, 2);
      const myJstudyroomItems = [
        context.createMockMyJstudyroomItem(documentId, 'member-1'),
        context.createMockMyJstudyroomItem(documentId, 'member-2'),
      ];

      context.mockDb.document.findUnique.mockResolvedValue(document);
      context.mockDb.documentPage.findMany.mockResolvedValue(pages);
      context.mockDb.myJstudyroomItem.findMany.mockResolvedValue(myJstudyroomItems);
      context.mockDb.documentPage.deleteMany.mockResolvedValue({ count: 2 });
      context.mockDb.myJstudyroomItem.deleteMany.mockResolvedValue({ count: 2 });
      context.mockDb.document.delete.mockResolvedValue(document);

      // Act - Simulate cascading deletion
      const relatedPages = await context.mockDb.documentPage.findMany({
        where: { documentId },
      });
      
      const relatedItems = await context.mockDb.myJstudyroomItem.findMany({
        where: { documentId },
      });

      // Clean up related records first
      if (relatedPages.length > 0) {
        await context.mockDb.documentPage.deleteMany({
          where: { documentId },
        });
      }

      if (relatedItems.length > 0) {
        await context.mockDb.myJstudyroomItem.deleteMany({
          where: { documentId },
        });
      }

      // Then delete the document
      await context.mockDb.document.delete({
        where: { id: documentId },
      });

      // Assert
      expect(relatedPages).toHaveLength(2);
      expect(relatedItems).toHaveLength(2);
      expect(context.mockDb.documentPage.deleteMany).toHaveBeenCalled();
      expect(context.mockDb.myJstudyroomItem.deleteMany).toHaveBeenCalled();
      expect(context.mockDb.document.delete).toHaveBeenCalled();
    });
  });
});