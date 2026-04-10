'use client'

import { useState } from 'react'
import { CategoriaEquipo } from '@/types'
import { updateCategoriaEquipo, deleteCategoriaEquipo } from '@/lib/services/categoriaEquipo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Pencil, Trash2, Check, X } from 'lucide-react'
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
  data: CategoriaEquipo[]
  onUpdate?: (categoria: CategoriaEquipo) => void
  onDelete?: (id: string) => void
  onRefresh?: () => void
  viewMode?: 'table' | 'card'
}

export default function CategoriaEquipoList({ data, onUpdate, onDelete, onRefresh, viewMode = 'table' }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombreEditado, setNombreEditado] = useState('')
  const [descripcionEditada, setDescripcionEditada] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoriaAEliminar, setCategoriaAEliminar] = useState<CategoriaEquipo | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [equiposEnUso, setEquiposEnUso] = useState<any[]>([])

  const handleEditar = (categoria: CategoriaEquipo) => {
    setEditando(categoria.id)
    setNombreEditado(categoria.nombre)
    setDescripcionEditada(categoria.descripcion || '')
  }

  const handleCancelar = () => {
    setEditando(null)
    setNombreEditado('')
    setDescripcionEditada('')
  }

  const handleGuardar = async (id: string) => {
    if (!nombreEditado.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    setGuardando(true)
    try {
      const actualizado = await updateCategoriaEquipo(id, {
        nombre: nombreEditado.trim(),
        descripcion: descripcionEditada.trim() || undefined
      })
      toast.success('Categoría actualizada')
      onUpdate?.(actualizado)
      setEditando(null)
    } catch (error) {
      toast.error('Error al actualizar')
    } finally {
      setGuardando(false)
    }
  }

  const [verificando, setVerificando] = useState(false)

  const handleConfirmarEliminar = async (categoria: CategoriaEquipo) => {
    setCategoriaAEliminar(categoria)
    setEquiposEnUso([])
    setVerificando(true)
    try {
      // Pre-cargar equipos en uso antes de abrir el dialog
      const res = await fetch(`/api/categoria-equipo/${categoria.id}/en-uso`)
      if (res.ok) {
        const data = await res.json()
        setEquiposEnUso(data.equiposEnUso || [])
      }
    } catch { /* si falla, abrimos igual y el delete mostrará el error */ }
    finally { setVerificando(false) }
    setDeleteDialogOpen(true)
  }

  const handleEliminar = async () => {
    if (!categoriaAEliminar || equiposEnUso.length > 0) return
    setEliminando(true)
    try {
      const result = await deleteCategoriaEquipo(categoriaAEliminar.id)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Categoría eliminada')
      onDelete?.(categoriaAEliminar.id)
      setDeleteDialogOpen(false)
      setCategoriaAEliminar(null)
      setEquiposEnUso([])
    } finally {
      setEliminando(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGuardar(id)
    } else if (e.key === 'Escape') {
      handleCancelar()
    }
  }

  if (viewMode === 'card') {
    return (
      <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
          {data.map((cat) => (
            <div
              key={cat.id}
              className="p-3 border rounded-lg hover:border-primary/30 transition-colors"
            >
              {editando === cat.id ? (
                <div className="space-y-2">
                  <Input
                    value={nombreEditado}
                    onChange={(e) => setNombreEditado(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, cat.id)}
                    placeholder="Nombre"
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Input
                    value={descripcionEditada}
                    onChange={(e) => setDescripcionEditada(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, cat.id)}
                    placeholder="Descripción (opcional)"
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={handleCancelar}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleGuardar(cat.id)}
                      disabled={guardando}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm truncate">{cat.nombre}</h3>
                    {cat.descripcion && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {cat.descripcion}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEditar(cat)}
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
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleConfirmarEliminar(cat)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Eliminar</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setEquiposEnUso([]) }}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará la categoría "{categoriaAEliminar?.nombre}". Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {equiposEnUso.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="text-sm font-medium text-amber-800">
                  {equiposEnUso.length} equipo{equiposEnUso.length !== 1 ? 's' : ''} del catálogo usan esta categoría. Reasígnalos primero:
                </p>
                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                  {equiposEnUso.map((eq: any) => {
                    const lista = eq.listaEquipoItem?.[0]?.listaEquipo
                    return (
                      <li key={eq.id} className="text-xs text-amber-700 border-b border-amber-100 pb-1 last:border-0">
                        <span className="font-mono font-semibold">{eq.codigo}</span> — {eq.descripcion}
                        {lista && (
                          <span className="block text-amber-600 mt-0.5">
                            Lista: {lista.codigo} · {lista.proyecto?.codigo} {lista.proyecto?.nombre}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleEliminar}
                disabled={eliminando || equiposEnUso.length > 0}
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
              <th className="w-20 py-2 px-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((cat) => (
              <tr
                key={cat.id}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="py-2 px-3">
                  {editando === cat.id ? (
                    <Input
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, cat.id)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm font-medium">{cat.nombre}</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {editando === cat.id ? (
                    <Input
                      value={descripcionEditada}
                      onChange={(e) => setDescripcionEditada(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, cat.id)}
                      placeholder="Sin descripción"
                      className="h-8 text-sm"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {cat.descripcion || '—'}
                    </span>
                  )}
                </td>
                <td className="py-2 px-3">
                  <div className="flex justify-end gap-1">
                    {editando === cat.id ? (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={handleCancelar}
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
                              onClick={() => handleGuardar(cat.id)}
                              disabled={guardando}
                            >
                              <Check className="h-4 w-4" />
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
                              onClick={() => handleEditar(cat)}
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
                              onClick={() => handleConfirmarEliminar(cat)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar</TooltipContent>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setEquiposEnUso([]) }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la categoría "{categoriaAEliminar?.nombre}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {equiposEnUso.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-sm font-medium text-amber-800">
                {equiposEnUso.length} equipo{equiposEnUso.length !== 1 ? 's' : ''} del catálogo usan esta categoría. Reasígnalos primero:
              </p>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {equiposEnUso.map((eq: any) => {
                  const lista = eq.listaEquipoItem?.[0]?.listaEquipo
                  return (
                    <li key={eq.id} className="text-xs text-amber-700 border-b border-amber-100 pb-1 last:border-0">
                      <span className="font-mono font-semibold">{eq.codigo}</span> — {eq.descripcion}
                      {lista && (
                        <span className="block text-amber-600 mt-0.5">
                          Lista: {lista.codigo} · {lista.proyecto?.codigo} {lista.proyecto?.nombre}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              disabled={eliminando || equiposEnUso.length > 0}
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
