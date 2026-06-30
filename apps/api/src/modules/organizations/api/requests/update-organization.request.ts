import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateOrganizationRequest {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens' })
  slug?: string;
}
