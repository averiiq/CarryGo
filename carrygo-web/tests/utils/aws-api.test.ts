import { afterEach, describe, expect, it, vi } from 'vitest'
import { AwsCmsApiError, awsCmsRequest } from '@/utils/aws/api'

describe('awsCmsRequest auth behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.CARRYGO_AWS_API_BASE_URL
    delete process.env.CARRYGO_AWS_API_BEARER_TOKEN
  })

  it('throws when token is missing for non-health endpoints', async () => {
    process.env.CARRYGO_AWS_API_BASE_URL = 'https://api.example.com'

    await expect(awsCmsRequest('/trips')).rejects.toMatchObject({
      message: 'CARRYGO_AWS_API_BEARER_TOKEN is missing',
      statusCode: 500,
    })
  })

  it('allows health endpoint without token', async () => {
    process.env.CARRYGO_AWS_API_BASE_URL = 'https://api.example.com'

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const result = await awsCmsRequest<{ status: string }>('/health')
    expect(result.status).toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
