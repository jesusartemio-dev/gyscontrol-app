// ===================================================
// 📁 Archivo: RecursoModal.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Modal para crear y editar recursos (individual o cuadrilla)
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { Calculator, Save, X, Plus, Trash2, User, UsersRound, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Recurso, Empleado } from '@/types'
import { createRecurso, updateRecurso } from '@/lib/services/recurso'
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
import {
  getCostoHoraUSD,
  calcularCostoRealCuadrilla,
  calcularCostoRealIndividual,
  formatUSD,
  getConfiguracionCostos,
  ConfiguracionCostos,
  DEFAULTS
} from '@/lib/costos'

interface ComposicionItem {
  empleadoId: string
  empleado?: Empleado
  porcentaje: number
  rol: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  recurso?: Recurso | null // Recurso a editar (null = crear nuevo)
  onCreated?: (nuevo: Recurso) => void
  onUpdated?: (actualizado: Recurso) => void
}

export default function RecursoModal({ isOpen, onClose, recurso, onCreated, onUpdated }: Props) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<'individual' | 'cuadrilla'>('individual')
  const [costoHora, setCostoHora] = useState<number>(0)
  const [descripcion, setDescripcion] = useState('')
  const [composiciones, setComposiciones] = useState<ComposicionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loadingEmpleados, setLoadingEmpleados] = useState(false)
  const [config, setConfig] = useState<ConfiguracionCostos>({
    tipoCambio: DEFAULTS.TIPO_CAMBIO,
    horasSemanales: DEFAULTS.HORAS_SEMANALES,
    diasLaborables: DEFAULTS.DIAS_LABORABLES,
    semanasxMes: DEFAULTS.SEMANAS_X_MES,
    horasMensuales: DEFAULTS.HORAS_MENSUALES,
  })

  const isEditing = !!recurso

  // Cargar empleados, configuración y datos del recurso al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadEmpleados()
      getConfiguracionCostos().then(setConfig)

      if (recurso) {
        // Modo edición: cargar datos del recurso
        setNombre(recurso.nombre)
        setTipo(recurso.tipo || 'individual')
        setCostoHora(recurso.costoHora)
        setDescripcion(recurso.descripcion || '')

        // Cargar composiciones si existen
        if (recurso.composiciones && recurso.composiciones.length > 0) {
          setComposiciones(
            recurso.composiciones.map(comp => ({
              empleadoId: comp.empleadoId,
              empleado: comp.empleado,
              porcentaje: comp.porcentaje || 100,
              rol: comp.rol || ''
            }))
          )
        } else {
          setComposiciones([])
        }
      } else {
        // Modo creación: resetear formulario
        resetForm()
      }
    }
  }, [isOpen, recurso])

  const resetForm = () => {
    setNombre('')
    setTipo('individual')
    setCostoHora(0)
    setDescripcion('')
    setComposiciones([])
  }

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

    if (tipo === 'cuadrilla' && composiciones.length < 2) {
      toast.error('Una cuadrilla debe tener al menos 2 miembros')
      return
    }

    setLoading(true)
    try {
      const payload = {
        nombre: nombre.trim(),
        tipo,
        costoHora,
        descripcion: descripcion.trim() || undefined,
        // Enviar composiciones para ambos tipos
        composiciones: composiciones.map(c => ({
          empleadoId: c.empleadoId,
          porcentaje: tipo === 'cuadrilla' ? c.porcentaje : 100,
          rol: tipo === 'cuadrilla' ? (c.rol || undefined) : undefined,
        }))
      }

      if (isEditing && recurso) {
        const actualizado = await updateRecurso(recurso.id, payload)
        toast.success('Recurso actualizado exitosamente')
        onUpdated?.(actualizado)
      } else {
        const nuevo = await createRecurso(payload)
        toast.success('Recurso creado exitosamente')
        onCreated?.(nuevo)
      }

      handleClose()
    } catch (err) {
      console.error('Error saving recurso:', err)
      toast.error(isEditing ? 'Error al actualizar recurso' : 'Error al crear recurso')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            {isEditing ? 'Editar Recurso' : 'Nuevo Recurso'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del recurso'
              : 'Agrega un nuevo recurso al catálogo del sistema'
            }
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
                  if (!isEditing) setComposiciones([])
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

          {/* Personal Asignado / Composición de Cuadrilla */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                {tipo === 'cuadrilla' ? 'Composición del Equipo' : 'Personal Asignado'}
              </Label>
              <Badge variant="outline" className="text-xs">
                {composiciones.length} {tipo === 'cuadrilla' ? 'miembro' : 'persona'}{composiciones.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Comparación de costos */}
            {composiciones.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                {(() => {
                  // Para CUADRILLAS: suma de costos (ponderada por %)
                  // Para INDIVIDUALES: promedio de costos
                  const costoReal = tipo === 'cuadrilla'
                    ? calcularCostoRealCuadrilla(composiciones, config)
                    : calcularCostoRealIndividual(composiciones, config)

                  const diferencia = costoHora - costoReal
                  const porcentajeDif = costoReal > 0
                    ? ((diferencia / costoReal) * 100).toFixed(1)
                    : 0

                  return (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Costo Recurso</p>
                        <p className="text-sm font-bold text-blue-600">{formatUSD(costoHora)}/h</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {tipo === 'cuadrilla' ? 'Costo Real Total' : 'Costo Real Prom.'}
                        </p>
                        <p className="text-sm font-bold text-gray-700">{formatUSD(costoReal)}/h</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Diferencia</p>
                        <div className={cn(
                          "flex items-center justify-center gap-1 text-sm font-bold",
                          diferencia > 0 ? "text-green-600" : diferencia < 0 ? "text-red-600" : "text-gray-600"
                        )}>
                          {diferencia > 0 ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : diferencia < 0 ? (
                            <TrendingDown className="h-3.5" />
                          ) : (
                            <Minus className="h-3.5 w-3.5" />
                          )}
                          <span>{diferencia >= 0 ? '+' : ''}{formatUSD(diferencia)}</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground">({porcentajeDif}%)</p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Lista de miembros/empleados */}
            {composiciones.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {composiciones.map((comp) => {
                  const costoEmpleado = getCostoHoraUSD(comp.empleado, config)
                  return (
                    <div
                      key={comp.empleadoId}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg",
                        tipo === 'cuadrilla' ? "bg-purple-50" : "bg-blue-50"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                        tipo === 'cuadrilla' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {comp.empleado?.user?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {comp.empleado?.user?.name || 'Sin nombre'}
                        </p>
                        {tipo === 'individual' && (
                          <p className="text-[10px] text-muted-foreground">
                            {comp.empleado?.cargo?.nombre || 'Sin cargo'} · {formatUSD(costoEmpleado)}/h
                          </p>
                        )}
                      </div>
                      {tipo === 'cuadrilla' && (
                        <>
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
                        </>
                      )}
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
                  )
                })}
              </div>
            )}

            {/* Mensaje cuando no hay personal asignado (solo para individuales) */}
            {tipo === 'individual' && composiciones.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <p className="text-xs text-amber-700">
                  Sin personal asignado. Asigna empleados para comparar costos reales.
                </p>
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
                    <span>{tipo === 'cuadrilla' ? 'Agregar miembro' : 'Asignar empleado'}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {empleadosDisponibles.map((emp) => {
                    const costoEmp = getCostoHoraUSD(emp, config)
                    return (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center gap-2">
                          <span>{emp.user?.name || emp.user?.email}</span>
                          {emp.cargo?.nombre && (
                            <span className="text-xs text-muted-foreground">({emp.cargo.nombre})</span>
                          )}
                          {tipo === 'individual' && costoEmp > 0 && (
                            <span className="text-xs text-green-600 font-medium">{formatUSD(costoEmp)}/h</span>
                          )}
                        </div>
                      </SelectItem>
                    )
                  })}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading
                ? (isEditing ? 'Actualizando...' : 'Creando...')
                : (isEditing ? 'Actualizar Recurso' : 'Crear Recurso')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
