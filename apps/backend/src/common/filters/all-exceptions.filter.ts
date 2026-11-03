import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/**
 * RFC 7807 `application/problem+json` — muundo mmoja wa makosa kwa API yote.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Hitilafu ya ndani';
    let code = 'INTERNAL';
    let detail: unknown;
    let meta: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        detail = body;
        title = body;
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        const { message, error, code: bodyCode, ...rest } = b;

        if (typeof message === 'string') {
          detail = message;
          title = message;
        } else if (Array.isArray(message)) {
          detail = message;
          title = 'Taarifa si sahihi';
          code = 'VALIDATION_FAILED';
        } else if (typeof message === 'object' && message !== null) {
          const inner = message as Record<string, unknown>;
          detail = inner.message ?? inner;
          title = typeof inner.message === 'string' ? inner.message : exception.message;
        } else {
          detail = body;
          title = (error as string) ?? exception.message;
        }

        // `code` maalum (mfano INSUFFICIENT_COINS) lazima ifike kwa client.
        if (typeof bodyCode === 'string' && bodyCode.trim()) {
          code = bodyCode.trim().toUpperCase();
        }
        if (Object.keys(rest).length > 0) meta = rest;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        title = 'Taarifa imejirudia';
        code = 'CONFLICT';
        detail = exception.meta;
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        title = 'Haipo';
        code = 'NOT_FOUND';
        detail = exception.meta;
      } else {
        status = HttpStatus.BAD_REQUEST;
        title = 'Ombi si sahihi';
        code = 'PRISMA_ERROR';
        detail = { prismaCode: exception.code, meta: exception.meta };
      }
    } else {
      this.logger.error(
        `Unhandled: ${(exception as Error)?.message}`,
        (exception as Error)?.stack,
      );
      detail = 'Tafadhali jaribu tena. Kama tatizo linaendelea, wasiliana nasi.';
    }

    if (!code || code === 'INTERNAL') {
      code =
        status === 401
          ? 'UNAUTHENTICATED'
          : status === 403
            ? 'FORBIDDEN'
            : status === 404
              ? 'NOT_FOUND'
              : status === 400
                ? 'VALIDATION_FAILED'
                : code;
    }

    res.status(status).type('application/problem+json').json({
      type: `https://api.myboke.co.tz/errors/${code.toLowerCase()}`,
      title,
      status,
      code,
      detail,
      instance: req.originalUrl,
      ...(meta ? { meta } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
