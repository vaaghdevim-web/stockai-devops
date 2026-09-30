import { isAxiosError } from 'axios'
import { apiClient } from './client'

export interface LoginRequest {
  usernameOrEmail: string
  password: string
  totpCode?: string
}

export interface LoginResponse {
  email: string
  refreshToken: string
  roles: string[]
  token: string
  tokenType: string
  userId: number
  userName: string
}

export function isMfaRequiredError(err: unknown): boolean {
  if (!isAxiosError(err) || !err.response) return false
  if (err.response.status !== 401 && err.response.status !== 403) return false
  const message = (err.response.data as { message?: string })?.message || ''
  return /mfa/i.test(message) && /required/i.test(message)
}

export async function loginUser(data: LoginRequest) {
  const response = await apiClient.post<LoginResponse>(
    '/api/v1/auth/login',
    data
  )

  return response.data
}

