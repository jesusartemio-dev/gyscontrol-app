'use client'

import { useState } from 'react'
import { Unidad } from '@/types'
import { deleteUnidad, updateUnidad } from '@/lib/services/unidad'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Pencil, Trash2, Check, X, Ruler, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  data?: Unidad[]
  onUpdate?: (unidad: Unidad) => void
  onDelete?: (id: string) => void
  loading?: boolean
  error?: string | null
}

export default function UnidadTableView({ data, onUpdate, onDelete }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Unidad | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const iniciarEdicion = (u: Unidad) => {
    setEditando(u.id)
    setNombre(u.nombre)
  }

  const cancelarEdicion = () => {
    setEditando(null)
    setNombre('')
  }

  const guardar = async (id: string) => {
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    setGuardando(true)
    try {
      const actualizada = await updateUnidad(id, { nombre: nombre.trim() })
      toast.success('Unidad actualizada')
      onUpdate?.(actualizada)
      cancelarEdicion()
    } catch (error) {
      console.error('Error al actualizar unidad:', error)
      toast.error('Error al actualizar')
    } finally {
      setGuardando(false)
    }
  }

  const confirmarEliminar = async () => {
    if (!deleteTarget) return
    setEliminando(true)
    try {
      await deleteUnidad(deleteTarget.id)
      toast.success('Unidad eliminada')
      onDelete?.(deleteTarget.id)
      setDeleteTarget(null)
    } catch (error) {
      console.error('Error al eliminar unidad:', error)
      toast.error('Error al eliminar')
    } finally {
      setEliminando(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      guardar(id)
    } else if (e.key === 'Escape') {
      cancelarEdicion()
    }
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <Ruler className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay unidades</h3>
        <p className="text-sm text-muted-foreground">
          Las unidades que agregues aparecerán aquí
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Nombre
              </th>
              <th className="w-24 py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((unidad) => (
              <tr key={unidad.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-2 px-3">
                  {editando === unidad.id ? (
                    <Input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, unidad.id)}
                      placeholder="Nombre de la unidad"
                      className="h-8 max-w-sm"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium text-sm">{unidad.nombre}</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  <div className="flex justify-end gap-1">
                    {editando === unidad.id ? (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={cancelarEdicion}
                              disabled={guardando}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Cancelar (Esc)</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => guardar(unidad.id)}
                              disabled={guardando}
                            >
                              {guardando ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Guardar (Enter)</TooltipContent>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => iniciarEdicion(unidad)}
                              disabled={editando !== null}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(unidad)}
                              disabled={editando !== null}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar</TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar unidad?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la unidad "{deleteTarget?.nombre}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminar}
              disabled={eliminando}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
