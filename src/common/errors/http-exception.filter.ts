import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

type ErrorBody = {
  statusCode: number;
  error: string;
  message?: string;
  code?: string;
  details?: unknown;
};

const NAMES: Record<number, string> = {
  400: 'BadRequest',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'NotFound',
  409: 'Conflict',
  429: 'TooManyRequests',
};

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      const details =
        zodError instanceof ZodError
          ? zodError.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message }))
          : [];
      return { statusCode: 400, error: 'ValidationError', details };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const base: ErrorBody = { statusCode: status, error: NAMES[status] ?? 'Error' };
      if (typeof raw === 'string') return { ...base, message: raw };
      const obj = raw as Record<string, unknown>;
      return {
        ...base,
        message: typeof obj.message === 'string' ? obj.message : undefined,
        code: typeof obj.code === 'string' ? obj.code : undefined,
        details: obj.details,
      };
    }
    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: 'InternalServerError' };
  }
}
