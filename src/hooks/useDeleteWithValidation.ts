'use client'

import { useState, useCallback } from 'react'
import type { DeletableEntity, DeleteBlocker } from '@/lib/utils/deleteValidation'

interface CanDeleteResult {
  allowed: boolean
  blockers: DeleteBlocker[]
  message: string
}

interface DeleteWithValidationState {
  dialogOpen: boolean
  checking: boolean
  deleting: boolean
  canDeleteResult: CanDeleteResult | null
  targetId: string | null
}

interface UseDeleteWithValidationOptions {
  entity: DeletableEntity
  /** URL builder for internal DELETE fetch */
  deleteEndpoint?: (id: string) => string
  /** Alternative: external delete handler (parent does the fetch) */
  onConfirmDelete?: (id: string) => void | Promise<void>
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function useDeleteWithValidation({
  entity,
  deleteEndpoint,
  onConfirmDelete,
  onSuccess,
  onError,
}: UseDeleteWithValidationOptions) {
  const [state, setState] = useState<DeleteWithValidationState>({
    dialogOpen: false,
    checking: false,
    deleting: false,
    canDeleteResult: null,
    targetId: null,
  })

  const requestDelete = useCallback(async (id: string) => {
    setState({
      dialogOpen: true,
      checking: true,
      deleting: false,
      canDeleteResult: null,
      targetId: id,
    })

    try {
      const res = await fetch(`/api/can-delete?entity=${entity}&id=${id}`)
      const result: CanDeleteResult = await res.json()

      setState(prev => ({
        ...prev,
        checking: false,
        canDeleteResult: result,
      }))
    } catch {
      setState(prev => ({
        ...prev,
        checking: false,
        canDeleteResult: {
          allowed: false,
          blockers: [],
          message: 'Error al verificar dependencias. Intente nuevamente.',
        },
      }))
    }
  }, [entity])

  const confirmDelete = useCallback(async () => {
    if (!state.targetId) return

    setState(prev => ({ ...prev, deleting: true }))

    try {
      if (onConfirmDelete) {
        // External delete: parent handles the actual deletion
        await onConfirmDelete(state.targetId)
      } else if (deleteEndpoint) {
        // Internal delete: hook does the fetch
        const res = await fetch(deleteEndpoint(state.targetId), {
          method: 'DELETE',
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Error al eliminar' }))
          throw new Error(data.error || 'Error al eliminar')
        }
      }

      setState({
        dialogOpen: false,
        checking: false,
        deleting: false,
        canDeleteResult: null,
        targetId: null,
      })

      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar'
      setState(prev => ({ ...prev, deleting: false }))
      onError?.(message)
    }
  }, [state.targetId, deleteEndpoint, onConfirmDelete, onSuccess, onError])

  const cancelDelete = useCallback(() => {
    setState({
      dialogOpen: false,
      checking: false,
      deleting: false,
      canDeleteResult: null,
      targetId: null,
    })
  }, [])

  return {
    ...state,
    requestDelete,
    confirmDelete,
    cancelDelete,
  }
}
