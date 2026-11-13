import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { PaymentMethod, SaleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequireModule } from '../../../shared/decorators/require-module.decorator';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../../shared/types/request-user.type';
import { CashService } from '../application/cash.service';
import { SalesService } from '../application/sales.service';

const MAX_AMOUNT = 1_000_000_000; // cents

class SaleLineRequest {
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
  @Max(MAX_AMOUNT)
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Cents, whole line' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  discount?: number;
}

class SaleRequest {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  staffId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @ApiPropertyOptional({ description: 'Cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  globalDiscount?: number;

  @ApiProperty({ type: [SaleLineRequest] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SaleLineRequest)
  items: SaleLineRequest[];
}

class CreateSaleRequest extends SaleRequest {
  @ApiPropertyOptional({ description: 'Confirm immediately (skip draft)' })
  @IsOptional()
  @IsBoolean()
  confirm?: boolean;
}

class PaymentRequest {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: 'Cents' })
  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT)
  amount: number;
}

class ListSalesRequest {
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Created at or after (ISO)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Created before (ISO)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

@ApiTags('Sales')
@ApiBearerAuth()
@RequireModule('sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  @RequirePermissions('sales.read')
  list(@Query() q: ListSalesRequest, @CurrentUser() actor: RequestUser) {
    return this.sales.list(actor.organizationId, {
      ...q,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
    });
  }

  @Post()
  @RequirePermissions('sales.create')
  @ApiOperation({ summary: 'Create a sale (draft, or confirmed with confirm=true)' })
  create(@Body() body: CreateSaleRequest, @CurrentUser() actor: RequestUser) {
    const { confirm, ...input } = body;
    return this.sales.create(actor.organizationId, input, { confirm, userId: actor.userId });
  }

  @Post('from-appointment/:appointmentId')
  @RequirePermissions('sales.create')
  @ApiOperation({ summary: 'Draft sale for a completed appointment (one per appointment)' })
  fromAppointment(@Param('appointmentId') appointmentId: string, @CurrentUser() actor: RequestUser) {
    return this.sales.createFromAppointment(appointmentId, actor.organizationId);
  }

  @Get(':id')
  @RequirePermissions('sales.read')
  get(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.sales.get(id, actor.organizationId);
  }

  @Put(':id')
  @RequirePermissions('sales.update')
  @ApiOperation({ summary: 'Replace the content of a draft sale' })
  update(@Param('id') id: string, @Body() body: SaleRequest, @CurrentUser() actor: RequestUser) {
    return this.sales.update(id, actor.organizationId, body);
  }

  @Post(':id/confirm')
  @RequirePermissions('sales.update')
  @HttpCode(HttpStatus.OK)
  confirm(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.sales.confirm(id, actor.organizationId, actor.userId);
  }

  @Post(':id/void')
  @RequirePermissions('sales.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Void a sale without payments' })
  void(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.sales.void(id, actor.organizationId, actor.userId);
  }

  @Post(':id/payments')
  @RequirePermissions('sales.update')
  @ApiOperation({ summary: 'Register a payment (up to the outstanding balance)' })
  pay(@Param('id') id: string, @Body() body: PaymentRequest, @CurrentUser() actor: RequestUser) {
    return this.sales.addPayment(id, actor.organizationId, actor.userId, body);
  }
}

class OpenCashRequest {
  @ApiProperty({ description: 'Initial cash in the drawer (cents)' })
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  openingAmount: number;
}

class CloseCashRequest {
  @ApiProperty({ description: 'Cash counted at close (cents)' })
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  countedCash: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

@ApiTags('Cash')
@ApiBearerAuth()
@RequireModule('sales')
@Controller('cash')
export class CashController {
  constructor(private readonly cash: CashService) {}

  @Get('current')
  @RequirePermissions('sales.read')
  @ApiOperation({ summary: 'Open cash session with live totals, or null' })
  current(@CurrentUser() actor: RequestUser) {
    return this.cash.current(actor.organizationId);
  }

  @Get('sessions')
  @RequirePermissions('sales.read')
  history(@CurrentUser() actor: RequestUser) {
    return this.cash.history(actor.organizationId);
  }

  @Post('open')
  @RequirePermissions('sales.update')
  open(@Body() body: OpenCashRequest, @CurrentUser() actor: RequestUser) {
    return this.cash.open(actor.organizationId, actor.userId, body.openingAmount);
  }

  @Post('close')
  @RequirePermissions('sales.update')
  @HttpCode(HttpStatus.OK)
  close(@Body() body: CloseCashRequest, @CurrentUser() actor: RequestUser) {
    return this.cash.close(actor.organizationId, actor.userId, body.countedCash, body.notes);
  }
}
