import { isAxiosError } from 'axios'

export interface ApiErrorInfo {
  status?: number
  backendMessage?: string
  correlationId?: string
  message: string
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function extractBackendMessage(data: unknown): string | undefined {
  if (typeof data === 'string') {
    // Do not show an HTML proxy/error page as a user-facing message.
    return data.trim().startsWith('<') ? undefined : nonEmptyString(data)
  }
  if (!data || typeof data !== 'object') return undefined
  const body = data as Record<string, unknown>
  return nonEmptyString(body.message)
    ?? nonEmptyString(body.detail)
    ?? nonEmptyString(body.error)
    ?? nonEmptyString(body.title)
}

/** Normalize unknown failures without changing the original Axios error. */
export function getApiError(
  error: unknown,
  fallbackMessage = 'Unable to complete the request. Please try again.',
): ApiErrorInfo {
  if (!isAxiosError(error)) {
    return { message: fallbackMessage }
  }

  const backendMessage = extractBackendMessage(error.response?.data)
  const correlationId = error.response
    ? nonEmptyString(Object.entries(error.response.headers)
      .find(([name]) => name.toLowerCase() === 'x-correlation-id')?.[1])
    : undefined

  return {
    status: error.response?.status,
    backendMessage,
    correlationId,
    message: backendMessage ?? fallbackMessage,
  }
}
