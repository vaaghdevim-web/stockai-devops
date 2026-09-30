import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken

  if (token) {
    redirectingToLogin = false
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

let redirectingToLogin = false

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const path = error.config?.url?.split(/[?#]/)[0].replace(/\/$/, '')
      const isLoginRequest = path?.endsWith('/api/v1/auth/login')
      const currentToken = useAuthStore.getState().accessToken
      const sentToken = error.config?.headers.Authorization
      // An old in-flight request must not log out a newly signed-in session.
      const belongsToCurrentSession = !currentToken || sentToken === `Bearer ${currentToken}`

      if (!isLoginRequest && belongsToCurrentSession) {
        // No verified refresh request/response contract is defined in this frontend.
        // Do not replay requests or guess a refresh payload: terminate the session.
        useAuthStore.getState().logout()
        if (window.location.pathname !== '/login' && !redirectingToLogin) {
          redirectingToLogin = true
          window.location.replace('/login')
        }
      }
    }

    // Preserve Axios errors for existing module-level handling and apiError helpers.
    return Promise.reject(error)
  },
)
