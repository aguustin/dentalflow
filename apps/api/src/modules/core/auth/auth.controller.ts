import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../shared/decorators/public.decorator';
import { LoginUserUseCase } from '../../../application/use-cases/auth/login-user.use-case';
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/refresh-token.use-case';
import { LogoutUserUseCase } from '../../../application/use-cases/auth/logout-user.use-case';
import { LoginDto, LoginResponseDto, LogoutDto, RefreshTokenDto } from '../../../application/dtos/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUser: LoginUserUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly logoutUser: LogoutUserUseCase,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Authenticate user and receive JWT pair' })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.loginUser.execute(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Rotate refresh token and receive new JWT pair' })
  refresh(@Body() dto: RefreshTokenDto): Promise<LoginResponseDto> {
    return this.refreshToken.execute(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke refresh token' })
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.logoutUser.execute(dto);
  }
}
