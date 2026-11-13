import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

// Status values that can be set via PUT (CANCELLED is handled by DELETE; SCHEDULED is auto on reschedule)
enum UpdatableStatus {
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export class UpdateAppointmentRequest {
  @ApiPropertyOptional({ example: 'Follow-up Check-up' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ example: '2026-07-15T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-07-15T11:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    enum: UpdatableStatus,
    description: 'CONFIRMED: confirm appointment. COMPLETED: mark as done. NO_SHOW: customer did not attend.',
  })
  @IsOptional()
  @IsEnum(UpdatableStatus)
  status?: string;
}
