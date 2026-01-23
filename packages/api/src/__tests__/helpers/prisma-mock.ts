import { vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>;

// Mock the prisma module
vi.mock('@/prisma', () => ({
  prisma: prismaMock,
}));

// Helper to reset mock between tests
export function resetPrismaMock(): void {
  mockReset(prismaMock);
}

// Helper to mock transaction
export function mockTransaction(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation(async (fn: any) => {
    return await fn(prismaMock);
  });
}
