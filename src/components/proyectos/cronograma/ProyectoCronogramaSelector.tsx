// ===================================================
// 📁 Archivo: ProyectoCronogramaSelector.tsx
// 📌 Ubicación: src/components/proyectos/cronograma/ProyectoCronogramaSelector.tsx
// 🔧 Descripción: Componente para seleccionar y gestionar tipos de cronograma
// 🎯 Funcionalidades: Crear, copiar y cambiar entre tipos de cronograma
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Copy,
  Calendar,
  Target,
  PlayCircle,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Trash2
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
    description: 'Cronograma basado en la cotización y estimaciones comerciales',
    icon: Calendar,
    color: 'bg-blue-100 text-blue-800',
    bgColor: 'bg-blue-50'
  },
  planificacion: {
    label: 'Planificación',
    description: 'Cronograma detallado de planificación y preparación',
    icon: Target,
    color: 'bg-purple-100 text-purple-800',
    bgColor: 'bg-purple-50'
  },
  ejecucion: {
    label: 'Ejecución',
    description: 'Cronograma real de ejecución y seguimiento del proyecto',
    icon: PlayCircle,
    color: 'bg-green-100 text-green-800',
    bgColor: 'bg-green-50'
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

  const loadCronogramas = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma`)

      if (!response.ok) {
        // If API doesn't exist or returns error, show empty state
        setCronogramas([])
        return
      }

      const data = await response.json()

      if (data.success) {
        setCronogramas(data.data)
      } else {
        setCronogramas([])
      }
    } catch (error) {
      // Don't show error toast, just show empty state
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
        headers: {
          'Content-Type': 'application/json'
        },
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
        throw new Error(errorData.error || errorData.details || 'Error al crear cronograma')
      }

      const data = await response.json()
      toast.success(data.message || 'Cronograma creado exitosamente')

      setShowCreateDialog(false)
      setCreateForm({
        tipo: 'planificacion',
        nombre: '',
        copiarDesdeId: 'none'
      })

      loadCronogramas()
      onCronogramaCreate?.()
    } catch (error) {
      console.error('Error creating cronograma:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear el cronograma')
    }
  }

  const handleCronogramaSelect = (cronograma: ProyectoCronograma) => {
    onCronogramaChange?.(cronograma)
  }

  const handleToggleBaseline = async (cronograma: ProyectoCronograma) => {
    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma/${cronograma.id}/baseline`, {
        method: 'PUT'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cambiar estado baseline')
      }

      const data = await response.json()
      toast.success(data.message || 'Estado baseline actualizado')

      // Recargar cronogramas
      loadCronogramas()
    } catch (error) {
      console.error('Error toggling baseline:', error)
      toast.error(error instanceof Error ? error.message : 'Error al cambiar estado baseline')
    }
  }

  const handleDeleteCronograma = async (cronograma: ProyectoCronograma) => {
    // Prevent deletion of baseline cronogramas
    if (cronograma.esBaseline) {
      toast.error('No se puede eliminar el cronograma baseline. Es el cronograma de planificación activo.')
      return
    }

    // Prevent deletion of commercial cronogramas
    if (cronograma.tipo === 'comercial') {
      toast.error('No se puede eliminar el cronograma comercial. Los cronogramas comerciales son de solo lectura.')
      return
    }

    // Prevent deletion of execution cronogramas without baseline
    if (cronograma.tipo === 'ejecucion') {
      const baselineExists = cronogramas.some(c => c.esBaseline && c.tipo === 'planificacion')
      if (!baselineExists) {
        toast.error('No se puede eliminar el cronograma de ejecución sin un cronograma de planificación baseline.')
        return
      }
    }

    // Confirm deletion
    if (!confirm(`¿Estás seguro de que quieres eliminar el cronograma "${cronograma.nombre}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma?cronogramaId=${cronograma.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar cronograma')
      }

      toast.success('Cronograma eliminado exitosamente')

      // If the deleted cronograma was selected, select another one
      if (selectedCronograma?.id === cronograma.id) {
        const remainingCronogramas = cronogramas.filter(c => c.id !== cronograma.id)
        const newSelected = remainingCronogramas.find(c => c.esBaseline) || remainingCronogramas[0]
        onCronogramaChange?.(newSelected)
      }

      loadCronogramas()
    } catch (error) {
      console.error('Error deleting cronograma:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar el cronograma')
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

  const getCronogramaActivo = () => {
    return selectedCronograma || cronogramas.find(c => c.esBaseline) || cronogramas[0]
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const cronogramaActivo = getCronogramaActivo()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tipos de Cronograma</h2>
          <p className="text-gray-600 mt-1">
            Gestiona diferentes versiones del cronograma del proyecto
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCronogramas}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cronograma
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Cronograma</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Cronograma</Label>
                  <Select
                    value={createForm.tipo}
                    onValueChange={(value: keyof typeof TIPO_CRONOGRAMA_INFO) =>
                      setCreateForm(prev => ({ ...prev, tipo: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_CRONOGRAMA_INFO).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <info.icon className="h-4 w-4" />
                            {info.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Cronograma</Label>
                  <Input
                    id="nombre"
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej: Cronograma de Ejecución v2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="copiarDesde">Copiar desde (opcional)</Label>
                  <Select
                    value={createForm.copiarDesdeId}
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, copiarDesdeId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cronograma origen" />
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

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateCronograma}>
                    Crear Cronograma
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cronograma Activo */}
      {cronogramaActivo && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {React.createElement(TIPO_CRONOGRAMA_INFO[cronogramaActivo.tipo as keyof typeof TIPO_CRONOGRAMA_INFO]?.icon || Calendar, {
                    className: "h-6 w-6 text-blue-600"
                  })}
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">
                    Cronograma Activo: {cronogramaActivo.nombre}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {TIPO_CRONOGRAMA_INFO[cronogramaActivo.tipo as keyof typeof TIPO_CRONOGRAMA_INFO]?.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cronogramaActivo.esBaseline && cronogramaActivo.tipo === 'planificacion' && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Línea Base
                  </Badge>
                )}
                <Badge className={TIPO_CRONOGRAMA_INFO[cronogramaActivo.tipo as keyof typeof TIPO_CRONOGRAMA_INFO]?.color}>
                  {TIPO_CRONOGRAMA_INFO[cronogramaActivo.tipo as keyof typeof TIPO_CRONOGRAMA_INFO]?.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tipos de Cronograma */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(TIPO_CRONOGRAMA_INFO).map(([tipo, info]) => {
          const cronogramasTipo = getCronogramasPorTipo(tipo as keyof typeof TIPO_CRONOGRAMA_INFO)
          const Icon = info.icon

          return (
            <Card key={tipo} className={`transition-all duration-200 hover:shadow-lg ${info.bgColor}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Icon className="h-6 w-6" style={{ color: `var(--${tipo}-600)` }} />
                    {info.label}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {cronogramasTipo.length}
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  {info.description}
                </p>

                {/* Lista de cronogramas de este tipo */}
                <div className="space-y-2">
                  {cronogramasTipo.slice(0, 3).map((cronograma) => (
                    <div
                      key={cronograma.id}
                      className={`p-2 rounded-lg cursor-pointer transition-all ${
                        cronogramaActivo?.id === cronograma.id
                          ? 'bg-white shadow-sm border-2 border-blue-200'
                          : 'bg-white/50 hover:bg-white/80'
                      }`}
                      onClick={() => handleCronogramaSelect(cronograma)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {cronograma.nombre}
                        </span>
                        <div className="flex items-center gap-1">
                          {cronograma.esBaseline && cronograma.tipo === 'planificacion' && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Línea Base
                            </Badge>
                          )}
                          {cronograma.tipo === 'planificacion' && !cronograma.esBaseline && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleBaseline(cronograma)
                              }}
                              title="Marcar como Línea Base"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                          {!cronograma.esBaseline && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteCronograma(cronograma)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {cronogramasTipo.length === 0 && (
                    <div className="p-2 rounded-lg bg-white/30 text-center">
                      <p className="text-xs text-gray-500">Sin cronogramas</p>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-2">
                  {tipo === 'planificacion' && cronogramasTipo.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setCreateForm(prev => ({
                          ...prev,
                          tipo: tipo as keyof typeof TIPO_CRONOGRAMA_INFO,
                          copiarDesdeId: 'none'
                        }))
                        setShowCreateDialog(true)
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Crear Planificación
                    </Button>
                  )}

                  {tipo === 'ejecucion' && canCreateEjecucion() && cronogramasTipo.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setCreateForm(prev => ({
                          ...prev,
                          tipo: tipo as keyof typeof TIPO_CRONOGRAMA_INFO,
                          copiarDesdeId: getCronogramaBaseline()?.id || 'none'
                        }))
                        setShowCreateDialog(true)
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Crear Ejecución
                    </Button>
                  )}

                  {tipo === 'ejecucion' && !canCreateEjecucion() && (
                    <div className="flex-1 text-xs text-gray-500 text-center py-2">
                      Requiere baseline de planificación
                    </div>
                  )}

                  {tipo === 'comercial' && (
                    <div className="flex-1 text-xs text-gray-500 text-center py-2">
                      Automático al crear proyecto
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Información adicional */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default">🏗️ Proyecto</Badge>
                <span>Nivel superior del proyecto</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">📋 Fases</Badge>
                <span>Etapas del proyecto (Planificación, Ejecución, Cierre)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">🔧 EDTs</Badge>
                <span>Estructura de Desglose de Trabajo</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">✅ Tareas</Badge>
                <span>Actividades específicas ejecutables</span>
              </div>
            </div>
            <div>
              Total cronogramas: {cronogramas.length}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}