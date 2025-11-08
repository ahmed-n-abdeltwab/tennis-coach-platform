// MockCoach is now an alias for MockAccount with COACH role

import { MockAccount } from './account.mock';

// Import MockAccount from user.mock.ts for the full interface
export interface MockCoach extends MockAccount {}
