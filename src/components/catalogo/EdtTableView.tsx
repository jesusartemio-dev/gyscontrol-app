'use client'

import { useState, useEffect } from 'react'
import { Pencil, Trash2, Check, X, Loader2, ShieldAlert } from 'lucide-react'
import { Edt, FaseDefault } from '@/types'
import { updateEdt, deleteEdt } from '@/lib/services/edt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
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

interface Props {
  data?: Edt[]
  onUpdate?: (edt: Edt) => void
  onDelete?: (id: string) => void
  loading?: boolean
}

export default function EdtTableView({ data, onUpdate, onDelete, loading = false }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [faseDefaultId, setFaseDefaultId] = useState<string>('')
  const [fasesDefault, setFasesDefault] = useState<FaseDefault[]>([])
  const [guardando, setGuardando] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [edtAEliminar, setEdtAEliminar] = useState<Edt | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    const cargarFasesDefault = async () => {
      try {
        const response = await fetch('/api/configuracion/fases-default')
        if (response.ok) {
          const data = await response.json()
          setFasesDefault(data.data || [])
        }
      } catch (error) {
        console.error('Error cargando fases por defecto:', error)
      }
    }
    cargarFasesDefault()
  }, [])

  const iniciarEdicion = (edt: Edt) => {
    setEditando(edt.id)
    setNombre(edt.nombre)
    setDescripcion(edt.descripcion || '')
    setFaseDefaultId(edt.faseDefaultId || '')
  }

  const cancelarEdicion = () => {
    setEditando(null)
    setNombre('')
    setDescripcion('')
    setFaseDefaultId('')
  }

  const guardar = async (id: string) => {
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    setGuardando(true)
    try {
      const actualizada = await updateEdt(id, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        faseDefaultId: faseDefaultId || undefined
      })

      const edtConFaseDefault = {
        ...actualizada,
        faseDefault: faseDefaultId ? fasesDefault.find(f => f.id === faseDefaultId) : undefined
      }

      toast.success('EDT actualizado')
      onUpdate?.(edtConFaseDefault)
      cancelarEdicion()
    } catch (err) {
      console.error('Error updating edt:', err)
      toast.error('Error al actualizar el EDT')
    } finally {
      setGuardando(false)
    }
  }

  const handleConfirmarEliminar = (edt: Edt) => {
    setEdtAEliminar(edt)
    setDeleteDialogOpen(true)
  }

  const handleEliminar = async () => {
    if (!edtAEliminar) return
    setEliminando(true)
    try {
      const res = await fetch(`/api/edt/${edtAEliminar.id}`, { method: 'DELETE' })
      if (res.status === 409) {
        const data = await res.json()
        toast.error(data.error || 'EDT en uso, no se puede eliminar')
        setDeleteDialogOpen(false)
        setEdtAEliminar(null)
        return
      }
      if (!res.ok) throw new Error('Error al eliminar')
      toast.success('EDT eliminado')
      onDelete?.(edtAEliminar.id)
      setDeleteDialogOpen(false)
      setEdtAEliminar(null)
    } catch (err) {
      console.error('Error deleting edt:', err)
      toast.error('Error al eliminar el EDT')
    } finally {
      setEliminando(false)
    }
  }

  const getUsoTotal = (edt: Edt) => {
    if (!edt._count) return 0
    return edt._count.cotizacionEdt + edt._count.proyectoEdt
  }

  const getUsoTooltip = (edt: Edt) => {
    if (!edt._count) return ''
    const parts: string[] = []
    if (edt._count.cotizacionEdt > 0) parts.push(`${edt._count.cotizacionEdt} cotización(es)`)
    if (edt._count.proyectoEdt > 0) parts.push(`${edt._count.proyectoEdt} proyecto(s)`)
    return parts.join(', ')
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      guardar(id)
    } else if (e.key === 'Escape') {
      cancelarEdicion()
    }
  }

  if (loading || !data || data.length === 0) {
    return null
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
              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Descripción
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Fase por Defecto
              </th>
              <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
                Uso
              </th>
              <th className="w-24 py-2 px-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((edt) => (
              <tr key={edt.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-2 px-3">
                  {editando === edt.id ? (
                    <Input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, edt.id)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm font-medium">{edt.nombre}</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {editando === edt.id ? (
                    <Input
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, edt.id)}
                      placeholder="Sin descripción"
                      className="h-8 text-sm"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {edt.descripcion || '—'}
                    </span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {editando === edt.id ? (
                    <Select
                      value={faseDefaultId || "none"}
                      onValueChange={(value) => setFaseDefaultId(value === "none" ? "" : value)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin fase</SelectItem>
                        {fasesDefault.map((fase) => (
                          <SelectItem key={fase.id} value={fase.id}>
                            {fase.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {edt.faseDefault?.nombre || '—'}
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-center">
                  {(() => {
                    const uso = getUsoTotal(edt)
                    if (uso > 0) {
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="text-xs">
                              {uso}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{getUsoTooltip(edt)}</TooltipContent>
                        </Tooltip>
                      )
                    }
                    return <span className="text-xs text-muted-foreground">—</span>
                  })()}
                </td>
                <td className="py-2 px-3">
                  <div className="flex justify-end gap-1">
                    {editando === edt.id ? (
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
                              onClick={() => guardar(edt.id)}
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
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => iniciarEdicion(edt)}
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
                              onClick={() => handleConfirmarEliminar(edt)}
                              disabled={editando !== null || getUsoTotal(edt) > 0}
                            >
                              {getUsoTotal(edt) > 0 ? (
                                <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {getUsoTotal(edt) > 0
                              ? `No se puede eliminar: en uso en ${getUsoTooltip(edt)}`
                              : 'Eliminar'
                            }
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar EDT?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el EDT "{edtAEliminar?.nombre}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
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
