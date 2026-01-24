// ===================================================
// 📁 Archivo: ProyectoCronogramaSelector.tsx
// 📌 Ubicación: src/components/proyectos/cronograma/ProyectoCronogramaSelector.tsx
// 🔧 Descripción: Selector compacto de cronogramas de proyecto
// 🎯 Funcionalidades: Selector horizontal con indicadores de estado
// ===================================================

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Plus,
  Calendar,
  Target,
  PlayCircle,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  Lock,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import type { ProyectoCronograma } from '@/types/modelos'

interface ProyectoCronogramaSelectorProps {
  proyectoId: string
  selectedCronograma?: ProyectoCronograma
  onCronogramaChange?: (cronograma: ProyectoCronograma) => void
  onCronogramaCreate?: () => void
}

const TIPO_CRONOGRAMA_INFO = {
  comercial: {
    label: 'Comercial',
    shortLabel: 'Comercial',
    description: 'Estimación inicial',
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    badgeColor: 'bg-blue-100 text-blue-700',
    readOnly: true,
    isMain: false
  },
  planificacion: {
    label: 'Planificación',
    shortLabel: 'Planificación',
    description: 'Línea base',
    icon: Target,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    badgeColor: 'bg-purple-100 text-purple-700',
    readOnly: false,
    isMain: false
  },
  ejecucion: {
    label: 'Ejecución',
    shortLabel: 'Ejecución',
    description: 'Trabajo real',
    icon: PlayCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    badgeColor: 'bg-green-100 text-green-700',
    readOnly: false,
    isMain: true
  }
}

export function ProyectoCronogramaSelector({
  proyectoId,
  selectedCronograma,
  onCronogramaChange,
  onCronogramaCreate
}: ProyectoCronogramaSelectorProps) {
  const [cronogramas, setCronogramas] = useState<ProyectoCronograma[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState({
    tipo: 'planificacion' as keyof typeof TIPO_CRONOGRAMA_INFO,
    nombre: '',
    copiarDesdeId: 'none'
  })

  useEffect(() => {
    loadCronogramas()
  }, [proyectoId])

  // Set baseline cronograma as selected when cronogramas are loaded
  useEffect(() => {
    if (cronogramas.length > 0 && !selectedCronograma) {
      const baselineCronograma = cronogramas.find(c => c.esBaseline) || cronogramas[0]
      if (baselineCronograma) {
        onCronogramaChange?.(baselineCronograma)
      }
    }
  }, [cronogramas, selectedCronograma, onCronogramaChange])

  // Reset form when dialog opens
  useEffect(() => {
    if (showCreateDialog) {
      const availableTypes = getAvailableTypesForCreation()
      if (availableTypes.length > 0) {
        const firstType = availableTypes[0]
        setCreateForm({
          tipo: firstType,
          nombre: `Cronograma de ${TIPO_CRONOGRAMA_INFO[firstType].label}`,
          copiarDesdeId: firstType === 'ejecucion' ? (getCronogramaBaseline()?.id || 'none') : 'none'
        })
      }
    }
  }, [showCreateDialog, cronogramas])

  const loadCronogramas = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma`)
      if (!response.ok) {
        setCronogramas([])
        return
      }
      const data = await response.json()
      if (data.success) {
        setCronogramas(data.data)
      } else {
        setCronogramas([])
      }
    } catch {
      setCronogramas([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCronograma = async () => {
    if (!createForm.nombre.trim()) {
      toast.error('El nombre del cronograma es requerido')
      return
    }

    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: createForm.tipo,
          nombre: createForm.nombre,
          ...(createForm.copiarDesdeId && createForm.copiarDesdeId !== 'none' && {
            copiarDesdeId: createForm.copiarDesdeId
          })
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Error al crear cronograma'
        throw new Error(errorMessage)
      }

      const data = await response.json()
      toast.success(data.message || 'Cronograma creado exitosamente')
      setShowCreateDialog(false)
      setCreateForm({ tipo: 'planificacion', nombre: '', copiarDesdeId: 'none' })
      loadCronogramas()
      onCronogramaCreate?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear el cronograma')
    }
  }

  const getCronogramasPorTipo = (tipo: keyof typeof TIPO_CRONOGRAMA_INFO) => {
    return cronogramas.filter(c => c.tipo === tipo)
  }

  const getCronogramaBaseline = () => {
    return cronogramas.find(c => c.esBaseline && c.tipo === 'planificacion')
  }

  const canCreateEjecucion = () => {
    return getCronogramaBaseline() !== undefined
  }

  const getAvailableTypesForCreation = (): (keyof typeof TIPO_CRONOGRAMA_INFO)[] => {
    const available: (keyof typeof TIPO_CRONOGRAMA_INFO)[] = []
    if (!cronogramas.some(c => c.tipo === 'planificacion')) {
      available.push('planificacion')
    }
    if (!cronogramas.some(c => c.tipo === 'ejecucion') && canCreateEjecucion()) {
      available.push('ejecucion')
    }
    return available
  }

  const canCreateAnyCronograma = (): boolean => {
    return getAvailableTypesForCreation().length > 0
  }

  const getStatusForTipo = (tipo: keyof typeof TIPO_CRONOGRAMA_INFO) => {
    const cronogramasTipo = getCronogramasPorTipo(tipo)
    if (cronogramasTipo.length > 0) {
      return { status: 'exists', cronograma: cronogramasTipo[0] }
    }
    if (tipo === 'ejecucion' && !canCreateEjecucion()) {
      return { status: 'blocked', cronograma: null }
    }
    return { status: 'missing', cronograma: null }
  }

  const handleCronogramaSelect = (cronograma: ProyectoCronograma) => {
    onCronogramaChange?.(cronograma)
  }

  // Check if ejecucion is missing (for alert)
  const ejecucionStatus = getStatusForTipo('ejecucion')
  const showEjecucionAlert = ejecucionStatus.status === 'missing' && canCreateEjecucion()

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-8 w-24 bg-gray-200 rounded" />
        <div className="h-8 w-24 bg-gray-200 rounded" />
        <div className="h-8 w-24 bg-gray-200 rounded" />
      </div>
    )
  }

  const tipoOrder: (keyof typeof TIPO_CRONOGRAMA_INFO)[] = ['comercial', 'planificacion', 'ejecucion']
  const cronogramaActivo = selectedCronograma || cronogramas.find(c => c.esBaseline) || cronogramas[0]

  return (
    <div className="space-y-2">
      {/* Compact Alert for missing Ejecución */}
      {showEjecucionAlert && (
        <Alert className="border-amber-200 bg-amber-50 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                Falta cronograma de <strong>Ejecución</strong> para registrar avances
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => {
                setCreateForm({
                  tipo: 'ejecucion',
                  nombre: 'Cronograma de Ejecución',
                  copiarDesdeId: getCronogramaBaseline()?.id || 'none'
                })
                setShowCreateDialog(true)
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Crear
            </Button>
          </div>
        </Alert>
      )}

      {/* Compact Horizontal Selector */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
        {/* Flow Steps */}
        <div className="flex items-center gap-1 flex-1">
          {tipoOrder.map((tipo, index) => {
            const info = TIPO_CRONOGRAMA_INFO[tipo]
            const { status, cronograma } = getStatusForTipo(tipo)
            const Icon = info.icon
            const isSelected = cronogramaActivo?.tipo === tipo

            return (
              <React.Fragment key={tipo}>
                {/* Step Button */}
                <button
                  onClick={() => cronograma && handleCronogramaSelect(cronograma)}
                  disabled={!cronograma}
                  className={`
                    relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm
                    ${isSelected
                      ? `${info.bgColor} ${info.borderColor} border-2 shadow-sm`
                      : 'bg-white border border-gray-200 hover:border-gray-300'
                    }
                    ${!cronograma ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {/* Status dot */}
                  <div className={`
                    absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center
                    ${status === 'exists' ? 'bg-green-500' : ''}
                    ${status === 'missing' ? 'bg-amber-400' : ''}
                    ${status === 'blocked' ? 'bg-gray-300' : ''}
                  `}>
                    {status === 'exists' && <CheckCircle className="h-3 w-3 text-white" />}
                    {status === 'missing' && <AlertTriangle className="h-2.5 w-2.5 text-white" />}
                    {status === 'blocked' && <Lock className="h-2 w-2 text-white" />}
                  </div>

                  <Icon className={`h-4 w-4 ${isSelected ? info.color : 'text-gray-500'}`} />

                  <div className="text-left">
                    <div className={`font-medium ${isSelected ? info.color : 'text-gray-700'}`}>
                      {info.shortLabel}
                    </div>
                    {cronograma && (
                      <div className="text-xs text-gray-500 truncate max-w-[100px]">
                        {cronograma.nombre}
                      </div>
                    )}
                    {!cronograma && status === 'missing' && tipo !== 'comercial' && (
                      <div className="text-xs text-amber-600">Sin crear</div>
                    )}
                    {!cronograma && status === 'blocked' && (
                      <div className="text-xs text-gray-400">Bloqueado</div>
                    )}
                    {!cronograma && tipo === 'comercial' && (
                      <div className="text-xs text-gray-400">Desde cotización</div>
                    )}
                  </div>

                  {/* Badges */}
                  {cronograma?.esBaseline && tipo === 'planificacion' && (
                    <Badge className="ml-1 h-5 px-1.5 text-xs bg-purple-100 text-purple-700">
                      Base
                    </Badge>
                  )}
                  {info.readOnly && cronograma && (
                    <Eye className="h-3 w-3 text-gray-400 ml-1" />
                  )}
                  {info.isMain && cronograma && (
                    <Badge className="ml-1 h-5 px-1.5 text-xs bg-green-100 text-green-700">
                      Activo
                    </Badge>
                  )}
                </button>

                {/* Arrow */}
                {index < tipoOrder.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 border-l pl-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadCronogramas}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {canCreateAnyCronograma() && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Crear Cronograma</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert className="border-blue-200 bg-blue-50 py-2">
                    <AlertDescription className="text-blue-700 text-sm">
                      Solo se permite <strong>1 cronograma por tipo</strong>.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={createForm.tipo}
                      onValueChange={(value: keyof typeof TIPO_CRONOGRAMA_INFO) =>
                        setCreateForm(prev => ({
                          ...prev,
                          tipo: value,
                          nombre: `Cronograma de ${TIPO_CRONOGRAMA_INFO[value].label}`,
                          copiarDesdeId: value === 'ejecucion' ? (getCronogramaBaseline()?.id || 'none') : 'none'
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableTypesForCreation().map((key) => {
                          const info = TIPO_CRONOGRAMA_INFO[key]
                          return (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <info.icon className="h-4 w-4" />
                                {info.label}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      value={createForm.nombre}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Ej: Cronograma de Ejecución"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Copiar desde (opcional)</Label>
                    <Select
                      value={createForm.copiarDesdeId}
                      onValueChange={(value) => setCreateForm(prev => ({ ...prev, copiarDesdeId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar origen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Crear desde cero</SelectItem>
                        {cronogramas.map((cronograma) => (
                          <SelectItem key={cronograma.id} value={cronograma.id}>
                            {cronograma.nombre} ({TIPO_CRONOGRAMA_INFO[cronograma.tipo as keyof typeof TIPO_CRONOGRAMA_INFO]?.label})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateCronograma}>
                      Crear
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  )
}
