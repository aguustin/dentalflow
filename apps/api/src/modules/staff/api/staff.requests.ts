import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateStaffRequest {
  @ApiProperty({ example: 'Dra. Laura Gómez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Ortodoncia' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialty?: string | null;

  @ApiPropertyOptional({ example: '#16a34a' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Link to a user of this organization (optional)' })
  @IsOptional()
  @IsUUID()
  userId?: string | null;
}

export class UpdateStaffRequest extends CreateStaffRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  declare name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class WorkingHoursRangeRequest {
  @ApiProperty({ description: '1 = Monday … 7 = Sunday' })
  @IsInt()
  @Min(1)
  @Max(7)
  weekday: number;

  @ApiProperty({ example: 540, description: 'Minutes from midnight (540 = 09:00)' })
  @IsInt()
  @Min(0)
  @Max(1440)
  startMinute: number;

  @ApiProperty({ example: 780, description: 'Minutes from midnight (780 = 13:00)' })
  @IsInt()
  @Min(0)
  @Max(1440)
  endMinute: number;
}

export class SetWorkingHoursRequest {
  @ApiProperty({ type: [WorkingHoursRangeRequest] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursRangeRequest)
  ranges: WorkingHoursRangeRequest[];
}

export class AddTimeOffRequest {
  @ApiProperty({ example: '2026-12-24T00:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-12-26T00:00:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: 'Vacaciones' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class ListStaffRequest {
  @ApiPropertyOptional({ description: 'Include inactive members/resources' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive?: boolean;
}

export class CreateResourceRequest {
  @ApiProperty({ example: 'Sillón 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class UpdateResourceRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
