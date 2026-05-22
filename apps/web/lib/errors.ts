/**
 * Typed application errors.
 *
 * Every error an API route is expected to surface carries a stable machine
 * `code` and an HTTP `status`. Route handlers catch `AppError` and render the
 * standard `{ error: { code, message } }` envelope; anything that is not an
 * `AppError` is an unexpected fault and becomes a generic 500 — internals
 * never leak to the client.
 */

export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
  }
}

/** 401 — credentials missing or invalid, or a session that is no longer valid. */
export class AuthError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHENTICATED') {
    super(code, message, 401);
  }
}

/** 403 — authenticated, but not allowed to perform this action. */
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource', code = 'FORBIDDEN') {
    super(code, message, 403);
  }
}

/** 400 — the request body or query failed validation. */
export class ValidationError extends AppError {
  constructor(message = 'The request was invalid', code = 'INVALID_REQUEST') {
    super(code, message, 400);
  }
}

/** 404 — the requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message = 'Not found', code = 'NOT_FOUND') {
    super(code, message, 404);
  }
}

/** 429 — too many attempts; the caller should slow down. */
export class RateLimitError extends AppError {
  constructor(
    message = 'Too many attempts. Please wait a few minutes and try again.',
    code = 'RATE_LIMITED',
  ) {
    super(code, message, 429);
  }
}
