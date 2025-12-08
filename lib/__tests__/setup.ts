// Test setup file
import { beforeAll, afterAll } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock IntersectionObserver for tests
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

beforeAll(async () => {
  // Setup code before all tests
});

afterAll(async () => {
  // Cleanup code after all tests
});
