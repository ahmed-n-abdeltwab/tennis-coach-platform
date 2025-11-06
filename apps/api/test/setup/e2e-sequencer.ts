/**
 * Custom test sequencer for E2E tests
 *
 * Ensures tests run in optimal order for reliability and performance.
 * Tests are ordered based on dependencies and logical flow.
 */

import type { Test } from '@jest/test-result';
import Sequencer from '@jest/test-sequencer';

/**
 * E2E Test Sequencer
 *
 * Orders E2E tests to run in a logical sequence:
 * 1. Health checks (verify system is ready)
 * 2. Authentication (required for most other tests)
 * 3. Core entities (accounts, booking types, time slots)
 * 4. Business logic (sessions, calendar)
 * 5. Supporting features (messages, notifications, payments)
 * 6. Advanced features (discounts)
 *
 * This ordering:
 * - Catches critical failures early
 * - Reduces test interdependencies
 * - Improves test reliability
 * - Makes debugging easier
 */
class E2ESequencer extends Sequencer {
  override sort(tests: Test[]): Test[] {
    // Define test priority order (lower index = higher priority)
    const testPriority = [
      'health', // Health checks first - verify system is ready
      'iam', // Authentication second - required for most tests
      'user-registration-auth', // User registration and auth flows
      'accounts', // Account management
      'booking-types', // Booking types setup
      'time-slots', // Time slots setup
      'sessions', // Session booking and management
      'booking-workflow', // Complete booking workflows
      'calendar', // Calendar integration
      'messages', // Messaging features
      'notifications', // Notification workflows
      'notification-workflow', // Complete notification flows
      'payments', // Payment processing
      'discounts', // Discount features
      'admin-workflow', // Admin workflows
      'api-contract', // API contract validation
      'cross-module', // Cross-module interactions
      'middleware', // Middleware testing
      'event-handling', // Event handling
    ];

    return tests.sort((testA, testB) => {
      const pathA = testA.path;
      const pathB = testB.path;

      // Find priority for each test
      const priorityA = testPriority.findIndex(priority => pathA.includes(priority));
      const priorityB = testPriority.findIndex(priority => pathB.includes(priority));

      // If both tests have priorities, sort by priority
      if (priorityA !== -1 && priorityB !== -1) {
        return priorityA - priorityB;
      }

      // If only one has priority, prioritize it
      if (priorityA !== -1) return -1;
      if (priorityB !== -1) return 1;

      // If neither has priority, sort alphabetically
      return pathA.localeCompare(pathB);
    });
  }
}

export default E2ESequencer;
