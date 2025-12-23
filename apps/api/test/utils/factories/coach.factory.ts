/**
 * Coach mock factory for creating test Account data with COACH role
 */

import { Role } from '@prisma/client';

import { MockAccount } from './account.factory';
import { BaseMockFactory } from './base-factory';

// MockCoach extends MockAccount with COACH role
export interface MockCoach extends MockAccount {}

export class CoachMockFactory extends BaseMockFactory<MockCoach> {
  create(overrides?: Partial<MockCoach>): MockCoach {
    const id = this.generateId();
    const now = new Date();

    return {
      id,
      email: this.generateEmail('coach'),
      name: `Coach ${id.slice(-8)}`,
      passwordHash: '$2b$10$test.hash.for.testing.purposes.only',
      bio: this.randomBio(),
      credentials: this.randomCredentials(),
      philosophy: this.randomPhilosophy(),
      profileImage: this.randomProfileImage(),
      disability: false,
      createdAt: now,
      updatedAt: now,
      isOnline: true,
      isActive: true,
      role: Role.COACH,
      ...overrides,
    };
  }

  createAdmin(overrides?: Partial<MockCoach>): MockCoach {
    return this.create({
      role: Role.ADMIN,
      name: `Admin Coach ${this.generateId().slice(-8)}`,
      ...overrides,
    });
  }

  createRegularCoach(overrides?: Partial<MockCoach>): MockCoach {
    return this.create({
      role: Role.COACH,
      name: `Regular Coach ${this.generateId().slice(-8)}`,
      ...overrides,
    });
  }

  private randomBio(): string {
    const bios = [
      'Experienced tennis coach with 10+ years of professional training.',
      'Former professional player turned passionate coach.',
      'Specialized in junior development and competitive training.',
      'Expert in technique refinement and mental game coaching.',
    ];
    return bios[Math.floor(Math.random() * bios.length)] ?? 'default bio';
  }

  private randomCredentials(): string {
    const credentials = [
      'USPTA Certified Professional',
      'PTR Professional Tennis Registry',
      'ITF Level 3 Coach',
      'USTA High Performance Coach',
    ];
    return credentials[Math.floor(Math.random() * credentials.length)] ?? 'default credentials';
  }

  private randomPhilosophy(): string {
    const philosophies = [
      'Focus on fundamentals and consistent improvement.',
      'Building confidence through positive reinforcement.',
      'Developing both technical skills and mental toughness.',
      "Customized approach for each player's unique needs.",
    ];
    return philosophies[Math.floor(Math.random() * philosophies.length)] ?? 'default philosophy';
  }

  private randomProfileImage(): string {
    return `https://example.com/images/coach_${Math.floor(Math.random() * 100)}.jpg`;
  }
}
