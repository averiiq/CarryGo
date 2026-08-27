export interface AwsApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
}

export class AwsApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

const getRequiredApiBaseUrl = (): string => {
  const value = process.env.EXPO_PUBLIC_AWS_API_BASE_URL;
  if (!value) {
    throw new AwsApiError(
      'EXPO_PUBLIC_AWS_API_BASE_URL is missing. Configure AWS API URL for aws backend mode.',
      500,
    );
  }

  return value.replace(/\/$/, '');
};

const normalizePath = (path: string): string => {
  if (!path.startsWith('/')) {
    throw new AwsApiError('AWS API path must start with /', 500);
  }

  if (path === '/health') {
    return path;
  }

  if (path.startsWith('/api/')) {
    return path;
  }

  return `/api${path}`;
};

const buildHeaders = (options: AwsApiRequestOptions): Record<string, string> => {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  const staticToken = process.env.EXPO_PUBLIC_AWS_API_BEARER_TOKEN;
  if (staticToken) {
    if (process.env.EXPO_PUBLIC_APP_MODE === 'production') {
      throw new AwsApiError(
        'EXPO_PUBLIC_AWS_API_BEARER_TOKEN cannot be used in production mode.',
        500,
      );
    }

    headers.authorization = `Bearer ${staticToken}`;
  }

  if (options.idempotencyKey) {
    headers['idempotency-key'] = options.idempotencyKey;
  }

  return headers;
};

export async function awsApiRequest<T>(
  path: string,
  options: AwsApiRequestOptions = {},
): Promise<T> {
  const baseUrl = getRequiredApiBaseUrl();
  const normalizedPath = normalizePath(path);
  const method = options.method ?? 'GET';
  const response = await fetch(`${baseUrl}${normalizedPath}`, {
    method,
    headers: buildHeaders(options),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      (payload as { message?: string } | null)?.message ??
      `AWS API request failed with status ${response.status}`;
    throw new AwsApiError(message, response.status);
  }

  return payload as T;
}
