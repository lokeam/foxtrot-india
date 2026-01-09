import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { prisma } from '../prisma';
import { JobStatus, Job, Equipment, ServiceRecord } from '@prisma/client';

const t = initTRPC.create();

type JobWithRelations = Job & {
  equipment: Pick<Equipment, 'id' | 'serialNumber' | 'make' | 'model' | 'engineHours' | 'projectSite' | 'latitude' | 'longitude'>;
  serviceRecord: Pick<ServiceRecord, 'id' | 'beforePhotos' | 'beforeNotes' | 'beforeEngineHours' | 'arrivedAt' | 'isCheckInComplete'> | null;
};

type JobWithFullRelations = Job & {
  equipment: Equipment;
  serviceRecord: ServiceRecord | null;
};

export const jobRouter = t.router({
  listActive: t.procedure
    .input(
      z.object({
        technicianId: z.string().min(1, 'Technician ID required'),
      })
    )
    .query(async ({ input }): Promise<JobWithRelations[]> => {
      const jobs = await prisma.job.findMany({
        where: {
          technicianId: input.technicianId,
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

      return jobs;
    }),

  listCompleted: t.procedure
    .input(
      z.object({
        technicianId: z.string().min(1, 'Technician ID required'),
      })
    )
    .query(async ({ input }): Promise<JobWithRelations[]> => {
      const jobs = await prisma.job.findMany({
        where: {
          technicianId: input.technicianId,
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

      return jobs;
    }),

  byId: t.procedure
    .input(
      z.object({
        jobId: z.string().cuid('Invalid job ID format'),
      })
    )
    .query(async ({ input }): Promise<JobWithFullRelations> => {
      const job = await prisma.job.findUnique({
        where: { id: input.jobId },
        include: {
          equipment: true,
          serviceRecord: true,
        },
      });

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      return job;
    }),
});
