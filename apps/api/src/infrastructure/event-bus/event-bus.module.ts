import { Global, Module } from '@nestjs/common';
import { TOKENS } from '../../shared/injection-tokens';
import { InMemoryEventBus } from './in-memory-event-bus.service';

@Global()
@Module({
  providers: [
    {
      provide: TOKENS.EVENT_BUS,
      useClass: InMemoryEventBus,
    },
  ],
  exports: [TOKENS.EVENT_BUS],
})
export class EventBusModule {}
