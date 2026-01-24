import { describe, test, expect, beforeEach } from 'vitest';
import { JobStatus } from '@prisma/client';
import { prismaMock, resetPrismaMock } from '@/__tests__/helpers/prisma-mock';
import { createCaller } from '@/__tests__/helpers/trpc-caller';
import { expectTRPCError } from '@/__tests__/helpers/test-utils';
import {
  createMockJobWithRelations,
} from '@/__tests__/helpers/fixtures';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: Type assertions (as any) are necessary when mocking Prisma relations
// because the mock types don't perfectly match the complex Prisma return types

describe('job Router', () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(() => {
    resetPrismaMock();
    caller = createCaller();
  });

  describe('listActive', () => {
    const technicianId = 'tech_001';

    test('returns ASSIGNED and IN_PROGRESS jobs for technician', async () => {
      // Arrange
      const assignedJob = createMockJobWithRelations({
        job: {
          technicianId,
          status: JobStatus.ASSIGNED,
        },
        serviceRecord: null,
      });

      const inProgressJob = createMockJobWithRelations({
        job: {
          technicianId,
          status: JobStatus.IN_PROGRESS,
        },
        serviceRecord: {
          isCheckInComplete: true,
        },
      });

      const mockJobs = [assignedJob, inProgressJob];

      prismaMock.job.findMany.mockResolvedValue(mockJobs as any);

      // Act
      const result = await caller.job.listActive({ technicianId });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(JobStatus.ASSIGNED);
      expect(result[1].status).toBe(JobStatus.IN_PROGRESS);
      expect(prismaMock.job.findMany).toHaveBeenCalledWith({
        where: {
          technicianId,
          status: {
            in: [JobStatus.ASSIGNED, JobStatus.IN_PROGRESS],
          },
        },
        include: {
          equipment: {
            select: {
              id: true,
              serialNumber: true,
              make: true,
              model: true,
              engineHours: true,
              projectSite: true,
              latitude: true,
              longitude: true,
            },
          },
          serviceRecord: {
            select: {
              id: true,
              beforePhotos: true,
              beforeNotes: true,
              beforeEngineHours: true,
              arrivedAt: true,
              isCheckInComplete: true,
              revisedAt: true,
              revisionCount: true,
            },
          },
        },
        orderBy: {
          assignedAt: 'desc',
        },
      });
    });

    test('excludes COMPLETED and CANCELLED jobs', async () => {
      // Arrange
      const assignedJob = createMockJobWithRelations({
        job: {
          technicianId,
          status: JobStatus.ASSIGNED,
        },
      });

      // Mock should only return active jobs
      prismaMock.job.findMany.mockResolvedValue([assignedJob] as any);

      // Act
      const result = await caller.job.listActive({ technicianId });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).not.toBe(JobStatus.COMPLETED);
      expect(result[0].status).not.toBe(JobStatus.CANCELLED);

      // Verify the query filters correctly
      const callArgs = prismaMock.job.findMany.mock.calls[0][0];
      expect(callArgs?.where?.status).toHaveProperty('in');
      expect((callArgs?.where?.status as any)?.in).toEqual([JobStatus.ASSIGNED, JobStatus.IN_PROGRESS]);
    });

    test('includes equipment and serviceRecord relations', async () => {
      // Arrange
      const jobWithRelations = createMockJobWithRelations({
        job: {
          technicianId,
          status: JobStatus.IN_PROGRESS,
        },
        serviceRecord: {
          isCheckInComplete: true,
        },
      });

      prismaMock.job.findMany.mockResolvedValue([jobWithRelations] as any);

      // Act
      const result = await caller.job.listActive({ technicianId });

      // Assert
      expect(result[0]).toHaveProperty('equipment');
      expect(result[0].equipment).toHaveProperty('serialNumber');
      expect(result[0].equipment).toHaveProperty('make');
      expect(result[0].equipment).toHaveProperty('model');
      expect(result[0]).toHaveProperty('serviceRecord');
      expect(result[0].serviceRecord).toHaveProperty('id');
      expect(result[0].serviceRecord).toHaveProperty('beforePhotos');
    });

    test('orders by assignedAt desc', async () => {
      // Arrange
      const olderJob = createMockJobWithRelations({
        job: {
          technicianId,
          status: JobStatus.ASSIGNED,
          assignedAt: new Date('2024-01-14T08:00:00Z'),
        },
      });

      const newerJob = createMockJobWithRelations({
        job: {
          technicianId,
          status: JobStatus.ASSIGNED,
          assignedAt: new Date('2024-01-15T08:00:00Z'),
        },
      });

      prismaMock.job.findMany.mockResolvedValue([newerJob, olderJob] as any);

      // Act
      const result = await caller.job.listActive({ technicianId });

      // Assert
      expect(result[0].assignedAt).toEqual(newerJob.assignedAt);
      expect(result[1].assignedAt).toEqual(olderJob.assignedAt);

      // Verify orderBy in query
      const callArgs = prismaMock.job.findMany.mock.calls[0][0];
      expect(callArgs?.orderBy).toEqual({ assignedAt: 'desc' });
    });

    test('returns empty array when no active jobs', async () => {
      // Arrange
      prismaMock.job.findMany.mockResolvedValue([]);

      // Act
      const result = await caller.job.listActive({ technicianId });

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('listCompleted', () => {
    const technicianId = 'tech_001';

    test('returns only COMPLETED jobs for technician', async () => {
      // Arrange
      const completedJob1 = createMockJobWithRelations({
        job: {
          technicianId,
          status: JobStatus.COMPLETED,
          updatedAt: new Date('2024-01-15T14:00:00Z'),
        },
        serviceRecord: {
          isJobComplete: true,
          completedAt: new Date('2024-01-15T14:00:00Z'),
        },
      });

      const completedJob2 = createMockJobWithRelations({
        job: {
          technicianId,
          status: JobStatus.COMPLETED,
          updatedAt: new Date('2024-01-14T14:00:00Z'),
        },
        serviceRecord: {
          isJobComplete: true,
          completedAt: new Date('2024-01-14T14:00:00Z'),
        },
      });

      prismaMock.job.findMany.mockResolvedValue([completedJob1, completedJob2] as any);

      // Act
      const result = await caller.job.listCompleted({ technicianId });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(JobStatus.COMPLETED);
      expect(result[1].status).toBe(JobStatus.COMPLETED);
      expect(prismaMock.job.findMany).toHaveBeenCalledWith({
        where: {
          technicianId,
          status: JobStatus.COMPLETED,
        },
        include: {
          equipment: {
            select: {
              id: true,
              serialNumber: true,
              make: true,
              model: true,
              engineHours: true,
              projectSite: true,
              latitude: true,
              longitude: true,
            },
          },
          serviceRecord: {
            select: {
              id: true,
              beforePhotos: true,
              beforeNotes: true,
              beforeEngineHours: true,
              arrivedAt: true,
              isCheckInComplete: true,
              revisedAt: true,
              revisionCount: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    });

    test('orders by updatedAt desc', async () => {
      // Arrange
      const olderJob = createMockJobWithRelations({
        job: {
          technicianId,
          status: JobStatus.COMPLETED,
          updatedAt: new Date('2024-01-14T14:00:00Z'),
        },
      });

      const newerJob = createMockJobWithRelations({
        job: {
          technicianId,
          status: JobStatus.COMPLETED,
          updatedAt: new Date('2024-01-15T14:00:00Z'),
        },
      });

      prismaMock.job.findMany.mockResolvedValue([newerJob, olderJob] as any);

      // Act
      const result = await caller.job.listCompleted({ technicianId });

      // Assert
      expect(result[0].updatedAt).toEqual(newerJob.updatedAt);
      expect(result[1].updatedAt).toEqual(olderJob.updatedAt);

      // Verify orderBy in query
      const callArgs = prismaMock.job.findMany.mock.calls[0][0];
      expect(callArgs?.orderBy).toEqual({ updatedAt: 'desc' });
    });

    test('includes equipment and serviceRecord relations', async () => {
      // Arrange
      const completedJob = createMockJobWithRelations({
        job: {
          technicianId,
          status: JobStatus.COMPLETED,
        },
        serviceRecord: {
          isJobComplete: true,
        },
      });

      prismaMock.job.findMany.mockResolvedValue([completedJob] as any);

      // Act
      const result = await caller.job.listCompleted({ technicianId });

      // Assert
      expect(result[0]).toHaveProperty('equipment');
      expect(result[0].equipment).toHaveProperty('serialNumber');
      expect(result[0]).toHaveProperty('serviceRecord');
      expect(result[0].serviceRecord).toHaveProperty('revisionCount');
    });
  });

  describe('byId', () => {
    const jobId = 'cljk1234567890';

    test('returns job with full equipment and serviceRecord', async () => {
      // Arrange
      const mockJob = createMockJobWithRelations({
        job: {
          id: jobId,
          status: JobStatus.IN_PROGRESS,
        },
        serviceRecord: {
          isCheckInComplete: true,
        },
      });

      prismaMock.job.findUnique.mockResolvedValue(mockJob as any);

      // Act
      const result = await caller.job.byId({ jobId });

      // Assert
      expect(result).toEqual(mockJob);
      expect(result.id).toBe(jobId);
      expect(result).toHaveProperty('equipment');
      expect(result).toHaveProperty('serviceRecord');
      expect(prismaMock.job.findUnique).toHaveBeenCalledWith({
        where: { id: jobId },
        include: {
          equipment: true,
          serviceRecord: true,
        },
      });
    });

    test('throws NOT_FOUND when job does not exist', async () => {
      // Arrange
      prismaMock.job.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expectTRPCError(
        () => caller.job.byId({ jobId }),
        'NOT_FOUND',
        'Job not found'
      );
    });

    test('validates CUID format', async () => {
      // Arrange
      const invalidJobId = 'invalid-id-format';

      // Act & Assert
      await expect(caller.job.byId({ jobId: invalidJobId })).rejects.toThrow();
    });
  });
});
