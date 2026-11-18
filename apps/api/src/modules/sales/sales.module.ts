import { Module } from '@nestjs/common';
import { SalesRepository } from './infrastructure/sales.repository';
import { SalesService } from './application/sales.service';
import { CashService } from './application/cash.service';
import { ReturnsService } from './application/returns.service';
import { CashController, SalesController } from './api/sales.controller';

/** Sales, payments and the daily cash register. */
@Module({
  controllers: [SalesController, CashController],
  providers: [SalesRepository, SalesService, CashService, ReturnsService],
})
export class SalesModule {}
