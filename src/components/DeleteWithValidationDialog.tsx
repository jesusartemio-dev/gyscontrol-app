'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldAlert, Trash2, AlertTriangle } from 'lucide-react'
import type { DeleteBlocker } from '@/lib/utils/deleteValidation'

interface DeleteWithValidationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  checking: boolean
  deleting: boolean
  allowed: boolean | null
  blockers: DeleteBlocker[]
  message: string
  onConfirm: () => void
  onCancel: () => void
  entityLabel?: string
}

export function DeleteWithValidationDialog({
  open,
  onOpenChange,
  checking,
  deleting,
  allowed,
  blockers,
  message,
  onConfirm,
  onCancel,
  entityLabel = 'registro',
}: DeleteWithValidationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {checking ? (
          <>
            <DialogHeader>
              <DialogTitle>Verificando dependencias...</DialogTitle>
              <DialogDescription>
                Comprobando si es seguro eliminar este {entityLabel}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : allowed === false ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                <DialogTitle>No se puede eliminar</DialogTitle>
              </div>
              <DialogDescription>
                Este {entityLabel} tiene dependencias activas que impiden su eliminacion.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              {blockers.map((blocker, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="text-amber-800 dark:text-amber-200">{blocker.message}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Eliminalos primero o cancelalos antes de intentar nuevamente.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={onCancel}>
                Cerrar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <DialogTitle>Eliminar {entityLabel}</DialogTitle>
              </div>
              <DialogDescription>
                Esta accion no se puede deshacer. Se eliminara permanentemente este {entityLabel} y todos sus datos asociados.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={onCancel} disabled={deleting}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={onConfirm}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
