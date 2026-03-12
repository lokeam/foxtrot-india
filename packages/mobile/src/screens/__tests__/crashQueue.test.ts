import AsyncStorage from '@react-native-async-storage/async-storage';
import { queueCrashReport, flushCrashQueue, CrashPayload } from '../../utils/crashQueue';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

const QUEUE_KEY = 'crash_report_queue';

function makePayload(id: number): CrashPayload {
  return {
    message: `crash ${id}`,
    componentStack: `stack ${id}`,
  };
}

describe('crashQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockImplementation(() => Promise.resolve(null));
    mockSetItem.mockImplementation(() => Promise.resolve());
    mockRemoveItem.mockImplementation(() => Promise.resolve());
  });

  it('queueCrashReport stores a report', async () => {
    const payload = makePayload(1);

    await queueCrashReport(payload);

    expect(mockSetItem).toHaveBeenCalledWith(
      QUEUE_KEY,
      JSON.stringify([payload])
    );
  });

  it('queueCrashReport appends to existing queue', async () => {
    const existing = makePayload(1);
    const added = makePayload(2);
    mockGetItem.mockImplementation(() => Promise.resolve(JSON.stringify([existing])));

    await queueCrashReport(added);

    expect(mockSetItem).toHaveBeenCalledWith(
      QUEUE_KEY,
      JSON.stringify([existing, added])
    );
  });

  it('queue does not exceed 20 items', async () => {
    const existing = Array.from({ length: 20 }, (_, i) => makePayload(i));
    mockGetItem.mockImplementation(() => Promise.resolve(JSON.stringify(existing)));

    const newest = makePayload(99);
    await queueCrashReport(newest);

    const written = JSON.parse(mockSetItem.mock.calls[0][1]) as CrashPayload[];
    expect(written).toHaveLength(20);
    expect(written[0].message).toBe('crash 1');
    expect(written[19].message).toBe('crash 99');
  });

  it('flushCrashQueue sends all reports and clears queue', async () => {
    const queue = [makePayload(1), makePayload(2), makePayload(3)];
    mockGetItem.mockImplementation(() => Promise.resolve(JSON.stringify(queue)));

    const reportFn = jest.fn(() => Promise.resolve());

    await flushCrashQueue(reportFn);

    expect(reportFn).toHaveBeenCalledTimes(3);
    expect(mockRemoveItem).toHaveBeenCalledWith(QUEUE_KEY);
  });

  it('flushCrashQueue stops on first failure and preserves remaining', async () => {
    const queue = [makePayload(1), makePayload(2), makePayload(3)];
    mockGetItem.mockImplementation(() => Promise.resolve(JSON.stringify(queue)));

    let callCount = 0;
    const reportFn = jest.fn(() => {
      callCount++;
      if (callCount >= 2) return Promise.reject(new Error('network down'));
      return Promise.resolve();
    });

    await flushCrashQueue(reportFn);

    expect(reportFn).toHaveBeenCalledTimes(2);
    const remaining = JSON.parse(mockSetItem.mock.calls[0][1]) as CrashPayload[];
    expect(remaining).toHaveLength(2);
    expect(remaining[0].message).toBe('crash 2');
    expect(remaining[1].message).toBe('crash 3');
  });

  it('flushCrashQueue handles empty queue gracefully', async () => {
    const reportFn = jest.fn();

    await flushCrashQueue(reportFn);

    expect(reportFn).not.toHaveBeenCalled();
  });
});
