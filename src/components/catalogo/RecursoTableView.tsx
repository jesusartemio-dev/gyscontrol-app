'use client'

import { useState } from 'react'
import { Recurso } from '@/types'
import { deleteRecurso, updateRecurso } from '@/lib/services/recurso'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Edit,
  Trash2,
  Save,
  X,
  DollarSign,
  Users,
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
      <div className="border rounded-lg bg-white p-4 space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-lg bg-white p-8 text-center">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="border rounded-lg bg-white p-8 text-center">
        <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-medium mb-1">No hay recursos</h3>
        <p className="text-sm text-muted-foreground">
          Comienza agregando tu primer recurso
        </p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/80">
            <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700">Nombre</TableHead>
            <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 w-32">Costo/Hora</TableHead>
            <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 w-24 text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((recurso) => (
            <TableRow key={recurso.id} className="hover:bg-blue-50/50 text-xs">
              {editando === recurso.id ? (
                <>
                  <TableCell className="px-3 py-1.5">
                    <Input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Nombre del recurso"
                      className="h-7 text-xs"
                    />
                  </TableCell>
                  <TableCell className="px-3 py-1.5">
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                      <Input
                        type="number"
                        value={costoHora}
                        onChange={(e) => setCostoHora(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="pl-7 h-7 text-xs"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-center">
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelarEdicion}
                        disabled={guardando}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => guardar(recurso.id)}
                        disabled={guardando}
                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                      >
                        {guardando ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="px-3 py-1.5 font-medium">{recurso.nombre}</TableCell>
                  <TableCell className="px-3 py-1.5">
                    <span className="font-mono text-xs">
                      {formatCurrency(recurso.costoHora)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-center">
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => iniciarEdicion(recurso)}
                        disabled={editando !== null || eliminando !== null}
                        className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                        title="Editar"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminar(recurso.id)}
                        disabled={editando !== null || eliminando === recurso.id}
                        className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                        title="Eliminar"
                      >
                        {eliminando === recurso.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
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