import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { AppointmentStatusEnum } from '../../domain/value-objects/appointment-status.vo';

export class ListAppointmentsRequest {
  @ApiPropertyOptional({ description: 'Filter by staff member ID' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatusEnum })
  @IsOptional()
  @IsEnum(AppointmentStatusEnum)
  status?: string;

  @ApiPropertyOptional({ description: 'Filter: appointments starting at or after this datetime (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startAfter?: string;

  @ApiPropertyOptional({ description: 'Filter: appointments starting at or before this datetime (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startBefore?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
