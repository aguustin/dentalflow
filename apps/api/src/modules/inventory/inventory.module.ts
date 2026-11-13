import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

/** Stock levels, movements, purchases, adjustments and low-stock alerts. */
@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
