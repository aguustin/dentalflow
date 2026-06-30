import { IsIn, IsString } from 'class-validator';
import { PLAN_NAMES } from '../../domain/entities/plan.entity';

export class CreateSubscriptionRequest {
  @IsString()
  @IsIn(PLAN_NAMES as unknown as string[])
  planName: string;
}
