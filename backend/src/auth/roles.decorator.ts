import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Usage: @Roles('OWNER', 'ADMIN')
export const Roles = (...roles: Array<'OWNER' | 'ADMIN' | 'TECHNICIAN'>) =>
  SetMetadata(ROLES_KEY, roles);
