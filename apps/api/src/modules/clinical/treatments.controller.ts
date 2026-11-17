import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { TreatmentItemStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
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
import { AttachmentsService, MAX_ATTACHMENT_BYTES } from './attachments.service';
import { SURFACES } from './domain/odontogram';
import { TreatmentPlansService } from './treatment-plans.service';

class PlanItemRequest {
  @ApiProperty({ description: 'Catalog service' })
  @IsUUID()
  catalogItemId: string;

  @ApiPropertyOptional({ nullable: true, description: 'FDI tooth' })
  @IsOptional()
  @IsInt()
  tooth?: number | null;

  @ApiPropertyOptional({ nullable: true, enum: SURFACES })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(SURFACES as unknown as string[])
  surface?: string | null;

  @ApiPropertyOptional({ description: 'Cents. Defaults to the catalog price' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  price?: number;
}

class CreatePlanRequest {
  @ApiProperty({ example: 'Rehabilitación sector posterior' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ type: [PlanItemRequest] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PlanItemRequest)
  items?: PlanItemRequest[];
}

class UpdateItemRequest {
  @ApiPropertyOptional({ enum: TreatmentItemStatus })
  @IsOptional()
  @IsEnum(TreatmentItemStatus)
  status?: TreatmentItemStatus;

  @ApiPropertyOptional({ description: 'Cents (only while PROPOSED)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  price?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  tooth?: number | null;

  @ApiPropertyOptional({ nullable: true, enum: SURFACES })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(SURFACES as unknown as string[])
  surface?: string | null;
}

class BillRequest {
  @ApiPropertyOptional({ description: 'Bill only these items (default: every billable item)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  itemIds?: string[];
}

class UploadRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

@ApiTags('Clinical')
@ApiBearerAuth()
@RequireModule('clinical')
@Controller('clinical/:customerId/treatment-plans')
export class TreatmentPlansController {
  constructor(private readonly plans: TreatmentPlansService) {}

  @Get()
  @RequirePermissions('clinical.read')
  list(@Param('customerId') customerId: string, @CurrentUser() actor: RequestUser) {
    return this.plans.list(customerId, actor.organizationId);
  }

  @Post()
  @RequirePermissions('clinical.update')
  create(@Param('customerId') customerId: string, @Body() body: CreatePlanRequest, @CurrentUser() actor: RequestUser) {
    return this.plans.create(customerId, actor.organizationId, actor.userId, body);
  }

  @Post(':planId/items')
  @RequirePermissions('clinical.update')
  addItem(
    @Param('customerId') customerId: string,
    @Param('planId') planId: string,
    @Body() body: PlanItemRequest,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.plans.addItem(planId, customerId, actor.organizationId, body);
  }

  @Patch(':planId/items/:itemId')
  @RequirePermissions('clinical.update')
  @ApiOperation({ summary: 'Change status (PROPOSED → ACCEPTED → DONE, DISCARDED) or edit a proposal' })
  updateItem(
    @Param('customerId') customerId: string,
    @Param('planId') planId: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateItemRequest,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.plans.updateItem(planId, itemId, customerId, actor.organizationId, body);
  }

  @Post(':planId/bill')
  @RequirePermissions('clinical.update', 'sales.create')
  @ApiOperation({ summary: 'Create a draft sale with the done items not billed yet (each item billed once)' })
  bill(
    @Param('customerId') customerId: string,
    @Param('planId') planId: string,
    @Body() body: BillRequest,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.plans.bill(planId, customerId, actor.organizationId, body.itemIds);
  }
}

@ApiTags('Clinical')
@ApiBearerAuth()
@RequireModule('clinical')
@Controller('clinical/:customerId/attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get()
  @RequirePermissions('clinical.read')
  list(@Param('customerId') customerId: string, @CurrentUser() actor: RequestUser) {
    return this.attachments.list(customerId, actor.organizationId);
  }

  @Post()
  @RequirePermissions('clinical.update')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an x-ray or document (JPG, PNG, WEBP, PDF; max 15 MB)' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 } }))
  upload(
    @Param('customerId') customerId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: UploadRequest,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.attachments.upload(customerId, actor.organizationId, actor.userId, file, body.description);
  }

  @Get(':attachmentId/file')
  @RequirePermissions('clinical.read')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, no-store')
  async file(
    @Param('customerId') customerId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<StreamableFile> {
    const { data, mimeType, filename } = await this.attachments.download(attachmentId, customerId, actor.organizationId);
    return new StreamableFile(data, {
      type: mimeType,
      length: data.length,
      // RFC 5987 so accented names survive; ASCII fallback for old clients
      disposition: `inline; filename="${filename.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    });
  }

  @Delete(':attachmentId')
  @RequirePermissions('clinical.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('customerId') customerId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.attachments.remove(attachmentId, customerId, actor.organizationId);
  }
}
