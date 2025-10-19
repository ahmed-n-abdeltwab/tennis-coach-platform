import { AuthHeaders, AuthTestHelper, TestUser } from './auth-test-helper';

export class UserRoleTestHelper {
  private authHelper: AuthTestHelper;

  constructor(jwtSecret?: string) {
    this.authHelper = new AuthTestHelper(jwtSecret);
  }

  createUserTestData(role: 'user' | 'coach', overrides?: Partial<TestUser>): TestUser {
    const baseData: TestUser = {
      id: `test-${role}-id`,
      email: `${role}@example.com`,
      name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      type: role,
      ...overrides,
    };
    return baseData;
  }

  createRoleAuthHeaders(role: 'user' | 'coach', overrides?: Partial<TestUser>): AuthHeaders {
    const userData = this.createUserTestData(role, overrides);
    if (role === 'user') {
      return this.authHelper.createUserAuthHeaders(userData);
    } else {
      return this.authHelper.createCoachAuthHeaders(userData);
    }
  }

  createMultipleRoleUsers(count: number = 2): { users: TestUser[]; coaches: TestUser[] } {
    const users: TestUser[] = [];
    const coaches: TestUser[] = [];
    for (let i = 0; i < count; i++) {
      users.push(
        this.createUserTestData('user', {
          id: `test-user-${i}`,
          email: `user${i}@example.com`,
          name: `Test User ${i}`,
        })
      );
      coaches.push(
        this.createUserTestData('coach', {
          id: `test-coach-${i}`,
          email: `coach${i}@example.com`,
          name: `Test Coach ${i}`,
        })
      );
    }
    return { users, coaches };
  }

  createMultipleRoleAuthHeaders(count: number = 2): {
    userHeaders: AuthHeaders[];
    coachHeaders: AuthHeaders[];
  } {
    const { users, coaches } = this.createMultipleRoleUsers(count);
    const userHeaders = users.map(user => this.authHelper.createUserAuthHeaders(user));
    const coachHeaders = coaches.map(coach => this.authHelper.createCoachAuthHeaders(coach));
    return { userHeaders, coachHeaders };
  }
}
