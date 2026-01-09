import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { prisma } from './prisma';
import { uploadPhoto, deletePhotos } from './storage';
import { EquipmentStatus } from '@prisma/client';
import { jobRouter } from './routers/job';
import { serviceRecordRouter } from './routers/serviceRecord';

const t = initTRPC.create();

const EquipmentStatusEnum = z.enum(['OPERATIONAL', 'NEEDS_SERVICE', 'BROKEN', 'IN_REPAIR']);

const InspectionCreateInput = z.object({
  equipmentId: z.string().cuid('Invalid equipment ID format'),
  status: EquipmentStatusEnum,
  engineHours: z
    .number()
    .int('Engine hours must be integer')
    .positive('Engine hours must be positive'),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional(),
  photos: z.array(z.string()).min(0).max(4, 'Maximum 4 photos allowed'),
  latitude: z.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude'),
  longitude: z.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude'),
  inspectorName: z.string().min(1, 'Inspector name required').max(100, 'Inspector name too long'),
});

export const appRouter = t.router({
  job: jobRouter,
  serviceRecord: serviceRecordRouter,

  equipment: t.router({
    list: t.procedure.query(async () => {
      const equipment = await prisma.equipment.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 100,
      });
      return equipment;
    }),

    byId: t.procedure
      .input(z.object({ id: z.string().cuid() }))
      .query(async ({ input }) => {
        const equipment = await prisma.equipment.findUnique({
          where: { id: input.id },
          include: {
            inspections: {
              orderBy: { timestamp: 'desc' },
              take: 50,
            },
          },
        });

        if (!equipment) {
          throw new Error('Equipment not found');
        }

        return equipment;
      }),
  }),

  inspection: t.router({
    create: t.procedure.input(InspectionCreateInput).mutation(async ({ input }) => {
      const equipment = await prisma.equipment.findUnique({
        where: { id: input.equipmentId },
      });

      if (!equipment) {
        throw new Error('Equipment not found');
      }

      let photoUrls: string[] = [];

      try {
        for (let i = 0; i < input.photos.length; i++) {
          const tempId = `temp-${Date.now()}`;
          const url = await uploadPhoto(tempId, input.photos[i], i);
          photoUrls.push(url);
        }

        const inspection = await prisma.$transaction(async (tx) => {
          const newInspection = await tx.inspection.create({
            data: {
              equipmentId: input.equipmentId,
              status: input.status as EquipmentStatus,
              engineHours: input.engineHours,
              notes: input.notes,
              photoUrls,
              inspectorName: input.inspectorName,
              latitude: input.latitude,
              longitude: input.longitude,
            },
          });

          await tx.equipment.update({
            where: { id: input.equipmentId },
            data: {
              status: input.status as EquipmentStatus,
              engineHours: input.engineHours,
              lastInspectionAt: new Date(),
            },
          });

          return newInspection;
        });

        return inspection;
      } catch (error) {
        if (photoUrls.length > 0) {
          await deletePhotos(photoUrls);
        }
        throw error;
      }
    }),

    recent: t.procedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(50).optional().default(20),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const limit = input?.limit ?? 20;

        const inspections = await prisma.inspection.findMany({
          orderBy: { timestamp: 'desc' },
          take: limit,
          include: {
            equipment: {
              select: {
                serialNumber: true,
                make: true,
                model: true,
              },
            },
          },
        });

        return inspections;
      }),
  }),
});

export type AppRouter = typeof appRouter;
