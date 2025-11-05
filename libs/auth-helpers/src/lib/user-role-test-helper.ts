import { Role } from '@prisma/client';

import { AuthHeaders, AuthTestHelper, TestUser } from './auth-test-helper';

export class UserRoleTestHelper {
  private authHelper: AuthTestHelper;

  constructor(jwtSecret?: string) {
    this.authHelper = new AuthTestHelper(jwtSecret);
  }

  createUserTestData(role: Role, overrides?: Partial<TestUser>): TestUser {
    const baseData: TestUser = {
      id: `test-${role}-id`,
      email: `${role}@example.com`,
      role,
      ...overrides,
    };
    return baseData;
  }

  createRoleAuthHeaders(role: Role, overrides?: Partial<TestUser>): AuthHeaders {
    const userData = this.createUserTestData(role, overrides);
    if (role in UserRole) {
      return this.authHelper.createUserAuthHeaders(userData);
    } else {
      return this.authHelper.createCoachAuthHeaders(userData);
    }
  }

  createMultipleRoleUsers(count = 2): { users: TestUser[]; coaches: TestUser[] } {
    const users: TestUser[] = [];
    const coaches: TestUser[] = [];
    for (let i = 0; i < count; i++) {
      users.push(
        this.createUserTestData(Role.USER, {
          id: `test-user-${i}`,
          email: `user${i}@example.com`,
        })
      );
      coaches.push(
        this.createUserTestData(Role.COACH, {
          id: `test-coach-${i}`,
          email: `coach${i}@example.com`,
        })
      );
    }
    return { users, coaches };
  }

  createMultipleRoleAuthHeaders(count = 2): {
    userHeaders: AuthHeaders[];
    coachHeaders: AuthHeaders[];
  } {
    const { users, coaches } = this.createMultipleRoleUsers(count);
    const userHeaders = users.map(user => this.authHelper.createUserAuthHeaders(user));
    const coachHeaders = coaches.map(coach => this.authHelper.createCoachAuthHeaders(coach));
    return { userHeaders, coachHeaders };
  }
}
