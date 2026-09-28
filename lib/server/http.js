import 'server-only';

// An error meant for the caller: its status, code and message are sent as they are.
export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Reads the request body, refusing it (413) as soon as it passes `maxBytes`, so an
// oversized or endless upload is never buffered whole. Content-Length is only a hint.
export async function readBody(request, maxBytes) {
  if (Number(request.headers.get('content-length')) > maxBytes) throw tooLarge();
  const chunks = [];
  let size = 0;
  if (request.body) {
    for await (const chunk of request.body) {
      size += chunk.byteLength;
      if (size > maxBytes) throw tooLarge();
      chunks.push(chunk);
    }
  }
  return Buffer.concat(chunks);
}
const tooLarge = () => new HttpError(413, 'too_large', 'The request is too large.');

// A JSON object body of at most `maxBytes` (default 4 KB), or 400.
export async function readJson(request, maxBytes = 4096) {
  if (!/^application\/json\b/i.test(request.headers.get('content-type') ?? '')) {
    throw new HttpError(415, 'unsupported_type', 'Send the request as JSON.');
  }
  let body;
  try {
    body = JSON.parse((await readBody(request, maxBytes)).toString('utf8'));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'invalid_body', 'The request body is not valid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'invalid_body', 'The request body must be a JSON object.');
  }
  return body;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value) => typeof value === 'string' && UUID.test(value);

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
