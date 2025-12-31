import { Module } from '@nestjs/common';

import { HashingModule } from '../iam/hashing/hashing.module';
import { PrismaModule } from '../prisma/prisma.module';

import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [PrismaModule, HashingModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
