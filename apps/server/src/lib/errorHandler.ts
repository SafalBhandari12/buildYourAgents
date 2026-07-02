import { Context, Env, ErrorHandler, Input, Next } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError, ZodIssue } from 'zod';
import { AppError } from './errors';

/**
 * Formats Zod validation errors into a human-friendly format.
 */
export function formatZodError(error: ZodError) {
  const issues = error.issues.map((err: ZodIssue) => {
    const fieldName = err.path.join('.');

    // Customize messaging to be more readable
    let message = err.message;
    if (err.code === 'invalid_type') {
      const invalidTypeErr = err as unknown as Record<string, unknown>;
      const expected = typeof invalidTypeErr.expected === 'string' ? invalidTypeErr.expected : '';
      const inputVal = invalidTypeErr.input;
      const receivedType = inputVal === null ? 'null' : typeof inputVal;
      message = `expected ${expected}, but received ${receivedType}`;
    }

    return {
      field: fieldName || 'body',
      message: message,
      code: err.code,
    };
  });

  // Construct a friendly, sentence-like summary message
  const summaryMessage =
    issues.length > 0
      ? `Validation failed: ${issues.map((i: { field: string; message: string }) => `'${i.field}' (${i.message})`).join(', ')}`
      : 'Validation failed';

  return {
    message: summaryMessage,
    errors: issues,
  };
}

/**
 * Helper to process and return uniform JSON responses for caught errors.
 */
export function handleCaughtError(error: unknown, c: Context) {
  // 1. Handle AppError (custom throw errors)
  if (error instanceof AppError) {
    return c.json(
      {
        success: false,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
      error.statusCode as ContentfulStatusCode,
    );
  }

  // 2. Handle Zod validation errors
  if (error instanceof ZodError) {
    const { message, errors } = formatZodError(error);
    return c.json(
      {
        success: false,
        message,
        errors,
      },
      400,
    );
  }

  // 3. Handle standard Hono HTTPExceptions if thrown
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if ('status' in err && typeof err.status === 'number') {
      return c.json(
        {
          success: false,
          message: typeof err.message === 'string' ? err.message : 'HTTP Error',
        },
        err.status as ContentfulStatusCode,
      );
    }
  }

  // 4. Default generic fallback errors (500)
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  console.error('Unhandled error caught in handler:', error);

  return c.json(
    {
      success: false,
      message,
    },
    500,
  );
}

/**
 * Wraps individual async handlers to catch errors automatically without try-catch blocks.
 * You can pass a dedicated Env type (e.g. asyncHandler<llamaParseEnv>) to get route-specific type safety.
 */
export const asyncHandler = <E extends Env = Env, P extends string = string, I extends Input = {}>(
  fn: (c: Context<E, P, I>, next: Next) => Response | Promise<Response | void> | void,
) => {
  return async (c: Context<E, P, I>, next: Next) => {
    try {
      const response = await fn(c, next);
      if (response instanceof Response) {
        return response;
      }
    } catch (error) {
      return handleCaughtError(error, c);
    }
  };
};

/**
 * A global error handler for Hono apps (app.onError).
 * Catches all unhandled errors thrown inside handlers and middlewares globally.
 */
export const globalErrorHandler: ErrorHandler = (error, c) => {
  return handleCaughtError(error, c);
};
