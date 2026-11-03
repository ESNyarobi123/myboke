import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Ruhusu endpoint bila JWT (mf. login, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
