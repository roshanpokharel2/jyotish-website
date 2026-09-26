import 'server-only';

// An error meant for the caller: its status, code and message are sent as they are.
export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const json = (status, body) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Wraps a route handler: its return value becomes a 200 JSON response, an HttpError
// becomes that error, and anything else is logged and returned as a bare 500 so no
// internal detail reaches the caller.
export function route(handler) {
  return async (request, context) => {
    try {
      return json(200, await handler(request, context));
    } catch (error) {
      if (error instanceof HttpError) {
        return json(error.status, { error: { code: error.code, message: error.message } });
      }
      console.error(`[api] ${request.method} ${new URL(request.url).pathname}`, error);
      return json(500, { error: { code: 'internal', message: 'Something went wrong. Please try again.' } });
    }
  };
}
