import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAppointmentRequest {
  @ApiProperty({ description: 'Customer ID (must belong to the same organization)' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'Annual Check-up' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Routine dental examination' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: '2026-07-15T09:00:00.000Z', description: 'ISO 8601 datetime' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-07-15T10:00:00.000Z', description: 'ISO 8601 datetime' })
  @IsDateString()
  endTime: string;
}
