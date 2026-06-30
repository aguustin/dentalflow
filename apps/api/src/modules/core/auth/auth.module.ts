import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LoginUserUseCase } from '../../../application/use-cases/auth/login-user.use-case';
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/refresh-token.use-case';
import { LogoutUserUseCase } from '../../../application/use-cases/auth/logout-user.use-case';
@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    LoginUserUseCase,
    RefreshTokenUseCase,
    LogoutUserUseCase,
  ],
  exports: [JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
