import { create } from 'zustand'
import { normalizeRoles } from '../utils/roles'

const sessionKeys = ['accessToken', 'refreshToken', 'roles', 'userName', 'username', 'userId', 'email']

function readStorage(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage may be unavailable; the current session can still live in memory.
  }
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const result = value.trim()
  return result && result !== 'null' && result !== 'undefined' ? result : null
}

function tokenValue(value: unknown): string | null {
  const result = text(value)
  // Validate the bearer-token representation, not JWT claims or server validity.
  return result && /^[A-Za-z0-9._~+/-]+=*$/.test(result) ? result : null
}

function roleValues(value: unknown): string[] {
  return Array.isArray(value) && value.every((role) => typeof role === 'string' && role.trim())
    ? normalizeRoles(value)
    : []
}

function readRoles(): string[] {
  try { return roleValues(JSON.parse(readStorage('roles') || '[]')) } catch { return [] }
}

function clearStorage() {
  sessionKeys.forEach((key) => writeStorage(key, null))
}

const accessToken = tokenValue(readStorage('accessToken'))
const roles = accessToken ? readRoles() : []
const userName = accessToken ? text(readStorage('userName')) : null
if (!accessToken) clearStorage()
else {
  writeStorage('accessToken', accessToken)
  writeStorage('roles', JSON.stringify(roles))
  writeStorage('refreshToken', tokenValue(readStorage('refreshToken')))
  writeStorage('userName', userName)
}

interface SessionDetails {
  refreshToken?: string
  userName?: string
}

interface AuthState {
  accessToken: string | null
  roles: string[]
  userName: string | null
  isAuthenticated: boolean
  setAuth: (accessToken: string, roles: string[], details?: SessionDetails) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken,
  roles,
  userName,
  isAuthenticated: Boolean(accessToken),

  setAuth: (value, roleList, details = {}) => {
    const token = tokenValue(value)
    if (!token) {
      clearStorage()
      set({ accessToken: null, roles: [], userName: null, isAuthenticated: false })
      throw new Error('Invalid access token returned by server')
    }
    const nextRoles = roleValues(roleList)
    const nextUserName = text(details.userName)
    clearStorage()
    writeStorage('accessToken', token)
    writeStorage('roles', JSON.stringify(nextRoles))
    writeStorage('refreshToken', tokenValue(details.refreshToken))
    writeStorage('userName', nextUserName)
    set({ accessToken: token, roles: nextRoles, userName: nextUserName, isAuthenticated: true })
  },

  logout: () => {
    clearStorage()
    set({ accessToken: null, roles: [], userName: null, isAuthenticated: false })
  },
}))
