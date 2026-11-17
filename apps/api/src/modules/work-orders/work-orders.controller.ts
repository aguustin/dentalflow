import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { WorkOrderStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RequireModule } from '../../shared/decorators/require-module.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../shared/types/request-user.type';
import { AssetsService } from './assets.service';
import { WorkOrdersService } from './work-orders.service';

// ── Requests ─────────────────────────────────────────────────────────────────

class ListWorkOrdersRequest {
  @ApiPropertyOptional({ description: 'Only open orders (board)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  open?: boolean;

  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Customer, equipment, issue or order number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

class CreateWorkOrderRequest {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ description: "Customer's equipment" })
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @ApiPropertyOptional({ description: 'Assigned technician (staff member)' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiProperty({ example: 'No enciende. Se cayó al agua.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reportedIssue: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

class UpdateWorkOrderRequest {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(5000)
  diagnosis?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  staffId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  assetId?: string | null;
}

class WorkOrderItemRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  catalogItemId?: string;

  @ApiPropertyOptional({ description: 'Required for free-text lines' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(100_000)
  quantity: number;

  @ApiPropertyOptional({ description: 'Cents. Defaults to the catalog price' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  unitPrice?: number;
}

class ReplaceItemsRequest {
  @ApiProperty({ type: [WorkOrderItemRequest] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => WorkOrderItemRequest)
  items: WorkOrderItemRequest[];
}

class TransitionRequest {
  @ApiProperty({ enum: WorkOrderStatus })
  @IsEnum(WorkOrderStatus)
  to: WorkOrderStatus;

  @ApiPropertyOptional({ description: 'Required to cancel or reject' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

class ListAssetsRequest {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

class CreateAssetRequest {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty({ example: 'Ford Fiesta · AB123CD' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label: string;

  @ApiPropertyOptional({ description: 'Fields from vertical.assetAttributes' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}

class UpdateAssetRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label?: string;

  @ApiPropertyOptional({ description: 'Replaces all attributes' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Controllers ──────────────────────────────────────────────────────────────

@ApiTags('Work orders')
@ApiBearerAuth()
@RequireModule('work_orders')
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly orders: WorkOrdersService) {}

  @Get()
  @RequirePermissions('work_orders.read')
  list(@Query() q: ListWorkOrdersRequest, @CurrentUser() actor: RequestUser) {
    return this.orders.list(actor.organizationId, q);
  }

  @Post()
  @RequirePermissions('work_orders.create')
  @ApiOperation({ summary: 'Receive equipment: creates the order in RECEIVED' })
  create(@Body() body: CreateWorkOrderRequest, @CurrentUser() actor: RequestUser) {
    return this.orders.create(actor.organizationId, actor.userId, body);
  }

  @Get(':id')
  @RequirePermissions('work_orders.read')
  get(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.orders.get(id, actor.organizationId);
  }

  @Put(':id')
  @RequirePermissions('work_orders.update')
  update(@Param('id') id: string, @Body() body: UpdateWorkOrderRequest, @CurrentUser() actor: RequestUser) {
    return this.orders.update(id, actor.organizationId, body);
  }

  @Put(':id/items')
  @RequirePermissions('work_orders.update')
  @ApiOperation({ summary: 'Replace parts and labor (only while RECEIVED or DIAGNOSING)' })
  items(@Param('id') id: string, @Body() body: ReplaceItemsRequest, @CurrentUser() actor: RequestUser) {
    return this.orders.replaceItems(id, actor.organizationId, body.items);
  }

  @Post(':id/transition')
  @RequirePermissions('work_orders.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move the order to another status (see allowedTransitions)' })
  transition(@Param('id') id: string, @Body() body: TransitionRequest, @CurrentUser() actor: RequestUser) {
    return this.orders.transition(id, actor.organizationId, actor.userId, body.to, body.note);
  }
}

@ApiTags('Assets')
@ApiBearerAuth()
@RequireModule('work_orders')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  @RequirePermissions('work_orders.read')
  list(@Query() q: ListAssetsRequest, @CurrentUser() actor: RequestUser) {
    return this.assets.list(actor.organizationId, q);
  }

  @Post()
  @RequirePermissions('work_orders.create')
  create(@Body() body: CreateAssetRequest, @CurrentUser() actor: RequestUser) {
    return this.assets.create(actor.organizationId, body);
  }

  @Get(':id')
  @RequirePermissions('work_orders.read')
  @ApiOperation({ summary: 'Equipment with its work order history' })
  get(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.assets.get(id, actor.organizationId);
  }

  @Put(':id')
  @RequirePermissions('work_orders.update')
  update(@Param('id') id: string, @Body() body: UpdateAssetRequest, @CurrentUser() actor: RequestUser) {
    return this.assets.update(id, actor.organizationId, body);
  }
}
