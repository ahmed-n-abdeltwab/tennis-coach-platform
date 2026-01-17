import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { vi } from 'vitest';

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Memory management and cleanup
let cleanupTasks: (() => void)[] = [];

// Global test cleanup to prevent memory leaks
afterEach(() => {
  // Clean up React Testing Library
  cleanup();

  // Clear all mocks but don't clear timers unless they're mocked
  vi.clearAllMocks();

  // Run any registered cleanup tasks
  cleanupTasks.forEach(task => {
    try {
      task();
    } catch {
      // Ignore cleanup errors to prevent test failures
    }
  });
  cleanupTasks = [];

  // Force garbage collection if available (Node.js only)
  if (global.gc) {
    global.gc();
  }
});

// Global teardown
afterAll(() => {
  // Restore all mocks
  vi.restoreAllMocks();

  // Final cleanup
  cleanupTasks.forEach(task => {
    try {
      task();
    } catch {
      // Ignore cleanup errors
    }
  });
  cleanupTasks = [];

  // Force final garbage collection
  if (global.gc) {
    global.gc();
  }
});

// Export cleanup registration function for tests that need custom cleanup
export const registerCleanup = (task: () => void) => {
  cleanupTasks.push(task);
};
