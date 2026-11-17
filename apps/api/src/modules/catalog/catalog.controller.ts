import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { CatalogItemType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RequireModule } from '../../shared/decorators/require-module.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../shared/types/request-user.type';
import { CatalogService } from './catalog.service';

const toBool = ({ value }: { value: unknown }) => value === 'true' || value === true;

class CatalogItemBody {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'EAN/UPC or any scanner code' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string | null;

  @ApiPropertyOptional({ description: 'Price in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  price?: number;

  @ApiPropertyOptional({ nullable: true, description: 'Services only' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(720)
  durationMinutes?: number | null;

  @ApiPropertyOptional({ description: 'Products only' })
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Fields from vertical.productAttributes' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}

class CreateCatalogItemRequest extends CatalogItemBody {
  @ApiProperty({ enum: CatalogItemType })
  @IsEnum(CatalogItemType)
  type: CatalogItemType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  declare name: string;

  @ApiProperty({ description: 'Price in cents (default price for variants of a group)' })
  @IsInt()
  @Min(0)
  declare price: number;

  @ApiPropertyOptional({ description: 'Products only: a container of variants (not sold, no stock)' })
  @IsOptional()
  @IsBoolean()
  isVariantGroup?: boolean;
}

class ListCatalogRequest {
  @IsOptional()
  @IsEnum(CatalogItemType)
  type?: CatalogItemType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  includeInactive?: boolean;

  @ApiPropertyOptional({ description: 'true: what can be sold (variants instead of their groups)' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  sellable?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

class LookupRequest {
  @ApiProperty({ description: 'Barcode or SKU' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code: string;
}

class VariantAxisRequest {
  @ApiProperty({ example: 'Talle' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: ['S', 'M', 'L'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  values: string[];
}

class GenerateVariantsRequest {
  @ApiProperty({ type: [VariantAxisRequest] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => VariantAxisRequest)
  axes: VariantAxisRequest[];

  @ApiPropertyOptional({ description: 'Cents; defaults to the group price' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  price?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;
}

@ApiTags('Catalog')
@ApiBearerAuth()
@RequireModule('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @RequirePermissions('catalog.read')
  list(@Query() q: ListCatalogRequest, @CurrentUser() actor: RequestUser) {
    return this.catalog.list(actor.organizationId, q);
  }

  // Declared before ':id'
  @Get('lookup')
  @RequirePermissions('catalog.read')
  @ApiOperation({ summary: 'Exact match by barcode or SKU among sellable items (POS / scanner)' })
  lookup(@Query() q: LookupRequest, @CurrentUser() actor: RequestUser) {
    return this.catalog.lookup(actor.organizationId, q.code.trim());
  }

  @Get(':id')
  @RequirePermissions('catalog.read')
  @ApiOperation({ summary: 'Item; for a variant group, also its variants' })
  get(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.catalog.get(id, actor.organizationId);
  }

  @Post()
  @RequirePermissions('catalog.create')
  create(@Body() body: CreateCatalogItemRequest, @CurrentUser() actor: RequestUser) {
    return this.catalog.create(actor.organizationId, body);
  }

  @Put(':id')
  @RequirePermissions('catalog.update')
  update(@Param('id') id: string, @Body() body: CatalogItemBody, @CurrentUser() actor: RequestUser) {
    return this.catalog.update(id, actor.organizationId, body);
  }

  @Post(':id/variants')
  @RequirePermissions('catalog.create')
  @ApiOperation({ summary: 'Generate the missing variants of a group (every combination of the axes)' })
  generateVariants(@Param('id') id: string, @Body() body: GenerateVariantsRequest, @CurrentUser() actor: RequestUser) {
    return this.catalog.generateVariants(id, actor.organizationId, body);
  }
}
