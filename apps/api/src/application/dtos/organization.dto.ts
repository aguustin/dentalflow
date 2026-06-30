import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'My Dental Clinic' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'my-dental-clinic', description: 'URL-safe slug, lowercase with hyphens' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens' })
  slug: string;

  @ApiProperty({ example: 'admin@clinic.com', description: 'First admin user email' })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ example: 'Admin' })
  @IsString()
  @IsNotEmpty()
  adminFirstName: string;

  @ApiProperty({ example: 'User' })
  @IsString()
  @IsNotEmpty()
  adminLastName: string;

  @ApiProperty({ example: 'securepassword' })
  @IsString()
  @MinLength(6)
  adminPassword: string;
}

export class AddUserToOrganizationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roleId: string;
}

export class OrganizationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}
