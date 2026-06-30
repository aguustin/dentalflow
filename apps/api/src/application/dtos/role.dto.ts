import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'dentist' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class AssignRoleDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsUUID()
  roleId: string;
}

export class AssignPermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}

export class RoleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  createdAt: Date;
}

export class PermissionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resource: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  key: string;
}
