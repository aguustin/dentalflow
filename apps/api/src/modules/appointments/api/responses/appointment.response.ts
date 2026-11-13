import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AppointmentResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  customerId: string;

  @ApiPropertyOptional({ description: 'Customer display name (only in listings)' })
  customerName?: string;

  @ApiProperty()
  staffId: string;

  @ApiPropertyOptional({ description: 'Only in listings' })
  staffName?: string;

  @ApiPropertyOptional({ description: 'Only in listings' })
  staffColor?: string;

  @ApiPropertyOptional({ nullable: true })
  resourceId: string | null;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty({ enum: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ListAppointmentsResponse {
  @ApiProperty({ type: [AppointmentResponse] })
  items: AppointmentResponse[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;
}
