interface ErrorWithCaptureStackTrace {
  captureStackTrace(targetObject: object, constructorOpt?: Function): void;
}

/**
 * Base custom error class for application errors.
 */
export class AppError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;

    // Maintain proper stack trace in V8 environments safely
    const errorConstructor = Error as unknown as ErrorWithCaptureStackTrace;
    if (typeof errorConstructor.captureStackTrace === 'function') {
      errorConstructor.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 400 Bad Request Error
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', details?: unknown) {
    super(message, 400, details);
  }
}

/**
 * 401 Unauthorized Error
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: unknown) {
    super(message, 401, details);
  }
}

/**
 * 403 Forbidden Error
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: unknown) {
    super(message, 403, details);
  }
}

/**
 * 404 Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource Not Found', details?: unknown) {
    super(message, 404, details);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error', details?: unknown) {
    super(message, 500, details);
  }
}
