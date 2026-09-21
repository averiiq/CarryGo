export class AwsCmsApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

const getApiBaseUrl = (): string => {
  const value = process.env.CARRYGO_AWS_API_BASE_URL
  if (!value) {
    throw new AwsCmsApiError('CARRYGO_AWS_API_BASE_URL is missing', 500)
  }

  return value.replace(/\/$/, '')
}

const normalizePath = (path: string): string => {
  if (!path.startsWith('/')) {
    throw new AwsCmsApiError('AWS API path must start with /', 500)
  }

  if (path === '/health') {
    return path
  }

  if (path.startsWith('/api/')) {
    return path
  }

  return `/api${path}`
}

const getAuthHeader = (required: boolean): string | undefined => {
  const token = process.env.CARRYGO_AWS_API_BEARER_TOKEN
  if (!token) {
    if (required) {
      throw new AwsCmsApiError('CARRYGO_AWS_API_BEARER_TOKEN is missing', 500)
    }
    return undefined
  }

  return `Bearer ${token}`
}

export async function awsCmsRequest<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const normalizedPath = normalizePath(path)
  const auth = getAuthHeader(normalizedPath !== '/health')
  const response = await fetch(`${getApiBaseUrl()}${normalizedPath}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(auth ? { authorization: auth } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message = (payload as { message?: string } | null)?.message ?? `Request failed (${response.status})`
    throw new AwsCmsApiError(message, response.status)
  }

  return payload as T
}
