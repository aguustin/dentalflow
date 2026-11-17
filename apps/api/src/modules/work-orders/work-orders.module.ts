import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { WorkOrdersService } from './work-orders.service';
import { AssetsController, WorkOrdersController } from './work-orders.controller';

/** Repair verticals: customer equipment and work orders (intake → quote → repair → delivery). */
@Module({
  controllers: [WorkOrdersController, AssetsController],
  providers: [WorkOrdersService, AssetsService],
})
export class WorkOrdersModule {}
