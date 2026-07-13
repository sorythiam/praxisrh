import { SetMetadata } from '@nestjs/common';
import { ModuleCode } from '@praxis/shared';

export const REQUIRE_MODULE_KEY = 'requireModule';
export const RequireModule = (module: ModuleCode) => SetMetadata(REQUIRE_MODULE_KEY, module);
