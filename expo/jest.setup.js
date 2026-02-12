// Jest setup file

// Mock expo modules for unit tests
jest.mock('expo-location', () => ({}));
jest.mock('expo-task-manager', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
}));
