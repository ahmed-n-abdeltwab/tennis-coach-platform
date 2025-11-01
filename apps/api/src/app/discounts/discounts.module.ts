import { PrismaModule } from '@app/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { DiscountsController } from './discounts.controller';
import { DiscountsService } from './discounts.service';

@Module({
  imports: [PrismaModule],
  controllers: [DiscountsController],
  providers: [DiscountsService],
  exports: [DiscountsService],
})
export class DiscountsModule {}
