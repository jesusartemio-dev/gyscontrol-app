'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, RotateCcw, ShieldAlert, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { RollbackBlocker } from '@/lib/utils/rollbackValidation'

interface RollbackCheckResult {
  allowed: boolean
  blockers: RollbackBlocker[]
  message: string
  fieldsToClean: string[]
}

type EntityType = 'ordenCompra' | 'listaEquipo' | 'pedidoEquipo'

const API_BASE: Record<EntityType, string> = {
  ordenCompra: '/api/orden-compra',
  listaEquipo: '/api/lista-equipo',
  pedidoEquipo: '/api/pedido-equipo',
}

interface RollbackButtonProps {
  entityType: EntityType
  entityId: string
  currentEstado: string
  targetEstado: string
  targetLabel: string
  onSuccess: (updated: any) => void
}

export function RollbackButton({
  entityType,
  entityId,
  currentEstado,
  targetEstado,
  targetLabel,
  onSuccess,
}: RollbackButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [checkResult, setCheckResult] = useState<RollbackCheckResult | null>(null)
  const [motivo, setMotivo] = useState('')

  const base = API_BASE[entityType]

  const handleClick = async () => {
    setDialogOpen(true)
    setChecking(true)
    setCheckResult(null)
    setMotivo('')

    try {
      const res = await fetch(`${base}/${entityId}/retroceder?target=${targetEstado}`)
      const result: RollbackCheckResult = await res.json()
      setCheckResult(result)
    } catch {
      setCheckResult({
        allowed: false,
        blockers: [],
        message: 'Error al verificar. Intente nuevamente.',
        fieldsToClean: [],
      })
    } finally {
      setChecking(false)
    }
  }

  const handleConfirm = async () => {
    setExecuting(true)
    try {
      const res = await fetch(`${base}/${entityId}/retroceder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEstado, motivo: motivo.trim() || undefined }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al retroceder')
      }
      const updated = await res.json()
      setDialogOpen(false)
      toast.success('Estado actualizado')
      onSuccess(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al retroceder')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="text-orange-600 border-orange-300 hover:bg-orange-50"
        title={`Retroceder a ${targetLabel}`}
      >
        <RotateCcw className="h-4 w-4 mr-1" />
        {targetLabel}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          {checking ? (
            <>
              <DialogHeader>
                <DialogTitle>Verificando...</DialogTitle>
                <DialogDescription>
                  Comprobando si es seguro retroceder el estado.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </>
          ) : checkResult && !checkResult.allowed ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  <DialogTitle>No se puede retroceder</DialogTitle>
                </div>
                <DialogDescription>
                  Hay dependencias que impiden retroceder el estado.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                {checkResult.blockers.map((blocker, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="text-amber-800 dark:text-amber-200">{blocker.message}</span>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-orange-500" />
                  <DialogTitle>Retroceder estado</DialogTitle>
                </div>
                <DialogDescription>
                  {checkResult?.message}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{currentEstado}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="rounded bg-orange-100 px-2 py-0.5 font-mono text-xs text-orange-700">{targetEstado}</span>
                </div>
                <Textarea
                  placeholder="Motivo del retroceso (opcional)"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={executing}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={executing}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {executing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Retrocediendo...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-1 h-4 w-4" />
                      Retroceder
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
