import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'crash_report_queue';
const MAX_QUEUE_SIZE = 20;

export type CrashPayload = {
  message: string;
  componentStack: string;
  screenName?: string;
  platform?: string;
  appVersion?: string;
};

export async function queueCrashReport(payload: CrashPayload): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: CrashPayload[] = raw ? JSON.parse(raw) : [];

    queue.push(payload);

    if (queue.length > MAX_QUEUE_SIZE) {
      queue.shift();
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // swallow — queue must never throw
  }
}

export async function flushCrashQueue(reportFn: (payload: CrashPayload) => Promise<void>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return;

    const queue: CrashPayload[] = JSON.parse(raw);
    if (queue.length === 0) return;

    let flushed = 0;
    for (let i = 0; i < queue.length; i++) {
      try {
        await reportFn(queue[i]);
        flushed++;
      } catch {
        break;
      }
    }

    const remaining = queue.slice(flushed);
    if (remaining.length === 0) {
      await AsyncStorage.removeItem(QUEUE_KEY);
    } else {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    }
  } catch {
    // swallow — flush must never throw
  }
}
