import { useAuthStore } from '../store/authStore'
import {
  canMutate,
  canPerformAction,
  getEffectivePermission,
  hasPageAccess,
  type PageKey,
  type PermissionLevel,
} from '../config/rbac'

export function usePermissions(pageKey?: PageKey) {
  const roles = useAuthStore((state) => state.roles)

  const permission: PermissionLevel = pageKey ? getEffectivePermission(roles, pageKey) : 'NONE'
  const isFull = pageKey ? canMutate(roles, pageKey) : false
  const isViewOnly = permission === 'VIEW'
  const isNone = permission === 'NONE'

  const canAction = (action: PermissionLevel, targetPage?: PageKey) => {
    const key = targetPage ?? pageKey
    if (!key) return false
    return canPerformAction(roles, key, action)
  }

  const checkAccess = (targetPage: PageKey) => hasPageAccess(roles, targetPage)
  const checkMutate = (targetPage: PageKey) => canMutate(roles, targetPage)

  return {
    roles,
    permission,
    isFull,
    isViewOnly,
    isNone,
    canAction,
    checkAccess,
    checkMutate,
    canReceive: permission === 'FULL' || permission === 'RECEIVE',
    canCreate: permission === 'FULL' || permission === 'CREATE',
    canExecute: permission === 'FULL' || permission === 'EXECUTE',
    canCalcOnly: permission === 'FULL' || permission === 'CALC_ONLY',
    canLogTest: permission === 'FULL' || permission === 'LOG_TEST',
  }
}
