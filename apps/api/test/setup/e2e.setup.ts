/**
 * E2E test setup
 * This file runs before each e2e test file
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';

import { PrismaService } from '../../src/app/prisma/prisma.service';

import { suppressConsoleOutput } from './shared';

export class NestE2ETestContext {
  public app: INestApplication;
  public prisma: PrismaService;
  public req: TestAgent<request.Test>;

  async setup() {
    // Dynamic import to ensure environment variables are set first
    const { AppModule } = await import('../../src/app/app.module');

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
      await this.prisma.account.deleteMany();
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
suppressConsoleOutput();
