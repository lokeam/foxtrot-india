// Helper to assert TRPCError
// Note: expect is globally available via Vitest globals configuration
export async function expectTRPCError(
  fn: () => Promise<unknown>,
  code: string,
  messageContains?: string
): Promise<void> {
  await expect(fn()).rejects.toThrow(
    expect.objectContaining({
      code,
      ...(messageContains && { message: expect.stringContaining(messageContains) }),
    })
  );
}

// Helper to create valid CUID
export function createCUID(): string {
  return 'cljk' + Math.random().toString(36).substring(2, 15);
}

// Helper to create photo URLs
export function createPhotoUrls(count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    `http://localhost:8000/object/public/inspection-photos/photo_${i + 1}.jpg`
  );
}

// Helper to wait for async operations
export async function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
