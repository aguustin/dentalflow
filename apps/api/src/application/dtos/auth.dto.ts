import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@clinic.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongpassword' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'my-clinic' })
  @IsString()
  @IsNotEmpty()
  organizationSlug: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;
}
