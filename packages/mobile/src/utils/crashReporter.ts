import { API_URL } from '../config/constants';
import { queueCrashReport, CrashPayload } from './crashQueue';

export type { CrashPayload };

const CRASH_REPORT_URL = API_URL.replace('/trpc', '/crash-report');

export async function reportCrash(payload: CrashPayload): Promise<void> {
  try {
    const response = await fetch(CRASH_REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await queueCrashReport(payload);
    }
  } catch {
    await queueCrashReport(payload);
  }
}
