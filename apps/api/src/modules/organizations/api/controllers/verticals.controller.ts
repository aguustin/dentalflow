import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../shared/decorators/public.decorator';
import { VERTICALS } from '../../../../shared/verticals';

@ApiTags('Verticals')
@Controller('verticals')
export class VerticalsController {
  /** Public list of available business verticals, used by the sign-up form. */
  @Public()
  @Get()
  @ApiOperation({ summary: 'List available business verticals' })
  list(): { key: string; label: string }[] {
    return Object.values(VERTICALS).map(({ key, label }) => ({ key, label }));
  }
}
