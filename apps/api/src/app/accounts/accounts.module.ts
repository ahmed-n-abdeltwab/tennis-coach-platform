import { Module } from '@nestjs/common';

import { IamModule } from '../iam/iam.module';
import { PrismaModule } from '../prisma/prisma.module';

import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [PrismaModule, IamModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
