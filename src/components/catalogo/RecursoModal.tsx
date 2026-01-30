// ===================================================
// 📁 Archivo: RecursoModal.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Modal para crear recursos (individual o cuadrilla)
//
// 🧠 Uso: Modal que se abre desde la página de recursos
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-01-29
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { Calculator, Save, X, Plus, Trash2, User, UsersRound, Loader2 } from 'lucide-react'
import type { Recurso, Empleado } from '@/types'
import { createRecurso } from '@/lib/services/recurso'
import { getEmpleados } from '@/lib/services/empleado'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ComposicionItem {
  empleadoId: string
  empleado?: Empleado
  porcentaje: number
  rol: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated?: (nuevo: Recurso) => void
}

export default function RecursoModal({ isOpen, onClose, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<'individual' | 'cuadrilla'>('individual')
  const [costoHora, setCostoHora] = useState<number>(0)
  const [descripcion, setDescripcion] = useState('')
  const [composiciones, setComposiciones] = useState<ComposicionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loadingEmpleados, setLoadingEmpleados] = useState(false)

  // Cargar empleados al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadEmpleados()
    }
  }, [isOpen])

  const loadEmpleados = async () => {
    setLoadingEmpleados(true)
    try {
      const data = await getEmpleados()
      setEmpleados(data.filter(e => e.activo))
    } catch (error) {
      console.error('Error al cargar empleados:', error)
    } finally {
      setLoadingEmpleados(false)
    }
  }

  // Empleados disponibles (no agregados a la composición)
  const empleadosDisponibles = empleados.filter(
    e => !composiciones.some(c => c.empleadoId === e.id)
  )

  const handleAddMember = (empleadoId: string) => {
    const empleado = empleados.find(e => e.id === empleadoId)
    if (empleado) {
      setComposiciones([
        ...composiciones,
        { empleadoId, empleado, porcentaje: 100, rol: '' }
      ])
    }
  }

  const handleRemoveMember = (empleadoId: string) => {
    setComposiciones(composiciones.filter(c => c.empleadoId !== empleadoId))
  }

  const handleUpdateMember = (empleadoId: string, field: 'porcentaje' | 'rol', value: number | string) => {
    setComposiciones(composiciones.map(c =>
      c.empleadoId === empleadoId
        ? { ...c, [field]: value }
        : c
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (costoHora <= 0) {
      toast.error('El costo por hora debe ser mayor a 0')
      return
    }

    if (tipo === 'cuadrilla' && composiciones.length === 0) {
      toast.error('Una cuadrilla debe tener al menos un miembro')
      return
    }

    setLoading(true)
    try {
      const payload = {
        nombre: nombre.trim(),
        tipo,
        costoHora,
        descripcion: descripcion.trim() || undefined,
        ...(tipo === 'cuadrilla' && {
          composiciones: composiciones.map(c => ({
            empleadoId: c.empleadoId,
            porcentaje: c.porcentaje,
            rol: c.rol || undefined,
          }))
        })
      }
      const nuevo = await createRecurso(payload)
      toast.success('Recurso creado exitosamente')
      onCreated?.(nuevo)
      handleClose()
    } catch (err) {
      console.error('Error creating recurso:', err)
      toast.error('Error al crear recurso')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setNombre('')
    setTipo('individual')
    setCostoHora(0)
    setDescripcion('')
    setComposiciones([])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Nuevo Recurso
          </DialogTitle>
          <DialogDescription>
            Agrega un nuevo recurso al catálogo del sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Recurso */}
          <div className="space-y-2">
            <Label>Tipo de Recurso</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTipo('individual')
                  setComposiciones([])
                }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                  tipo === 'individual'
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  tipo === 'individual' ? "bg-blue-100" : "bg-gray-100"
                )}>
                  <User className={cn(
                    "h-5 w-5",
                    tipo === 'individual' ? "text-blue-600" : "text-gray-500"
                  )} />
                </div>
                <div className="text-left">
                  <p className={cn(
                    "font-medium text-sm",
                    tipo === 'individual' ? "text-blue-700" : "text-gray-700"
                  )}>Individual</p>
                  <p className="text-xs text-muted-foreground">Una persona</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTipo('cuadrilla')}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                  tipo === 'cuadrilla'
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  tipo === 'cuadrilla' ? "bg-purple-100" : "bg-gray-100"
                )}>
                  <UsersRound className={cn(
                    "h-5 w-5",
                    tipo === 'cuadrilla' ? "text-purple-600" : "text-gray-500"
                  )} />
                </div>
                <div className="text-left">
                  <p className={cn(
                    "font-medium text-sm",
                    tipo === 'cuadrilla' ? "text-purple-700" : "text-gray-700"
                  )}>Cuadrilla</p>
                  <p className="text-xs text-muted-foreground">Equipo de trabajo</p>
                </div>
              </button>
            </div>
          </div>

          {/* Nombre y Costo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                placeholder={tipo === 'cuadrilla' ? "Ej: Cuadrilla A" : "Ej: Ingeniero Senior"}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costoHora">Costo/Hora (USD) *</Label>
              <Input
                id="costoHora"
                type="number"
                step="0.01"
                min="0"
                placeholder="85.50"
                value={costoHora || ''}
                onChange={(e) => setCostoHora(parseFloat(e.target.value) || 0)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              placeholder="Descripción opcional del recurso..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={loading}
              rows={2}
            />
          </div>

          {/* Composición de Cuadrilla */}
          {tipo === 'cuadrilla' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Composición del Equipo</Label>
                <Badge variant="outline" className="text-xs">
                  {composiciones.length} miembro{composiciones.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Lista de miembros */}
              {composiciones.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {composiciones.map((comp) => (
                    <div
                      key={comp.empleadoId}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-medium text-purple-700">
                        {comp.empleado?.user?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {comp.empleado?.user?.name || 'Sin nombre'}
                        </p>
                      </div>
                      <Input
                        type="text"
                        placeholder="Rol"
                        value={comp.rol}
                        onChange={(e) => handleUpdateMember(comp.empleadoId, 'rol', e.target.value)}
                        className="w-24 h-7 text-xs"
                      />
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={comp.porcentaje}
                        onChange={(e) => handleUpdateMember(comp.empleadoId, 'porcentaje', parseInt(e.target.value) || 100)}
                        className="w-16 h-7 text-xs text-center"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(comp.empleadoId)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Agregar miembro */}
              {loadingEmpleados ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cargando empleados...
                </div>
              ) : empleadosDisponibles.length > 0 ? (
                <Select onValueChange={handleAddMember}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Agregar miembro</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {empleadosDisponibles.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center gap-2">
                          <span>{emp.user?.name || emp.user?.email}</span>
                          {emp.cargo && (
                            <span className="text-xs text-muted-foreground">({emp.cargo})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {empleados.length === 0
                    ? 'No hay empleados registrados. Registra empleados en Admin → Personal'
                    : 'Todos los empleados ya fueron agregados'}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creando...' : 'Crear Recurso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
