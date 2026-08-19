import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ('ADMIN' | 'JUDGE' | 'CONTESTANT')[]) => SetMetadata(ROLES_KEY, roles);
