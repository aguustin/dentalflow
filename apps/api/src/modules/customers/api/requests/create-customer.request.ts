import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsObject, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerRequest {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'jane.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1-555-0100' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: 'DNI-12345678' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentId?: string;

  @ApiPropertyOptional({
    description: "Vertical-specific fields (schema in GET /organizations/current → vertical.customerAttributes).",
    example: { birthDate: '1990-05-20', healthInsurance: 'OSDE' },
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
