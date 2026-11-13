import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCustomerRequest {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'jane.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ example: '+1-555-0100' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @ApiPropertyOptional({ example: 'DNI-12345678' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentId?: string | null;

  @ApiPropertyOptional({
    description: "Vertical-specific fields (schema in GET /organizations/current → vertical.customerAttributes). Replaces all attributes.",
    example: { birthDate: '1990-05-20', healthInsurance: 'OSDE' },
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
