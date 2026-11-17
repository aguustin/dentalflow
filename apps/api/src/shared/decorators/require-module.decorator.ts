import { SetMetadata } from '@nestjs/common';
import { ModuleKey } from '../verticals';

export const MODULE_KEY = 'requiredModule';

/**
 * Blocks the route (403) unless the caller's organization has the module enabled.
 * With several modules, any of them is enough (e.g. staff is used by scheduling and work orders).
 */
export const RequireModule = (...modules: [ModuleKey, ...ModuleKey[]]) => SetMetadata(MODULE_KEY, modules);
