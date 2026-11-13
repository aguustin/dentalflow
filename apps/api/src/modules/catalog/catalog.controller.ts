import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { CatalogItemType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RequireModule } from '../../shared/decorators/require-module.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../shared/types/request-user.type';
import { CatalogService } from './catalog.service';

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

  @ApiProperty({ description: 'Price in cents' })
  @IsInt()
  @Min(0)
  declare price: number;
}

class ListCatalogRequest {
  @IsOptional()
  @IsEnum(CatalogItemType)
  type?: CatalogItemType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive?: boolean;

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

  @Get(':id')
  @RequirePermissions('catalog.read')
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
}
