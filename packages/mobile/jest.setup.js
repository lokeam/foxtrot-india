import '@testing-library/jest-native/extend-expect';
import { server } from './src/__tests__/msw/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Solution #3: Mock Expo's Winter runtime to prevent dynamic imports outside test scope
// The Winter runtime in expo/src/winter/runtime.native.ts uses dynamic imports that
// Jest 29.6.0+ blocks when executed outside the test context
jest.mock('expo', () => {
  const actualExpo = jest.requireActual('expo');
  return {
    ...actualExpo,
    // Mock the Winter runtime registry to prevent dynamic imports
    __ExpoImportMetaRegistry: {},
  };
}, { virtual: true });

// Mock global Winter runtime objects
global.__ExpoImportMetaRegistry = {};
global.structuredClone = global.structuredClone || ((obj) => JSON.parse(JSON.stringify(obj)));

// Mock expo/src/winter/runtime.native.ts to prevent dynamic imports
jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true });
jest.mock('expo/src/winter/installGlobal', () => ({}), { virtual: true });

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
  },
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

// Mock tRPC with proper nested structure (for unit tests)
// Integration tests will use MSW instead and should unmock this
jest.mock('./src/utils/trpc', () => ({
  trpc: {
    job: {
      byId: {
        useQuery: jest.fn(),
      },
      list: {
        useQuery: jest.fn(),
      },
      listActive: {
        useQuery: jest.fn(),
      },
      listCompleted: {
        useQuery: jest.fn(),
      },
    },
    serviceRecord: {
      checkIn: {
        useMutation: jest.fn(),
      },
      updateCheckIn: {
        useMutation: jest.fn(),
      },
      complete: {
        useMutation: jest.fn(),
      },
      updateCompletion: {
        useMutation: jest.fn(),
      },
      deletePhoto: {
        useMutation: jest.fn(),
      },
      deleteBeforePhoto: {
        useMutation: jest.fn(),
      },
      deleteAfterPhoto: {
        useMutation: jest.fn(),
      },
      recent: {
        useQuery: jest.fn(),
      },
    },
    useUtils: jest.fn(),
  },
}));

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
