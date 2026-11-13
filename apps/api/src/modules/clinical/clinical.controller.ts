import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
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
import { ClinicalService } from './clinical.service';
import { CONDITION_KEYS, SURFACES } from './domain/odontogram';

class AnamnesisRequest {
  @ApiProperty({ description: 'Fields defined by vertical.clinical.anamnesisFields. Replaces the whole anamnesis.' })
  @IsObject()
  anamnesis: Record<string, unknown>;
}

class NoteRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  content: string;
}

class ToothEntryRequest {
  @ApiProperty({ description: 'FDI tooth number (11–48, 51–85)' })
  @IsInt()
  tooth: number;

  @ApiProperty({ nullable: true, enum: SURFACES, description: 'null = whole tooth' })
  @ValidateIf((_, v) => v !== null)
  @IsIn(SURFACES as unknown as string[])
  surface: string | null;

  @ApiProperty({ enum: CONDITION_KEYS })
  @IsIn(CONDITION_KEYS)
  condition: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

class TeethRequest {
  @ApiProperty({ type: [ToothEntryRequest] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ToothEntryRequest)
  entries: ToothEntryRequest[];
}

class PageRequest {
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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tooth?: number;
}

@ApiTags('Clinical')
@ApiBearerAuth()
@RequireModule('clinical')
@Controller('clinical/:customerId')
export class ClinicalController {
  constructor(private readonly clinical: ClinicalService) {}

  @Get()
  @RequirePermissions('clinical.read')
  @ApiOperation({ summary: 'Anamnesis, latest notes and current odontogram' })
  get(@Param('customerId') customerId: string, @CurrentUser() actor: RequestUser) {
    return this.clinical.get(customerId, actor.organizationId);
  }

  @Put('anamnesis')
  @RequirePermissions('clinical.update')
  anamnesis(
    @Param('customerId') customerId: string,
    @Body() body: AnamnesisRequest,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.clinical.updateAnamnesis(customerId, actor.organizationId, actor.userId, body.anamnesis);
  }

  @Get('notes')
  @RequirePermissions('clinical.read')
  notes(@Param('customerId') customerId: string, @Query() q: PageRequest, @CurrentUser() actor: RequestUser) {
    return this.clinical.listNotes(customerId, actor.organizationId, { limit: q.limit ?? 50, offset: q.offset ?? 0 });
  }

  @Post('notes')
  @RequirePermissions('clinical.update')
  @ApiOperation({ summary: 'Append a progress note (notes are never edited or deleted)' })
  addNote(@Param('customerId') customerId: string, @Body() body: NoteRequest, @CurrentUser() actor: RequestUser) {
    return this.clinical.addNote(customerId, actor.organizationId, actor.userId, body.content);
  }

  @Post('odontogram')
  @RequirePermissions('clinical.update')
  @ApiOperation({ summary: 'Record tooth conditions (HEALTHY clears). Returns the current odontogram.' })
  teeth(@Param('customerId') customerId: string, @Body() body: TeethRequest, @CurrentUser() actor: RequestUser) {
    return this.clinical.recordTeeth(customerId, actor.organizationId, actor.userId, body.entries);
  }

  @Get('odontogram/history')
  @RequirePermissions('clinical.read')
  history(@Param('customerId') customerId: string, @Query() q: PageRequest, @CurrentUser() actor: RequestUser) {
    return this.clinical.history(customerId, actor.organizationId, q.tooth);
  }
}
