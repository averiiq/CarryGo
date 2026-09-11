export interface JsonResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface ResponseMeta {
  requestId?: string;
  durationMs?: number;
  cacheControl?: string;
  headers?: Record<string, string>;
}

export const json = (
  statusCode: number,
  body: unknown,
  meta?: ResponseMeta | Record<string, string>,
): JsonResponse => {
  const normalizedMeta: ResponseMeta =
    meta && ('requestId' in meta || 'durationMs' in meta || 'cacheControl' in meta)
      ? (meta as ResponseMeta)
      : { headers: meta as Record<string, string> };

  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    ...(normalizedMeta.headers ?? {}),
  };

  if (normalizedMeta.requestId) {
    headers['x-request-id'] = normalizedMeta.requestId;
  }

  if (typeof normalizedMeta.durationMs === 'number') {
    headers['server-timing'] = `app;dur=${normalizedMeta.durationMs.toFixed(2)}`;
  }

  if (normalizedMeta.cacheControl) {
    headers['cache-control'] = normalizedMeta.cacheControl;
  } else if (!headers['cache-control']) {
    // Default safe policy: no-store for mutation/errors
    headers['cache-control'] = 'no-store, no-cache, must-revalidate';
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
};

export const rateLimited = (
  retryAfterSeconds: number,
  requestId?: string,
): JsonResponse =>
  json(
    429,
    {
      message: 'Too many requests. Please slow down and try again.',
      retryAfterSeconds,
    },
    {
      requestId,
      headers: {
        'retry-after': String(retryAfterSeconds),
      },
    },
  );
