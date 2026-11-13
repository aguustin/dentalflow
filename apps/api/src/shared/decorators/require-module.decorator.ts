import { SetMetadata } from '@nestjs/common';
import { ModuleKey } from '../verticals';

export const MODULE_KEY = 'requiredModule';

/** Blocks the route (403) unless the caller's organization has this module enabled. */
export const RequireModule = (module: ModuleKey) => SetMetadata(MODULE_KEY, module);
