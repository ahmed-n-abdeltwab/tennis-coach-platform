/**
 * E2E test setup
 * This file runs before each e2e test file
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { AppModule } from '../../src/app/app.module';
import { PrismaService } from '../../src/app/prisma/prisma.service';

export class NestE2ETestContext {
  public app: INestApplication;
  public prisma: PrismaService;
  public req: TestAgent<request.Test>;

  async setup() {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    this.app.setGlobalPrefix('api');
    await this.app.init();

    this.prisma = this.app.get<PrismaService>(PrismaService);
    this.req = request(this.app.getHttpServer());
  }

  async cleanDatabase() {
    if (this.prisma) {
      await this.prisma.session.deleteMany();
      await this.prisma.timeSlot.deleteMany();
      await this.prisma.bookingType.deleteMany();
      await this.prisma.coach.deleteMany();
      await this.prisma.user.deleteMany();
      await this.prisma.discount.deleteMany();
      await this.prisma.message.deleteMany();
    }
  }

  async teardown() {
    if (this.app) {
      await this.app.close();
    }
  }
}

global.NestE2ETestContext = NestE2ETestContext;
// Suppress console output in e2e tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};
