import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  bid: string;
  role: Role;
  shops: string[];
  name?: string;
  iat?: number;
  exp?: number;
}

export interface RequestWithUser extends Request {
  user: JwtPayload;
}

/**
 * `@CurrentUser()` — payload yote
 * `@CurrentUser('bid')` — businessId pekee
 * `@CurrentUser('sub')` — userId pekee
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return data ? req.user?.[data] : req.user;
  },
);
