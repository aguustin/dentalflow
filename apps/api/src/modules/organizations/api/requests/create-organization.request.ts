import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { VERTICAL_KEYS } from '../../../../shared/verticals';
import { PLAN_NAMES } from '../../../billing/domain/entities/plan.entity';

export class CreateOrganizationRequest {
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens' })
  slug: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @IsNotEmpty()
  ownerFirstName: string;

  @IsString()
  @IsNotEmpty()
  ownerLastName: string;

  @IsString()
  @MinLength(6)
  ownerPassword: string;

  @IsOptional()
  @IsString()
  @IsIn(PLAN_NAMES as unknown as string[])
  planName?: string;

  @IsOptional()
  @IsString()
  @IsIn(VERTICAL_KEYS)
  vertical?: string;
}
