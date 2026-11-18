import { Controller, Get, Header, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../shared/types/request-user.type';
import { ReportsService } from './reports.service';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

class RangeRequest {
  @ApiProperty({ example: '2026-11-01', description: 'First day (organization time zone)' })
  @Matches(DAY, { message: 'from must be YYYY-MM-DD' })
  from: string;

  @ApiProperty({ example: '2026-11-30', description: 'Last day, inclusive' })
  @Matches(DAY, { message: 'to must be YYYY-MM-DD' })
  to: string;
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'KPIs of the period, by enabled module (amounts in cents)' })
  summary(@Query() q: RangeRequest, @CurrentUser() actor: RequestUser) {
    return this.reports.summary(actor.organizationId, q.from, q.to);
  }

  @Get('sales.csv')
  @RequirePermissions('reports.read')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Sales of the period as CSV (Excel, Spanish locale)' })
  async salesCsv(@Query() q: RangeRequest, @CurrentUser() actor: RequestUser): Promise<StreamableFile> {
    const csv = await this.reports.salesCsv(actor.organizationId, q.from, q.to);
    return new StreamableFile(Buffer.from(csv, 'utf8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="ventas_${q.from}_${q.to}.csv"`,
    });
  }
}
