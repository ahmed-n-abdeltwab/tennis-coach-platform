/**
 * Global type declarations for test utilities
 */

import { PrismaService } from '@app/prisma/prisma.service';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

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
