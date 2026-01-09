import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { prisma } from '../prisma';
import { JobStatus, ServiceRecord, Job, Equipment } from '@prisma/client';

const t = initTRPC.create();

type ServiceRecordWithJob = ServiceRecord & {
  job: Job & {
    equipment: Equipment;
  };
};

export const serviceRecordRouter = t.router({
  checkIn: t.procedure
    .input(
      z.object({
        jobId: z.string().cuid('Invalid job ID format'),
        beforePhotos: z.array(z.string().url('Invalid photo URL')).max(4, 'Maximum 4 photos allowed'),
        beforeNotes: z.string().max(2000, 'Notes cannot exceed 2000 characters').nullable(),
        beforeEngineHours: z.number().int('Engine hours must be integer').positive('Engine hours must be positive'),
        arrivedAt: z.coerce.date(),
      })
    )
    .mutation(async ({ input }): Promise<ServiceRecord> => {
      const job = await prisma.job.findUnique({
        where: { id: input.jobId },
      });

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      if (job.status !== JobStatus.ASSIGNED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot check in to job with status ${job.status}. Job must be ASSIGNED.`,
        });
      }

      const existingServiceRecord = await prisma.serviceRecord.findUnique({
        where: { jobId: input.jobId },
      });

      if (existingServiceRecord) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Service record already exists for this job',
        });
      }

      const serviceRecord = await prisma.$transaction(async (tx) => {
        const newServiceRecord = await tx.serviceRecord.create({
          data: {
            jobId: input.jobId,
            beforePhotos: input.beforePhotos,
            beforeNotes: input.beforeNotes,
            beforeEngineHours: input.beforeEngineHours,
            arrivedAt: input.arrivedAt,
            isCheckInComplete: true,
          },
        });

        await tx.job.update({
          where: { id: input.jobId },
          data: {
            status: JobStatus.IN_PROGRESS,
          },
        });

        return newServiceRecord;
      });

      return serviceRecord;
    }),

  complete: t.procedure
    .input(
      z.object({
        serviceRecordId: z.string().cuid('Invalid service record ID format'),
        afterPhotos: z.array(z.string().url('Invalid photo URL')).max(4, 'Maximum 4 photos allowed'),
        diagnosis: z.string().min(1, 'Diagnosis required').max(2000, 'Diagnosis cannot exceed 2000 characters'),
        workPerformed: z.string().min(1, 'Work performed required').max(2000, 'Work performed cannot exceed 2000 characters'),
        partsUsed: z.string().max(2000, 'Parts used cannot exceed 2000 characters').nullable(),
        afterEngineHours: z.number().int('Engine hours must be integer').positive('Engine hours must be positive'),
        completedAt: z.coerce.date(),
      })
    )
    .mutation(async ({ input }): Promise<ServiceRecord> => {
      const serviceRecord = await prisma.serviceRecord.findUnique({
        where: { id: input.serviceRecordId },
        include: {
          job: true,
        },
      });

      if (!serviceRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service record not found',
        });
      }

      if (!serviceRecord.isCheckInComplete) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot complete job before check-in is complete',
        });
      }

      if (serviceRecord.isJobComplete) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Job is already completed',
        });
      }

      if (serviceRecord.job.status !== JobStatus.IN_PROGRESS) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot complete job with status ${serviceRecord.job.status}. Job must be IN_PROGRESS.`,
        });
      }

      if (input.afterEngineHours < serviceRecord.beforeEngineHours) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'After engine hours cannot be less than before engine hours',
        });
      }

      const updatedServiceRecord = await prisma.$transaction(async (tx) => {
        const updated = await tx.serviceRecord.update({
          where: { id: input.serviceRecordId },
          data: {
            afterPhotos: input.afterPhotos,
            diagnosis: input.diagnosis,
            workPerformed: input.workPerformed,
            partsUsed: input.partsUsed,
            afterEngineHours: input.afterEngineHours,
            completedAt: input.completedAt,
            isJobComplete: true,
          },
        });

        await tx.job.update({
          where: { id: serviceRecord.jobId },
          data: {
            status: JobStatus.COMPLETED,
          },
        });

        return updated;
      });

      return updatedServiceRecord;
    }),

  updateCheckIn: t.procedure
    .input(
      z.object({
        serviceRecordId: z.string().cuid('Invalid service record ID format'),
        beforePhotos: z.array(z.string().url('Invalid photo URL')).max(4, 'Maximum 4 photos allowed'),
        beforeNotes: z.string().max(2000, 'Notes cannot exceed 2000 characters').nullable(),
        beforeEngineHours: z.number().int('Engine hours must be integer').positive('Engine hours must be positive'),
      })
    )
    .mutation(async ({ input }): Promise<ServiceRecord> => {
      const serviceRecord = await prisma.serviceRecord.findUnique({
        where: { id: input.serviceRecordId },
        include: {
          job: true,
        },
      });

      if (!serviceRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service record not found',
        });
      }

      const isCompletedJob = serviceRecord.job.status === JobStatus.COMPLETED;

      const updatedServiceRecord = await prisma.serviceRecord.update({
        where: { id: input.serviceRecordId },
        data: {
          beforePhotos: input.beforePhotos,
          beforeNotes: input.beforeNotes,
          beforeEngineHours: input.beforeEngineHours,
          ...(isCompletedJob && {
            revisedAt: new Date(),
            revisionCount: { increment: 1 },
          }),
        },
      });

      return updatedServiceRecord;
    }),

  updateCompletion: t.procedure
    .input(
      z.object({
        serviceRecordId: z.string().cuid('Invalid service record ID format'),
        afterPhotos: z.array(z.string().url('Invalid photo URL')).max(4, 'Maximum 4 photos allowed'),
        diagnosis: z.string().min(1, 'Diagnosis required').max(2000, 'Diagnosis cannot exceed 2000 characters'),
        workPerformed: z.string().min(1, 'Work performed required').max(2000, 'Work performed cannot exceed 2000 characters'),
        partsUsed: z.string().max(2000, 'Parts used cannot exceed 2000 characters').nullable(),
        afterEngineHours: z.number().int('Engine hours must be integer').positive('Engine hours must be positive'),
      })
    )
    .mutation(async ({ input }): Promise<ServiceRecord> => {
      const serviceRecord = await prisma.serviceRecord.findUnique({
        where: { id: input.serviceRecordId },
        include: {
          job: true,
        },
      });

      if (!serviceRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service record not found',
        });
      }

      const isCompletedJob = serviceRecord.job.status === JobStatus.COMPLETED;

      if (!serviceRecord.isJobComplete && !isCompletedJob) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Job has not been completed yet',
        });
      }

      if (input.afterEngineHours < serviceRecord.beforeEngineHours) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'After engine hours cannot be less than before engine hours',
        });
      }

      const updatedServiceRecord = await prisma.serviceRecord.update({
        where: { id: input.serviceRecordId },
        data: {
          afterPhotos: input.afterPhotos,
          diagnosis: input.diagnosis,
          workPerformed: input.workPerformed,
          partsUsed: input.partsUsed,
          afterEngineHours: input.afterEngineHours,
          ...(isCompletedJob && {
            revisedAt: new Date(),
            revisionCount: { increment: 1 },
          }),
        },
      });

      return updatedServiceRecord;
    }),

  deleteBeforePhoto: t.procedure
    .input(
      z.object({
        serviceRecordId: z.string().cuid('Invalid service record ID format'),
        photoUrl: z.string().url('Invalid photo URL'),
      })
    )
    .mutation(async ({ input }): Promise<ServiceRecord> => {
      const serviceRecord = await prisma.serviceRecord.findUnique({
        where: { id: input.serviceRecordId },
        include: {
          job: true,
        },
      });

      if (!serviceRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service record not found',
        });
      }

      const updatedPhotos = serviceRecord.beforePhotos.filter(
        (photo) => photo !== input.photoUrl
      );

      const isCompletedJob = serviceRecord.job.status === JobStatus.COMPLETED;

      const updatedServiceRecord = await prisma.serviceRecord.update({
        where: { id: input.serviceRecordId },
        data: {
          beforePhotos: updatedPhotos,
          ...(isCompletedJob && {
            revisedAt: new Date(),
            revisionCount: { increment: 1 },
          }),
        },
      });

      return updatedServiceRecord;
    }),

  deleteAfterPhoto: t.procedure
    .input(
      z.object({
        serviceRecordId: z.string().cuid('Invalid service record ID format'),
        photoUrl: z.string().url('Invalid photo URL'),
      })
    )
    .mutation(async ({ input }): Promise<ServiceRecord> => {
      const serviceRecord = await prisma.serviceRecord.findUnique({
        where: { id: input.serviceRecordId },
        include: {
          job: true,
        },
      });

      if (!serviceRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service record not found',
        });
      }

      const updatedPhotos = serviceRecord.afterPhotos.filter(
        (photo) => photo !== input.photoUrl
      );

      const isCompletedJob = serviceRecord.job.status === JobStatus.COMPLETED;

      const updatedServiceRecord = await prisma.serviceRecord.update({
        where: { id: input.serviceRecordId },
        data: {
          afterPhotos: updatedPhotos,
          ...(isCompletedJob && {
            revisedAt: new Date(),
            revisionCount: { increment: 1 },
          }),
        },
      });

      return updatedServiceRecord;
    }),

  recent: t.procedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).optional().default(10),
        })
        .optional()
    )
    .query(async ({ input }): Promise<ServiceRecordWithJob[]> => {
      const limit = input?.limit ?? 10;

      const serviceRecords = await prisma.serviceRecord.findMany({
        where: {
          isJobComplete: true,
        },
        include: {
          job: {
            include: {
              equipment: true,
            },
          },
        },
        orderBy: {
          completedAt: 'desc',
        },
        take: limit,
      });

      return serviceRecords;
    }),
});
