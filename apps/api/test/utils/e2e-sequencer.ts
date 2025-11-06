/**
 * Custom test sequencer for E2E tests
 * Ensures tests run in optimal order for reliability
 */

import type { Test } from '@jest/test-result';
import Sequencer from '@jest/test-sequencer';

class E2ESequencer extends Sequencer {
  override sort(tests: Test[]): Test[] {
    // Define test priority order
    const testPriority = [
      'health', // Health checks first
      'iam', // Authentication second
      'accounts', // Account management
      'booking-types', // Booking types
      'time-slots', // Time slots
      'sessions', // Sessions
      'calendar', // Calendar
      'messages', // Messages
      'notifications', // Notifications
      'payments', // Payments
      'discounts', // Discounts last
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
