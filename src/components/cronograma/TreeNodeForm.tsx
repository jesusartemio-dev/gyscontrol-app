// ===================================================
// 📁 Archivo: TreeNodeForm.tsx
// 📌 Ubicación: src/components/cronograma/
// 🔧 Descripción: Formulario para crear/editar nodos con posicionamiento flexible
// ✅ Sistema "inicio_padre" vs "despues_ultima", validaciones
// ===================================================

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, CheckCircle, XCircle, Users } from 'lucide-react'
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { TreeNode, NodeType, PositioningMode, PositioningConfig } from './types'
import { obtenerCalendarioLaboral } from '@/lib/utils/calendarioLaboral'

interface TreeNodeFormProps {
  mode: 'create' | 'edit'
  nodeType?: NodeType
  nodeId?: string
  parentId?: string
  isOpen: boolean
  onSubmit: (data: any) => void
  onCancel: () => void
  nodes?: Map<string, TreeNode>
}

const NODE_TYPE_LABELS: Record<string, string> = {
  proyecto: 'Proyecto',
  fase: 'Fase',
  edt: 'EDT',
  actividad: 'Actividad',
  tarea: 'Tarea'
}

const PRIORITY_OPTIONS = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' }
]

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'planificado', label: 'Planificado' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'completada', label: 'Completada' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'cancelada', label: 'Cancelada' }
]

export function TreeNodeForm({
  mode,
  nodeType,
  nodeId,
  parentId,
  isOpen,
  onSubmit,
  onCancel,
  nodes = new Map()
}: TreeNodeFormProps) {
  // Función para obtener el estado por defecto según el tipo de nodo
  const getDefaultStatus = (nodeType?: NodeType): 'pendiente' | 'en_progreso' | 'completada' | 'pausada' | 'cancelada' | 'planificado' => {
    // Para fases y EDTs, usar "planificado"
    if (nodeType === 'fase' || nodeType === 'edt') {
      return 'planificado'
    }
    // Para actividades y tareas, usar "pendiente"
    return 'pendiente'
  }

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    fechaInicioComercial: '',
    fechaFinComercial: '',
    horasEstimadas: '',
    personasEstimadas: '1',
    orden: '',
    prioridad: 'media' as const,
    estado: getDefaultStatus(nodeType),
    posicionamiento: 'despues_ultima' as PositioningMode
  })

  // Función para calcular fechas según posicionamiento
  const calculateDatesFromPositioning = async (posicionamiento: PositioningMode, parentId?: string) => {
    console.log('🔍 [FRONT FORM] calculateDatesFromPositioning called:', { posicionamiento, parentId, nodeType })

    if (!parentId || !nodeType) {
      console.log('⚠️ [FRONT FORM] Missing parentId or nodeType, returning empty')
      return
    }

    try {
      // Obtener información del padre (EDT o Actividad según el tipo de nodo)
      const parentNode = nodes.get(parentId)
      console.log('🔍 [FRONT FORM] Parent node:', parentNode)

      if (!parentNode) {
        console.log('❌ [FRONT FORM] Parent node not found')
        return
      }

      let fechaInicio = ''
      let fechaFin = ''

      if (posicionamiento === 'inicio_padre') {
        // Al inicio del padre - usar fechas del padre (EDT o Actividad)
        if (nodeType === 'actividad') {
          // Para actividades: usar fechas del EDT padre
          fechaInicio = parentNode.data.fechaInicioComercial || parentNode.data.fechaInicioPlan || ''
          fechaFin = parentNode.data.fechaFinComercial || parentNode.data.fechaFinPlan || ''
          console.log('✅ [FRONT FORM] Inicio padre (actividad) - fechas del EDT:', {
            fechaInicioComercial: parentNode.data.fechaInicioComercial,
            fechaInicioPlan: parentNode.data.fechaInicioPlan,
            fechaFinComercial: parentNode.data.fechaFinComercial,
            fechaFinPlan: parentNode.data.fechaFinPlan,
            resultado: { fechaInicio, fechaFin }
          })
        } else if (nodeType === 'tarea') {
          // Para tareas: usar fechas de la actividad padre
          fechaInicio = parentNode.data.fechaInicioComercial || parentNode.data.fechaInicioPlan || ''
          fechaFin = parentNode.data.fechaFinComercial || parentNode.data.fechaFinPlan || ''
          console.log('✅ [FRONT FORM] Inicio padre (tarea) - fechas de la actividad:', {
            fechaInicioComercial: parentNode.data.fechaInicioComercial,
            fechaInicioPlan: parentNode.data.fechaInicioPlan,
            fechaFinComercial: parentNode.data.fechaFinComercial,
            fechaFinPlan: parentNode.data.fechaFinPlan,
            resultado: { fechaInicio, fechaFin }
          })
        }
      } else if (posicionamiento === 'despues_ultima') {
        if (nodeType === 'actividad') {
          // Después del último hermano - buscar la última actividad del EDT
          console.log('🔍 [FRONT FORM] Buscando actividades existentes...')
          try {
            // Extraer el ID del proyecto de la URL
            const proyectoId = window.location.pathname.split('/')[2]
            console.log('🔍 [FRONT FORM] Proyecto ID from URL:', proyectoId)
            const apiUrl = `/api/proyectos/${proyectoId}/cronograma/actividades?edtId=${parentId.replace('edt-', '')}`
            console.log('🔍 [FRONT FORM] API call:', apiUrl)

            const response = await fetch(apiUrl)
            console.log('🔍 [FRONT FORM] API response status:', response.status)

            if (response.ok) {
              const data = await response.json()
              console.log('🔍 [FRONT FORM] API response data:', data)
              const actividades = data.data || []

              if (actividades.length > 0) {
                console.log('✅ [FRONT FORM] Encontradas actividades:', actividades.length)
                // Encontrar la actividad con fechaFin más reciente
                const ultimaActividad = actividades.reduce((latest: any, current: any) => {
                  const latestDate = new Date(latest.fechaFinPlan || latest.fechaFin)
                  const currentDate = new Date(current.fechaFinPlan || current.fechaFin)
                  return currentDate > latestDate ? current : latest
                })

                console.log('✅ [FRONT FORM] Última actividad:', ultimaActividad)

                const fechaFinUltima = new Date(ultimaActividad.fechaFinPlan || ultimaActividad.fechaFin)
                fechaFinUltima.setDate(fechaFinUltima.getDate() + 1) // Día siguiente

                fechaInicio = fechaFinUltima.toISOString().split('T')[0]

                // Fecha fin por defecto: 7 días después
                const fechaFinCalculada = new Date(fechaFinUltima)
                fechaFinCalculada.setDate(fechaFinCalculada.getDate() + 7)
                fechaFin = fechaFinCalculada.toISOString().split('T')[0]

                console.log('✅ [FRONT FORM] Fechas calculadas después última:', { fechaInicio, fechaFin })
              } else {
                console.log('⚠️ [FRONT FORM] No hay actividades previas, usando fechas del EDT')
                // No hay actividades previas, usar fechas del EDT
                fechaInicio = parentNode.data.fechaInicioComercial || parentNode.data.fechaInicioPlan || ''
                fechaFin = parentNode.data.fechaFinComercial || parentNode.data.fechaFinPlan || ''
              }
            } else {
              console.log('❌ [FRONT FORM] API call failed:', response.status)
            }
          } catch (error) {
            console.error('❌ [FRONT FORM] Error obteniendo actividades existentes:', error)
            // Fallback: usar fechas del EDT
            fechaInicio = parentNode.data.fechaInicioComercial || parentNode.data.fechaInicioPlan || ''
            fechaFin = parentNode.data.fechaFinComercial || parentNode.data.fechaFinPlan || ''
          }
        } else if (nodeType === 'tarea') {
          // Después del último hermano - buscar la última tarea de la actividad
          console.log('🔍 [FRONT FORM] Buscando tareas existentes...')
          try {
            // Extraer el ID del proyecto de la URL
            const proyectoId = window.location.pathname.split('/')[2]
            console.log('🔍 [FRONT FORM] Proyecto ID from URL:', proyectoId)
            const apiUrl = `/api/proyectos/${proyectoId}/cronograma/tareas?proyectoActividadId=${parentId.replace('actividad-', '')}`
            console.log('🔍 [FRONT FORM] API call:', apiUrl)

            const response = await fetch(apiUrl)
            console.log('🔍 [FRONT FORM] API response status:', response.status)

            if (response.ok) {
              const data = await response.json()
              console.log('🔍 [FRONT FORM] API response data:', data)
              const tareas = data.data || []

              if (tareas.length > 0) {
                console.log('✅ [FRONT FORM] Encontradas tareas:', tareas.length)
                // Encontrar la tarea con fechaFin más reciente
                const ultimaTarea = tareas.reduce((latest: any, current: any) => {
                  const latestDate = new Date(latest.fechaFin)
                  const currentDate = new Date(current.fechaFin)
                  return currentDate > latestDate ? current : latest
                })

                console.log('✅ [FRONT FORM] Última tarea:', ultimaTarea)

                const fechaFinUltima = new Date(ultimaTarea.fechaFin)
                fechaFinUltima.setDate(fechaFinUltima.getDate() + 1) // Día siguiente

                fechaInicio = fechaFinUltima.toISOString().split('T')[0]

                // Fecha fin por defecto: 3 días después (tareas son más cortas)
                const fechaFinCalculada = new Date(fechaFinUltima)
                fechaFinCalculada.setDate(fechaFinCalculada.getDate() + 3)
                fechaFin = fechaFinCalculada.toISOString().split('T')[0]

                console.log('✅ [FRONT FORM] Fechas calculadas después última tarea:', { fechaInicio, fechaFin })
              } else {
                console.log('⚠️ [FRONT FORM] No hay tareas previas, usando fechas de la actividad')
                // No hay tareas previas, usar fechas de la actividad
                fechaInicio = parentNode.data.fechaInicioComercial || parentNode.data.fechaInicioPlan || ''
                fechaFin = parentNode.data.fechaFinComercial || parentNode.data.fechaFinPlan || ''
              }
            } else {
              console.log('❌ [FRONT FORM] API call failed:', response.status)
            }
          } catch (error) {
            console.error('❌ [FRONT FORM] Error obteniendo tareas existentes:', error)
            // Fallback: usar fechas de la actividad
            fechaInicio = parentNode.data.fechaInicioComercial || parentNode.data.fechaInicioPlan || ''
            fechaFin = parentNode.data.fechaFinComercial || parentNode.data.fechaFinPlan || ''
          }
        }
      }

      console.log('✅ [FRONT FORM] Fechas finales calculadas:', { fechaInicio, fechaFin })
      return { fechaInicio, fechaFin }
    } catch (error) {
      console.error('❌ [FRONT FORM] Error calculando fechas:', error)
      return { fechaInicio: '', fechaFin: '' }
    }
  }

  // Función para calcular fecha fin según horas estimadas (8 horas por día para actividades, 4 horas para tareas)
  const calculateEndDateFromHours = (fechaInicio: string, horasEstimadas: number) => {
    console.log('🔢 [FRONT FORM] calculateEndDateFromHours:', { fechaInicio, horasEstimadas, nodeType })

    if (!fechaInicio || !horasEstimadas) {
      console.log('⚠️ [FRONT FORM] Faltan parámetros para calcular fecha fin')
      return ''
    }

    const fechaInicioDate = new Date(fechaInicio)
    // Usar 8 horas por día para actividades, 4 horas para tareas (son más cortas)
    const horasPorDia = nodeType === 'tarea' ? 4 : 8
    const diasNecesarios = Math.ceil(horasEstimadas / horasPorDia)
    console.log('🔢 [FRONT FORM] Días necesarios:', diasNecesarios, `(usando ${horasPorDia}h/día para ${nodeType})`)

    const fechaFinDate = new Date(fechaInicioDate)
    fechaFinDate.setDate(fechaFinDate.getDate() + diasNecesarios - 1) // -1 porque el día de inicio cuenta

    const result = fechaFinDate.toISOString().split('T')[0]
    console.log('✅ [FRONT FORM] Fecha fin calculada:', result)

    return result
  }

  // Efecto para actualizar fechas cuando cambia el posicionamiento
  useEffect(() => {
    console.log('🔄 [FRONT FORM] Posicionamiento cambió:', formData.posicionamiento, 'mode:', mode, 'parentId:', parentId)
    if (mode === 'create' && parentId) {
      console.log('🔄 [FRONT FORM] Calculando fechas para posicionamiento...')
      calculateDatesFromPositioning(formData.posicionamiento, parentId).then(dates => {
        console.log('🔄 [FRONT FORM] Fechas calculadas:', dates)
        if (dates && (dates.fechaInicio || dates.fechaFin)) {
          setFormData(prev => {
            console.log('🔄 [FRONT FORM] Actualizando formData con fechas:', dates)
            return {
              ...prev,
              fechaInicioComercial: dates.fechaInicio || prev.fechaInicioComercial,
              fechaFinComercial: dates.fechaFin || prev.fechaFinComercial
            }
          })
        } else {
          console.log('⚠️ [FRONT FORM] No se obtuvieron fechas, usando fechas por defecto')
          // Si no hay fechas del EDT, usar fechas por defecto
          const today = new Date().toISOString().split('T')[0]
          const nextWeek = new Date()
          nextWeek.setDate(nextWeek.getDate() + 7)
          const nextWeekStr = nextWeek.toISOString().split('T')[0]

          setFormData(prev => ({
            ...prev,
            fechaInicioComercial: today,
            fechaFinComercial: nextWeekStr
          }))
        }
      })
    }
  }, [formData.posicionamiento, parentId, mode])

  // Efecto para actualizar fecha fin cuando cambian horas estimadas o fecha inicio
  useEffect(() => {
    console.log('🔄 [FRONT FORM] Horas o fecha inicio cambiaron:', {
      fechaInicio: formData.fechaInicioComercial,
      horasEstimadas: formData.horasEstimadas
    })
    if (formData.fechaInicioComercial && formData.horasEstimadas) {
      const horas = parseFloat(formData.horasEstimadas)
      if (!isNaN(horas) && horas > 0) {
        const nuevaFechaFin = calculateEndDateFromHours(formData.fechaInicioComercial, horas)
        console.log('🔄 [FRONT FORM] Nueva fecha fin calculada:', nuevaFechaFin)
        if (nuevaFechaFin && nuevaFechaFin !== formData.fechaFinComercial) {
          setFormData(prev => {
            console.log('🔄 [FRONT FORM] Actualizando fecha fin en formData:', nuevaFechaFin)
            return {
              ...prev,
              fechaFinComercial: nuevaFechaFin
            }
          })
        }
      }
    }
  }, [formData.fechaInicioComercial, formData.horasEstimadas])

  // ✅ Estado de calendario laboral
  const [calendarioLaboral, setCalendarioLaboral] = useState<any>(null)

  // Cargar datos del nodo si estamos editando
  useEffect(() => {
    if (mode === 'edit' && nodeId) {
      const node = nodes.get(nodeId)
      if (node) {
        // Para tareas, usar fechaInicio/fechaFin directamente; para otros nodos, fechaInicioComercial/fechaFinComercial
        let fechaInicio = node.type === 'tarea'
          ? node.data.fechaInicio || node.data.fechaInicioComercial || ''
          : node.type === 'fase'
          ? node.data.fechaInicioPlan || node.data.fechaInicioComercial || ''
          : node.data.fechaInicioComercial || ''
        let fechaFin = node.type === 'tarea'
          ? node.data.fechaFin || node.data.fechaFinComercial || ''
          : node.type === 'fase'
          ? node.data.fechaFinPlan || node.data.fechaFinComercial || ''
          : node.data.fechaFinComercial || ''

        // Convertir ISO string a YYYY-MM-DD en zona local del navegador
        const toLocalDateString = (dateStr: string): string => {
          if (!dateStr) return ''
          const date = new Date(dateStr)
          if (isNaN(date.getTime())) return ''
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }
        if (fechaInicio) {
          fechaInicio = toLocalDateString(fechaInicio)
        }
        if (fechaFin) {
          fechaFin = toLocalDateString(fechaFin)
        }

        setFormData({
          nombre: node.nombre,
          descripcion: node.data.descripcion || '',
          fechaInicioComercial: fechaInicio,
          fechaFinComercial: fechaFin,
          horasEstimadas: node.data.horasEstimadas?.toString() || '',
          personasEstimadas: node.data.personasEstimadas?.toString() || '1',
          orden: node.data.orden?.toString() || '',
          prioridad: node.data.prioridad || 'media',
          estado: node.metadata.status === 'pending' ? 'pendiente' :
                  node.metadata.status === 'in_progress' ? 'en_progreso' :
                  node.metadata.status === 'completed' ? 'completada' :
                  node.metadata.status === 'paused' ? 'pausada' :
                  node.metadata.status === 'cancelled' ? 'cancelada' :
                  node.data.estado || getDefaultStatus(node.type),
          posicionamiento: node.data.posicionamiento || 'despues_ultima'
        })
      }
    }
  }, [mode, nodeId, nodes, nodeType])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Para fases, mapear fechas a fechaInicioPlan/fechaFinPlan; para otros nodos mantener fechaInicioComercial/fechaFinComercial
    let submitData: any = {
      ...formData,
      horasEstimadas: formData.horasEstimadas ? parseFloat(formData.horasEstimadas) : undefined,
      personasEstimadas: formData.personasEstimadas ? parseInt(formData.personasEstimadas) : undefined,
      orden: formData.orden ? parseInt(formData.orden) : undefined,
      // Incluir configuración de posicionamiento para creación
      ...(mode === 'create' && {
        posicionamiento: formData.posicionamiento
      })
    }

    console.log('🔍 [FORM SUBMIT] submitData:', submitData)

    // Si es una fase, mapear las fechas comerciales a fechas plan
    if (nodeType === 'fase' || (mode === 'edit' && nodeId && nodes.get(nodeId)?.type === 'fase')) {
      submitData.fechaInicioPlan = formData.fechaInicioComercial
      submitData.fechaFinPlan = formData.fechaFinComercial
      // Mantener también los campos comerciales por compatibilidad
      submitData.fechaInicioComercial = formData.fechaInicioComercial
      submitData.fechaFinComercial = formData.fechaFinComercial
    }

    onSubmit(submitData)
  }

  const handleCancel = () => {
    onCancel()
  }

  const getDialogTitle = () => {
    if (mode === 'create' && nodeType) {
      return `Crear ${NODE_TYPE_LABELS[nodeType]}`
    }
    if (mode === 'edit') {
      return 'Editar Nodo'
    }
    return 'Formulario'
  }

  const getParentInfo = () => {
    if (!parentId) return null
    const parentNode = nodes.get(parentId)
    return parentNode ? `${NODE_TYPE_LABELS[parentNode.type]}: ${parentNode.nombre}` : null
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          {getParentInfo() && (
            <p className="text-sm text-gray-600">
              Ubicación: {getParentInfo()}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder={`Nombre del ${nodeType || 'elemento'}`}
              required
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Descripción opcional"
              rows={3}
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha Inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={formData.fechaInicioComercial}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaInicioComercial: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaFin">Fecha Fin</Label>
              <Input
                id="fechaFin"
                type="date"
                value={formData.fechaFinComercial}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaFinComercial: e.target.value }))}
              />
            </div>
          </div>

          {/* Horas estimadas, personas y orden */}
          <div className={`grid gap-4 ${(nodeType === 'tarea' || (mode === 'edit' && nodeId && nodes.get(nodeId)?.type === 'tarea')) ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="space-y-2">
              <Label htmlFor="horasEstimadas">Horas Estimadas</Label>
              <Input
                id="horasEstimadas"
                type="number"
                min="0"
                step="0.5"
                value={formData.horasEstimadas}
                onChange={(e) => setFormData(prev => ({ ...prev, horasEstimadas: e.target.value }))}
                placeholder="0"
              />
            </div>
            {(nodeType === 'tarea' || (mode === 'edit' && nodeId && nodes.get(nodeId)?.type === 'tarea')) && (
              <div className="space-y-2">
                <Label htmlFor="personasEstimadas">
                  <Users className="h-3.5 w-3.5 inline mr-1" />
                  Personas
                </Label>
                <Input
                  id="personasEstimadas"
                  type="number"
                  min="1"
                  max="99"
                  value={formData.personasEstimadas}
                  onChange={(e) => setFormData(prev => ({ ...prev, personasEstimadas: e.target.value }))}
                  placeholder="1"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="orden">Orden</Label>
              <Input
                id="orden"
                type="number"
                min="0"
                value={formData.orden}
                onChange={(e) => setFormData(prev => ({ ...prev, orden: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          {/* Prioridad */}
          <div className="space-y-2">
            <Label htmlFor="prioridad">Prioridad</Label>
            <Select
              value={formData.prioridad}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, prioridad: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estado - Solo mostrar para EDTs, actividades y tareas, no para fases */}
          {(nodeType !== 'fase' && !(mode === 'edit' && nodeId && nodes.get(nodeId)?.type === 'fase')) && (
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, estado: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sistema de posicionamiento flexible (solo para creación) */}
          {mode === 'create' && (
            <div className="space-y-3">
              <Label htmlFor="posicionamiento">Posicionamiento</Label>
              <Select
                value={formData.posicionamiento}
                onValueChange={(value: PositioningMode) =>
                  setFormData(prev => ({ ...prev, posicionamiento: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inicio_padre">Al inicio del padre</SelectItem>
                  <SelectItem value="despues_ultima">Después del último hermano</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {formData.posicionamiento === 'inicio_padre'
                  ? 'El elemento se colocará al inicio de su contenedor padre'
                  : 'El elemento se colocará después del último elemento del mismo nivel'
                }
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Crear' : 'Actualizar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}