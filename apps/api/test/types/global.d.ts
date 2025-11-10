/**
 * Global type declarations for test utilities
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/app/prisma/prisma.service';

declare global {
  var testApp: INestApplication;
  var testPrisma: PrismaService;
  var testRequest: () => request.SuperTest<request.Test>;

  namespace NodeJS {
    interface Global {
      testApp: INestApplication;
      testPrisma: PrismaService;
      testRequest: () => request.SuperTest<request.Test>;
    }
  }
}
