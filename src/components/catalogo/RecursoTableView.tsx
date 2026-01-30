'use client'

import { useState } from 'react'
import { Recurso } from '@/types'
import { deleteRecurso, updateRecurso } from '@/lib/services/recurso'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Edit,
  Trash2,
  Save,
  X,
  DollarSign,
  Users,
  User,
  Loader2,
  UsersRound
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
    <TooltipProvider>
      <div className="border rounded-lg bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700">Nombre</TableHead>
              <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 w-24">Tipo</TableHead>
              <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 w-40">Composición</TableHead>
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
                      <Badge variant="outline" className="text-[10px]">
                        {recurso.tipo === 'cuadrilla' ? 'Cuadrilla' : 'Individual'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-1.5">-</TableCell>
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
                    <TableCell className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center",
                          recurso.tipo === 'cuadrilla' ? "bg-purple-100" : "bg-blue-100"
                        )}>
                          {recurso.tipo === 'cuadrilla' ? (
                            <UsersRound className="h-3 w-3 text-purple-600" />
                          ) : (
                            <User className="h-3 w-3 text-blue-600" />
                          )}
                        </div>
                        <span className="font-medium">{recurso.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          recurso.tipo === 'cuadrilla'
                            ? "border-purple-200 bg-purple-50 text-purple-700"
                            : "border-blue-200 bg-blue-50 text-blue-700"
                        )}
                      >
                        {recurso.tipo === 'cuadrilla' ? 'Cuadrilla' : 'Individual'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-1.5">
                      {recurso.composiciones && recurso.composiciones.length > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-help">
                              <div className="flex -space-x-1">
                                {recurso.composiciones.slice(0, 3).map((comp, idx) => (
                                  <div
                                    key={comp.id || idx}
                                    className="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[8px] font-medium"
                                  >
                                    {comp.empleado?.user?.name?.charAt(0) || '?'}
                                  </div>
                                ))}
                                {recurso.composiciones.length > 3 && (
                                  <div className="w-5 h-5 rounded-full bg-gray-300 border border-white flex items-center justify-center text-[8px] font-medium">
                                    +{recurso.composiciones.length - 3}
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground ml-1">
                                {recurso.composiciones.length} persona{recurso.composiciones.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold text-xs mb-2">Composición:</p>
                              {recurso.composiciones.map((comp, idx) => (
                                <div key={comp.id || idx} className="flex items-center justify-between gap-4 text-xs">
                                  <span>{comp.empleado?.user?.name || 'Sin nombre'}</span>
                                  <span className="text-muted-foreground">
                                    {comp.rol && `${comp.rol} · `}{comp.porcentaje}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">-</span>
                      )}
                    </TableCell>
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
    </TooltipProvider>
  )
}