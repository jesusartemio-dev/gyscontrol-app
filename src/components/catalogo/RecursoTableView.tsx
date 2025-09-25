// ===================================================
// 📁 Archivo: RecursoTableView.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Vista de tabla para recursos
//
// 🧠 Uso: Vista tabular de recursos con edición inline
// ✍️ Autor: Jesús Artemio
// 📅 Creación: 2025-09-25
// ===================================================

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Recurso } from '@/types'
import { deleteRecurso, updateRecurso } from '@/lib/services/recurso'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Edit,
  Trash2,
  Save,
  X,
  DollarSign,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  data?: Recurso[]
  onUpdate?: (r: Recurso) => void
  onDelete?: (id: string) => void
  loading?: boolean
  error?: string | null
}

// Currency formatter
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

export default function RecursoTableView({ data, onUpdate, onDelete, loading = false, error = null }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [costoHora, setCostoHora] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const iniciarEdicion = (r: Recurso) => {
    setEditando(r.id)
    setNombre(r.nombre)
    setCostoHora(r.costoHora)
  }

  const cancelarEdicion = () => {
    setEditando(null)
    setNombre('')
    setCostoHora(0)
  }

  const guardar = async (id: string) => {
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (costoHora <= 0) {
      toast.error('El costo por hora debe ser mayor a 0')
      return
    }

    setGuardando(true)
    try {
      const actualizado = await updateRecurso(id, { nombre: nombre.trim(), costoHora })
      toast.success('Recurso actualizado correctamente')
      onUpdate?.(actualizado)
      setEditando(null)
      setNombre('')
      setCostoHora(0)
    } catch (error) {
      console.error('Error al actualizar recurso:', error)
      toast.error('Error al actualizar el recurso')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    setEliminando(id)
    try {
      await deleteRecurso(id)
      toast.success('Recurso eliminado correctamente')
      onDelete?.(id)
    } catch (error) {
      console.error('Error al eliminar recurso:', error)
      toast.error('Error al eliminar el recurso')
    } finally {
      setEliminando(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay recursos disponibles
        </h3>
        <p className="text-gray-500">
          Los recursos que agregues aparecerán aquí para su gestión.
        </p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Nombre del Recurso</TableHead>
            <TableHead className="w-[30%]">Costo por Hora</TableHead>
            <TableHead className="w-[30%] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((recurso) => (
            <TableRow key={recurso.id}>
              {editando === recurso.id ? (
                <>
                  <TableCell>
                    <Input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Nombre del recurso"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                      <Input
                        type="number"
                        value={costoHora}
                        onChange={(e) => setCostoHora(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="pl-8 h-8"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelarEdicion}
                        disabled={guardando}
                        className="h-7 px-2 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => guardar(recurso.id)}
                        disabled={guardando}
                        className="h-7 px-2 text-xs"
                      >
                        {guardando ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save className="h-3 w-3 mr-1" />
                            Guardar
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="font-medium">{recurso.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {formatCurrency(recurso.costoHora)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => iniciarEdicion(recurso)}
                        disabled={editando !== null || eliminando !== null}
                        className="h-7 px-2 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => eliminar(recurso.id)}
                        disabled={editando !== null || eliminando === recurso.id}
                        className="h-7 px-2 text-xs"
                      >
                        {eliminando === recurso.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Eliminando...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3 mr-1" />
                            Eliminar
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}