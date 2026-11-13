import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RequireModule } from '../../shared/decorators/require-module.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../shared/types/request-user.type';
import { InventoryService } from './inventory.service';

const MAX_QTY = 1_000_000;

class ListInventoryRequest {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  lowOnly?: boolean;
}

class PurchaseRequest {
  @ApiProperty({ description: 'Units received' })
  @IsInt()
  @Min(1)
  @Max(MAX_QTY)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class AdjustRequest {
  @ApiProperty({ description: 'Units physically counted (the new stock)' })
  @IsInt()
  @Min(0)
  @Max(MAX_QTY)
  countedQuantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class MinStockRequest {
  @ApiProperty({ nullable: true, description: 'null removes the alert' })
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(MAX_QTY)
  minStock: number | null;
}

@ApiTags('Inventory')
@ApiBearerAuth()
@RequireModule('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Products with stock control, with low-stock flag' })
  list(@Query() q: ListInventoryRequest, @CurrentUser() actor: RequestUser) {
    return this.inventory.list(actor.organizationId, q);
  }

  @Get('low-stock-count')
  @RequirePermissions('inventory.read')
  lowStockCount(@CurrentUser() actor: RequestUser) {
    return this.inventory.lowStockCount(actor.organizationId);
  }

  @Get(':itemId')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Product stock with its latest movements' })
  get(@Param('itemId') itemId: string, @CurrentUser() actor: RequestUser) {
    return this.inventory.get(itemId, actor.organizationId);
  }

  @Post(':itemId/purchase')
  @RequirePermissions('inventory.update')
  purchase(@Param('itemId') itemId: string, @Body() body: PurchaseRequest, @CurrentUser() actor: RequestUser) {
    return this.inventory.purchase(itemId, actor.organizationId, actor.userId, body.quantity, body.note);
  }

  @Post(':itemId/adjust')
  @RequirePermissions('inventory.update')
  @ApiOperation({ summary: 'Set stock to a physical count' })
  adjust(@Param('itemId') itemId: string, @Body() body: AdjustRequest, @CurrentUser() actor: RequestUser) {
    return this.inventory.adjust(itemId, actor.organizationId, actor.userId, body.countedQuantity, body.note);
  }

  @Put(':itemId/min-stock')
  @RequirePermissions('inventory.update')
  setMinStock(@Param('itemId') itemId: string, @Body() body: MinStockRequest, @CurrentUser() actor: RequestUser) {
    return this.inventory.setMinStock(itemId, actor.organizationId, body.minStock);
  }
}
