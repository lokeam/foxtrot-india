import { appRouter } from '@/router';
import { inferProcedureInput } from '@trpc/server';
import type { AppRouter } from '@/router';

// Create a caller for testing tRPC procedures
export function createCaller(): ReturnType<typeof appRouter.createCaller> {
  return appRouter.createCaller({});
}

// Type helpers for procedure inputs
export type ServiceRecordCheckInInput = inferProcedureInput<AppRouter['serviceRecord']['checkIn']>;
export type ServiceRecordCompleteInput = inferProcedureInput<AppRouter['serviceRecord']['complete']>;
export type ServiceRecordUpdateCheckInInput = inferProcedureInput<AppRouter['serviceRecord']['updateCheckIn']>;
export type ServiceRecordUpdateCompletionInput = inferProcedureInput<AppRouter['serviceRecord']['updateCompletion']>;
export type ServiceRecordDeleteBeforePhotoInput = inferProcedureInput<AppRouter['serviceRecord']['deleteBeforePhoto']>;
export type ServiceRecordDeleteAfterPhotoInput = inferProcedureInput<AppRouter['serviceRecord']['deleteAfterPhoto']>;
export type ServiceRecordRecentInput = inferProcedureInput<AppRouter['serviceRecord']['recent']>;
export type JobListActiveInput = inferProcedureInput<AppRouter['job']['listActive']>;
export type JobListCompletedInput = inferProcedureInput<AppRouter['job']['listCompleted']>;
export type JobByIdInput = inferProcedureInput<AppRouter['job']['byId']>;
