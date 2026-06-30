import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../../shared/types/request-user.type';
import { CreateUserUseCase } from '../../../application/use-cases/users/create-user.use-case';
import { GetUserUseCase } from '../../../application/use-cases/users/get-user.use-case';
import { CreateUserDto, UserResponseDto } from '../../../application/dtos/user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly getUser: GetUserUseCase,
  ) {}

  @Post()
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Create a new user (within current organization context)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() _actor: RequestUser): Promise<UserResponseDto> {
    return this.createUser.execute(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  getMe(@CurrentUser() actor: RequestUser): Promise<UserResponseDto> {
    return this.getUser.execute(actor.userId);
  }

  @Get(':id')
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Get a user by ID — scoped to current organization' })
  findOne(@Param('id') id: string, @CurrentUser() actor: RequestUser): Promise<UserResponseDto> {
    return this.getUser.execute(id, actor.organizationId);
  }
}
