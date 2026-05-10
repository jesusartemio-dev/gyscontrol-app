'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Props {
  proyectoId: string
  onEliminado?: () => void
  disabled?: boolean
}

export function BotonEliminarPlan({ proyectoId, onEliminado, disabled }: Props) {
  const [eliminando, setEliminando] = useState(false)

  const handleEliminar = async () => {
    setEliminando(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo`, { method: 'DELETE' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error((e as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      toast.success('Plan eliminado. Podés crear uno nuevo.')
      onEliminado?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setEliminando(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || eliminando}
          className="text-destructive hover:bg-destructive/10 border-destructive/30"
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Eliminar Plan
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar el Plan de Trabajo?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará el plan completo con todas sus secciones y el historial de exportaciones DOCX.
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleEliminar}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
