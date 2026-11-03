import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: JwtPayload;
    }>();

    // API key (waendelezaji · I16) — inatumika badala ya Bearer.
    const apiKey = req.headers['x-api-key'];
    if (!req.headers.authorization?.startsWith('Bearer ') && apiKey) {
      const hash = createHash('sha256').update(apiKey).digest('hex');
      const key = await this.prisma.apiKey.findUnique({
        where: { keyHash: hash },
      });
      if (!key || key.revokedAt) {
        throw new UnauthorizedException('API key si sahihi au imezimwa.');
      }
      const scopes = Array.isArray(key.scopes) ? (key.scopes as string[]) : [];
      void this.prisma.apiKey
        .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
        .catch(() => undefined);
      req.user = {
        sub: `apikey:${key.id}`,
        bid: key.businessId,
        role: scopes.includes('write') ? Role.OWNER : Role.CASHIER,
        shops: [],
        name: key.name,
      };
      return true;
    }

    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token haipo. Ingia kwanza.');
    }

    const token = header.slice(7);
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret_change_me',
      });
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token imeisha muda au si sahihi.');
    }
  }
}
