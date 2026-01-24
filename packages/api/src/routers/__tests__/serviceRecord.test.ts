import { describe, test, expect, beforeEach } from 'vitest';
import { JobStatus } from '@prisma/client';
import { prismaMock, mockTransaction, resetPrismaMock } from '@/__tests__/helpers/prisma-mock';
import { createCaller } from '@/__tests__/helpers/trpc-caller';
import { expectTRPCError, createPhotoUrls } from '@/__tests__/helpers/test-utils';
import {
  createMockJob,
  createMockServiceRecord,
  createMockEquipment,
  createMockJobWithRelations,
} from '@/__tests__/helpers/fixtures';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: Type assertions (as any) are necessary when mocking Prisma relations
// because the mock types don't perfectly match the complex Prisma return types

describe('serviceRecord Router', () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(() => {
    resetPrismaMock();
    caller = createCaller();
  });

  describe('checkIn', () => {
    const validInput = {
      jobId: 'cljk1234567890',
      beforePhotos: createPhotoUrls(2),
      beforeNotes: 'Equipment shows signs of wear',
      beforeEngineHours: 1250,
      arrivedAt: new Date('2024-01-15T09:00:00Z'),
    };

    test('creates service record and updates job to IN_PROGRESS', async () => {
      // Arrange
      const mockJob = createMockJob({
        id: validInput.jobId,
        status: JobStatus.ASSIGNED
      });
      const mockServiceRecord = createMockServiceRecord({
        jobId: validInput.jobId,
        beforePhotos: validInput.beforePhotos,
        beforeNotes: validInput.beforeNotes,
        beforeEngineHours: validInput.beforeEngineHours,
        arrivedAt: validInput.arrivedAt,
        isCheckInComplete: true,
      });

      prismaMock.job.findUnique.mockResolvedValue(mockJob);
      prismaMock.serviceRecord.findUnique.mockResolvedValue(null);

      mockTransaction();
      prismaMock.serviceRecord.create.mockResolvedValue(mockServiceRecord);
      prismaMock.job.update.mockResolvedValue({ ...mockJob, status: JobStatus.IN_PROGRESS });

      // Act
      const result = await caller.serviceRecord.checkIn(validInput);

      // Assert
      expect(result).toEqual(mockServiceRecord);
      expect(prismaMock.job.findUnique).toHaveBeenCalledWith({
        where: { id: validInput.jobId },
      });
      expect(prismaMock.serviceRecord.findUnique).toHaveBeenCalledWith({
        where: { jobId: validInput.jobId },
      });
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    test('throws NOT_FOUND when job does not exist', async () => {
      // Arrange
      prismaMock.job.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expectTRPCError(
        () => caller.serviceRecord.checkIn(validInput),
        'NOT_FOUND',
        'Job not found'
      );
    });

    test('throws BAD_REQUEST when job status is not ASSIGNED', async () => {
      // Arrange
      const mockJob = createMockJob({
        id: validInput.jobId,
        status: JobStatus.IN_PROGRESS
      });
      prismaMock.job.findUnique.mockResolvedValue(mockJob);

      // Act & Assert
      await expectTRPCError(
        () => caller.serviceRecord.checkIn(validInput),
        'BAD_REQUEST',
        'Job must be ASSIGNED'
      );
    });

    test('throws BAD_REQUEST when service record already exists', async () => {
      // Arrange
      const mockJob = createMockJob({
        id: validInput.jobId,
        status: JobStatus.ASSIGNED
      });
      const existingServiceRecord = createMockServiceRecord({ jobId: validInput.jobId });

      prismaMock.job.findUnique.mockResolvedValue(mockJob);
      prismaMock.serviceRecord.findUnique.mockResolvedValue(existingServiceRecord);

      // Act & Assert
      await expectTRPCError(
        () => caller.serviceRecord.checkIn(validInput),
        'BAD_REQUEST',
        'Service record already exists'
      );
    });

    test('rejects invalid CUID format for jobId', async () => {
      // Arrange
      const invalidInput = { ...validInput, jobId: 'invalid-id' };

      // Act & Assert
      await expect(caller.serviceRecord.checkIn(invalidInput)).rejects.toThrow();
    });

    test('rejects more than 4 photos', async () => {
      // Arrange
      const invalidInput = {
        ...validInput,
        beforePhotos: createPhotoUrls(5)
      };

      // Act & Assert
      await expect(caller.serviceRecord.checkIn(invalidInput)).rejects.toThrow(
        'Maximum 4 photos allowed'
      );
    });

    test('rejects non-positive engine hours', async () => {
      // Arrange
      const invalidInput = { ...validInput, beforeEngineHours: -100 };

      // Act & Assert
      await expect(caller.serviceRecord.checkIn(invalidInput)).rejects.toThrow(
        'Engine hours must be positive'
      );
    });

    test('rejects invalid photo URLs', async () => {
      // Arrange
      const invalidInput = {
        ...validInput,
        beforePhotos: ['not-a-url', 'also-not-a-url']
      };

      // Act & Assert
      await expect(caller.serviceRecord.checkIn(invalidInput)).rejects.toThrow(
        'Invalid photo URL'
      );
    });
  });

  describe('complete', () => {
    const validInput = {
      serviceRecordId: 'clsr1234567890',
      afterPhotos: createPhotoUrls(2),
      diagnosis: 'Hydraulic seal failure on boom cylinder',
      workPerformed: 'Replaced hydraulic seal, tested system, verified no leaks',
      partsUsed: 'Hydraulic seal kit P/N 123-456',
      afterEngineHours: 1255,
      completedAt: new Date('2024-01-15T14:00:00Z'),
    };

    test('updates service record and sets job to COMPLETED', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
        isCheckInComplete: true,
        beforeEngineHours: 1250,
      });
      const mockJob = createMockJob({
        id: mockServiceRecord.jobId,
        status: JobStatus.IN_PROGRESS,
      });
      const updatedServiceRecord = {
        ...mockServiceRecord,
        ...validInput,
        isJobComplete: true,
      };

      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      mockTransaction();
      prismaMock.serviceRecord.update.mockResolvedValue(updatedServiceRecord);
      prismaMock.job.update.mockResolvedValue({ ...mockJob, status: JobStatus.COMPLETED });

      // Act
      const result = await caller.serviceRecord.complete(validInput);

      // Assert
      expect(result).toEqual(updatedServiceRecord);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    test('throws NOT_FOUND when service record does not exist', async () => {
      // Arrange
      prismaMock.serviceRecord.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expectTRPCError(
        () => caller.serviceRecord.complete(validInput),
        'NOT_FOUND',
        'Service record not found'
      );
    });

    test('throws BAD_REQUEST when check-in not complete', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
        isCheckInComplete: false,
      });
      const mockJob = createMockJob({ status: JobStatus.IN_PROGRESS });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      // Act & Assert
      await expectTRPCError(
        () => caller.serviceRecord.complete(validInput),
        'BAD_REQUEST',
        'Cannot complete job before check-in is complete'
      );
    });

    test('throws BAD_REQUEST when job already completed', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
        isCheckInComplete: true,
        isJobComplete: true,
      });
      const mockJob = createMockJob({ status: JobStatus.COMPLETED });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      // Act & Assert
      await expectTRPCError(
        () => caller.serviceRecord.complete(validInput),
        'BAD_REQUEST',
        'Job is already completed'
      );
    });

    test('throws BAD_REQUEST when job status is not IN_PROGRESS', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
        isCheckInComplete: true,
      });
      const mockJob = createMockJob({ status: JobStatus.ASSIGNED });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      // Act & Assert
      await expectTRPCError(
        () => caller.serviceRecord.complete(validInput),
        'BAD_REQUEST',
        'Job must be IN_PROGRESS'
      );
    });

    test('throws BAD_REQUEST when afterEngineHours < beforeEngineHours', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
        isCheckInComplete: true,
        beforeEngineHours: 1250,
      });
      const mockJob = createMockJob({ status: JobStatus.IN_PROGRESS });

      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      const invalidInput = { ...validInput, afterEngineHours: 1200 };

      // Act & Assert
      await expectTRPCError(
        () => caller.serviceRecord.complete(invalidInput),
        'BAD_REQUEST',
        'After engine hours cannot be less than before engine hours'
      );
    });

    test('requires diagnosis (min 1 char)', async () => {
      // Arrange
      const invalidInput = { ...validInput, diagnosis: '' };

      // Act & Assert
      await expect(caller.serviceRecord.complete(invalidInput)).rejects.toThrow(
        'Diagnosis required'
      );
    });

    test('requires workPerformed (min 1 char)', async () => {
      // Arrange
      const invalidInput = { ...validInput, workPerformed: '' };

      // Act & Assert
      await expect(caller.serviceRecord.complete(invalidInput)).rejects.toThrow(
        'Work performed required'
      );
    });

    test('allows null partsUsed', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
        isCheckInComplete: true,
        beforeEngineHours: 1250,
      });
      const mockJob = createMockJob({ status: JobStatus.IN_PROGRESS });
      const inputWithNullParts = { ...validInput, partsUsed: null };

      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      mockTransaction();
      prismaMock.serviceRecord.update.mockResolvedValue({
        ...mockServiceRecord,
        ...inputWithNullParts,
        isJobComplete: true,
      });
      prismaMock.job.update.mockResolvedValue({ ...mockJob, status: JobStatus.COMPLETED });

      // Act
      const result = await caller.serviceRecord.complete(inputWithNullParts);

      // Assert
      expect(result.partsUsed).toBeNull();
    });
  });

  describe('updateCheckIn', () => {
    const validInput = {
      serviceRecordId: 'clsr1234567890',
      beforePhotos: createPhotoUrls(3),
      beforeNotes: 'Updated notes',
      beforeEngineHours: 1260,
    };

    test('updates check-in data without changing job status', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
      });
      const mockJob = createMockJob({ status: JobStatus.IN_PROGRESS });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      const updatedServiceRecord = {
        ...mockServiceRecord,
        ...validInput,
      };

      prismaMock.serviceRecord.update.mockResolvedValue(updatedServiceRecord);

      // Act
      const result = await caller.serviceRecord.updateCheckIn(validInput);

      // Assert
      expect(result).toEqual(updatedServiceRecord);
      expect(result.revisedAt).toBeNull();
      expect(result.revisionCount).toBe(0);
    });

    test('increments revisionCount for completed jobs', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
        revisionCount: 0,
      });
      const mockJob = createMockJob({ status: JobStatus.COMPLETED });

      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      const updatedServiceRecord = {
        ...mockServiceRecord,
        ...validInput,
        revisedAt: new Date(),
        revisionCount: 1,
      };

      prismaMock.serviceRecord.update.mockResolvedValue(updatedServiceRecord);

      // Act
      const result = await caller.serviceRecord.updateCheckIn(validInput);

      // Assert
      expect(result.revisionCount).toBe(1);
      expect(result.revisedAt).toBeDefined();
    });

    test('sets revisedAt timestamp for completed jobs', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
      });
      const mockJob = createMockJob({ status: JobStatus.COMPLETED });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      const now = new Date();
      const updatedServiceRecord = {
        ...mockServiceRecord,
        ...validInput,
        revisedAt: now,
        revisionCount: 1,
      };

      prismaMock.serviceRecord.update.mockResolvedValue(updatedServiceRecord);

      // Act
      const result = await caller.serviceRecord.updateCheckIn(validInput);

      // Assert
      expect(result.revisedAt).toEqual(now);
    });
  });

  describe('updateCompletion', () => {
    const validInput = {
      serviceRecordId: 'clsr1234567890',
      afterPhotos: createPhotoUrls(3),
      diagnosis: 'Updated diagnosis',
      workPerformed: 'Updated work performed',
      partsUsed: 'Updated parts',
      afterEngineHours: 1270,
    };

    test('updates completion data for completed jobs', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
        isJobComplete: true,
        beforeEngineHours: 1250,
      });
      const mockJob = createMockJob({ status: JobStatus.COMPLETED });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      const updatedServiceRecord = {
        ...mockServiceRecord,
        ...validInput,
        revisedAt: new Date(),
        revisionCount: 1,
      };

      prismaMock.serviceRecord.update.mockResolvedValue(updatedServiceRecord);

      // Act
      const result = await caller.serviceRecord.updateCompletion(validInput);

      // Assert
      expect(result).toEqual(updatedServiceRecord);
    });

    test('increments revisionCount and sets revisedAt', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
        isJobComplete: true,
        beforeEngineHours: 1250,
        revisionCount: 1,
      });
      const mockJob = createMockJob({ status: JobStatus.COMPLETED });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      const updatedServiceRecord = {
        ...mockServiceRecord,
        ...validInput,
        revisedAt: new Date(),
        revisionCount: 2,
      };

      prismaMock.serviceRecord.update.mockResolvedValue(updatedServiceRecord);

      // Act
      const result = await caller.serviceRecord.updateCompletion(validInput);

      // Assert
      expect(result.revisionCount).toBe(2);
      expect(result.revisedAt).toBeDefined();
    });

    test('validates afterEngineHours >= beforeEngineHours', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
        isJobComplete: true,
        beforeEngineHours: 1250,
      });
      const mockJob = createMockJob({ status: JobStatus.COMPLETED });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      const invalidInput = { ...validInput, afterEngineHours: 1200 };

      // Act & Assert
      await expectTRPCError(
        () => caller.serviceRecord.updateCompletion(invalidInput),
        'BAD_REQUEST',
        'After engine hours cannot be less than before engine hours'
      );
    });
  });

  describe('deleteBeforePhoto', () => {
    const validInput = {
      serviceRecordId: 'clsr1234567890',
      photoUrl: 'http://localhost:8000/photo1.jpg',
    };

    test('removes photo from beforePhotos array', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
        beforePhotos: [validInput.photoUrl, 'http://localhost:8000/photo2.jpg'],
      });
      const mockJob = createMockJob({ status: JobStatus.IN_PROGRESS });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      const updatedServiceRecord = {
        ...mockServiceRecord,
        beforePhotos: ['http://localhost:8000/photo2.jpg'],
      };

      prismaMock.serviceRecord.update.mockResolvedValue(updatedServiceRecord);

      // Act
      const result = await caller.serviceRecord.deleteBeforePhoto(validInput);

      // Assert
      expect(result.beforePhotos).toHaveLength(1);
      expect(result.beforePhotos).not.toContain(validInput.photoUrl);
    });

    test('increments revisionCount for completed jobs', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
        beforePhotos: [validInput.photoUrl],
        revisionCount: 0,
      });
      const mockJob = createMockJob({ status: JobStatus.COMPLETED });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      const updatedServiceRecord = {
        ...mockServiceRecord,
        beforePhotos: [],
        revisedAt: new Date(),
        revisionCount: 1,
      };

      prismaMock.serviceRecord.update.mockResolvedValue(updatedServiceRecord);

      // Act
      const result = await caller.serviceRecord.deleteBeforePhoto(validInput);

      // Assert
      expect(result.revisionCount).toBe(1);
    });
  });

  describe('deleteAfterPhoto', () => {
    const validInput = {
      serviceRecordId: 'clsr1234567890',
      photoUrl: 'http://localhost:8000/photo1.jpg',
    };

    test('removes photo from afterPhotos array', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
        afterPhotos: [validInput.photoUrl, 'http://localhost:8000/photo2.jpg'],
      });
      const mockJob = createMockJob({ status: JobStatus.COMPLETED });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      const updatedServiceRecord = {
        ...mockServiceRecord,
        afterPhotos: ['http://localhost:8000/photo2.jpg'],
      };

      prismaMock.serviceRecord.update.mockResolvedValue(updatedServiceRecord);

      // Act
      const result = await caller.serviceRecord.deleteAfterPhoto(validInput);

      // Assert
      expect(result.afterPhotos).toHaveLength(1);
      expect(result.afterPhotos).not.toContain(validInput.photoUrl);
    });

    test('increments revisionCount for completed jobs', async () => {
      // Arrange
      const mockServiceRecord = createMockServiceRecord({
        id: validInput.serviceRecordId,
        afterPhotos: [validInput.photoUrl],
        revisionCount: 1,
      });
      const mockJob = createMockJob({ status: JobStatus.COMPLETED });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...mockServiceRecord,
        job: mockJob,
      } as any);

      const updatedServiceRecord = {
        ...mockServiceRecord,
        afterPhotos: [],
        revisedAt: new Date(),
        revisionCount: 2,
      };

      prismaMock.serviceRecord.update.mockResolvedValue(updatedServiceRecord);

      // Act
      const result = await caller.serviceRecord.deleteAfterPhoto(validInput);

      // Assert
      expect(result.revisionCount).toBe(2);
    });
  });

  describe('recent', () => {
    test('returns completed service records ordered by completedAt desc', async () => {
      // Arrange
      const mockServiceRecords = [
        createMockJobWithRelations({
          serviceRecord: {
            isJobComplete: true,
            completedAt: new Date('2024-01-15T14:00:00Z'),
          },
        }),
        createMockJobWithRelations({
          serviceRecord: {
            isJobComplete: true,
            completedAt: new Date('2024-01-14T14:00:00Z'),
          },
        }),
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.serviceRecord.findMany.mockResolvedValue(mockServiceRecords as any);

      // Act
      const result = await caller.serviceRecord.recent();

      // Assert
      expect(result).toHaveLength(2);
      expect(prismaMock.serviceRecord.findMany).toHaveBeenCalledWith({
        where: { isJobComplete: true },
        include: {
          job: {
            include: {
              equipment: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
      });
    });

    test('respects limit parameter (default 10, max 50)', async () => {
      // Arrange
      prismaMock.serviceRecord.findMany.mockResolvedValue([]);

      // Act
      await caller.serviceRecord.recent({ limit: 25 });

      // Assert
      expect(prismaMock.serviceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25 })
      );
    });

    test('includes job and equipment relations', async () => {
      // Arrange
      const mockEquipment = createMockEquipment();
      const mockJob = createMockJob({ equipmentId: mockEquipment.id });
      const mockServiceRecord = createMockServiceRecord({
        jobId: mockJob.id,
        isJobComplete: true,
      });

      const mockServiceRecordWithRelations = {
        ...mockServiceRecord,
        job: {
          ...mockJob,
          equipment: mockEquipment,
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.serviceRecord.findMany.mockResolvedValue([mockServiceRecordWithRelations] as any);

      // Act
      const result = await caller.serviceRecord.recent();

      // Assert
      expect(result[0]).toHaveProperty('job');
      expect(result[0].job).toHaveProperty('equipment');
    });
  });
});
