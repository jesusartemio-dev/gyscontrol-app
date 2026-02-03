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

  const handleConfirmarEliminar = (categoria: CategoriaEquipo) => {
    setCategoriaAEliminar(categoria)
    setDeleteDialogOpen(true)
  }

  const handleEliminar = async () => {
    if (!categoriaAEliminar) return
    setEliminando(true)
    try {
      await deleteCategoriaEquipo(categoriaAEliminar.id)
      toast.success('Categoría eliminada')
      onDelete?.(categoriaAEliminar.id)
      setDeleteDialogOpen(false)
      setCategoriaAEliminar(null)
    } catch (error) {
      toast.error('Error al eliminar')
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

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará la categoría "{categoriaAEliminar?.nombre}". Esta acción no se puede deshacer.
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la categoría "{categoriaAEliminar?.nombre}". Esta acción no se puede deshacer.
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
