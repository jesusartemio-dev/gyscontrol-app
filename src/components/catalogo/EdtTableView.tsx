// ===================================================
// 📁 Archivo: EdtTableView.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Vista de tabla para EDTs
//
// 🧠 Uso: Vista tabular con edición inline para EDTs
// ✍️ Autor: Jesús Artemio
// 📅 Creación: 2025-10-15
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { FolderOpen, Edit, Trash2, Save, X, Loader2 } from 'lucide-react'
import { Edt, FaseDefault } from '@/types'
import { updateEdt, deleteEdt } from '@/lib/services/edt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

interface Props {
  data?: Edt[]
  onUpdate?: (edt: Edt) => void
  onDelete?: (id: string) => void
  loading?: boolean
  error?: string | null
}

export default function EdtTableView({ data, onUpdate, onDelete, loading = false, error = null }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [faseDefaultId, setFaseDefaultId] = useState<string>('')
  const [fasesDefault, setFasesDefault] = useState<FaseDefault[]>([])
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  // Cargar fases por defecto
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

    if (nombre.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres')
      return
    }

    setGuardando(true)
    try {
      const actualizada = await updateEdt(id, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        faseDefaultId: faseDefaultId || undefined
      })

      // ✅ Asegurar que el EDT actualizado tenga la información de faseDefault
      const edtConFaseDefault = {
        ...actualizada,
        faseDefault: faseDefaultId ? fasesDefault.find(f => f.id === faseDefaultId) : undefined
      }

      toast.success('EDT actualizado exitosamente')
      onUpdate?.(edtConFaseDefault)
      setEditando(null)
      setNombre('')
      setDescripcion('')
      setFaseDefaultId('')
    } catch (err) {
      console.error('Error updating edt:', err)
      toast.error('Error al actualizar el EDT')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    setEliminando(id)
    try {
      await deleteEdt(id)
      toast.success('EDT eliminado exitosamente')
      onDelete?.(id)
    } catch (err) {
      console.error('Error deleting edt:', err)
      toast.error('Error al eliminar el EDT')
    } finally {
      setEliminando(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
            </div>
            <div className="flex space-x-2">
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">Error al cargar los EDTs</div>
        <div className="text-sm text-gray-500">{error}</div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay EDTs registrados</h3>
        <p className="text-muted-foreground">
          Los EDTs aparecerán aquí una vez que sean creados
        </p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Fase por Defecto</TableHead>
            <TableHead className="w-32">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((edt) => (
            <TableRow key={edt.id}>
              <TableCell>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                </div>
              </TableCell>
              <TableCell>
                {editando === edt.id ? (
                  <Input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="h-8"
                    placeholder="Nombre del EDT"
                  />
                ) : (
                  <div className="font-medium">{edt.nombre}</div>
                )}
              </TableCell>
              <TableCell>
                {editando === edt.id ? (
                  <Textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="min-h-8 resize-none"
                    placeholder="Descripción opcional"
                    rows={2}
                  />
                ) : (
                  <div className="text-sm text-gray-600 max-w-xs truncate">
                    {edt.descripcion || 'Sin descripción'}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {editando === edt.id ? (
                  <Select value={faseDefaultId || "none"} onValueChange={(value) => setFaseDefaultId(value === "none" ? "" : value)}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Seleccionar fase..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin fase por defecto</SelectItem>
                      {fasesDefault.map((fase) => (
                        <SelectItem key={fase.id} value={fase.id}>
                          {fase.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm">
                    {edt.faseDefault?.nombre || 'Sin asignar'}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {editando === edt.id ? (
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      onClick={() => guardar(edt.id)}
                      disabled={guardando}
                      className="h-7 px-2"
                    >
                      {guardando ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelarEdicion}
                      disabled={guardando}
                      className="h-7 px-2"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => iniciarEdicion(edt)}
                      disabled={editando !== null || eliminando !== null}
                      className="h-7 px-2"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => eliminar(edt.id)}
                      disabled={editando !== null || eliminando === edt.id}
                      className="h-7 px-2"
                    >
                      {eliminando === edt.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}