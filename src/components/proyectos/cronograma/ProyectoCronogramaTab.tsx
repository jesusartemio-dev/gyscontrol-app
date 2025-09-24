'use client'

/**
 * 📅 ProyectoCronogramaTab - Componente principal del tab de cronograma de proyectos
 *
 * Componente principal que gestiona la vista completa del cronograma de proyectos.
 * Incluye lista de EDTs, vista Gantt, métricas y filtros adaptados para proyectos.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Calendar, BarChart3, Filter, RefreshCw, FolderOpen, Settings } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ProyectoFasesList } from '@/components/proyectos/fases/ProyectoFasesList'
import { ProyectoEdtList } from '@/components/proyectos/cronograma/ProyectoEdtList'
import { ProyectoCronogramaMetrics } from '@/components/proyectos/cronograma/ProyectoCronogramaMetrics'
import { ProyectoCronogramaFilters, type FilterState } from '@/components/proyectos/cronograma/ProyectoCronogramaFilters'
import { ProyectoCronogramaSelector } from '@/components/proyectos/cronograma/ProyectoCronogramaSelector'
import { ProyectoGanttChart } from '@/components/proyectos/cronograma/ProyectoGanttChart'
import { ProyectoCronogramaGanttView } from '@/components/proyectos/cronograma/ProyectoCronogramaGanttView'
import type { ProyectoCronograma, ProyectoFase, ProyectoEdt } from '@/types/modelos'

interface ProyectoCronogramaTabProps {
  proyectoId: string
  proyectoNombre: string
  cronograma?: ProyectoCronograma
  onRefresh?: () => void
}

export function ProyectoCronogramaTab({
  proyectoId,
  proyectoNombre,
  cronograma,
  onRefresh
}: ProyectoCronogramaTabProps) {
  console.log('🔍 [CRONOGRAMA TAB] Iniciando componente ProyectoCronogramaTab', { proyectoId, proyectoNombre })

  const [activeTab, setActiveTab] = useState('selector')
  const [showEdtForm, setShowEdtForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCronograma, setSelectedCronograma] = useState<ProyectoCronograma | undefined>(cronograma)
  const { toast } = useToast()

  console.log('✅ [CRONOGRAMA TAB] Estado inicial configurado')

  // Update selected cronograma when prop changes
  useEffect(() => {
    setSelectedCronograma(cronograma)
  }, [cronograma])

  // Función para refrescar datos
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    onRefresh?.()
    toast({
      title: 'Datos actualizados',
      description: 'El cronograma ha sido actualizado correctamente.'
    })
  }

  // Función para crear nuevo EDT
  const handleCreateEdt = () => {
    setShowEdtForm(true)
  }

  // Función después de crear EDT
  const handleEdtCreated = () => {
    setShowEdtForm(false)
    handleRefresh()
    toast({
      title: 'EDT creado',
      description: 'El EDT del proyecto ha sido creado exitosamente.'
    })
  }

  // Función para crear fases por defecto desde configuración global
  const handleCreateDefaultFases = async () => {
    try {
      // Primero verificar si ya existen fases en este proyecto
      const existingFasesResponse = await fetch(`/api/proyectos/${proyectoId}/fases`, {
        credentials: 'include'
      })

      if (existingFasesResponse.ok) {
        const existingFasesResult = await existingFasesResponse.json()
        if (existingFasesResult.success && existingFasesResult.data && existingFasesResult.data.length > 0) {
          toast({
            title: 'Fases ya existen',
            description: `Este proyecto ya tiene ${existingFasesResult.data.length} fases. Ve a la pestaña "Fases" para verlas.`,
            variant: 'default'
          })
          return
        }
      }

      // Obtener fases por defecto desde configuración global
      const response = await fetch('/api/configuracion/fases', {
        credentials: 'include' // Incluir cookies de autenticación
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: 'Error de autenticación',
            description: 'Debes iniciar sesión para acceder a la configuración.',
            variant: 'destructive'
          })
          return
        }
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success || !result.data || result.data.length === 0) {
        toast({
          title: 'Error',
          description: 'No hay fases por defecto configuradas. Ve a Configuración > Fases por Defecto para crearlas.',
          variant: 'destructive'
        })
        return
      }

      // Crear fases en el proyecto basadas en la configuración global
      let successCount = 0
      let errorCount = 0

      for (const faseDefault of result.data) {
        try {
          const createResponse = await fetch(`/api/proyectos/${proyectoId}/fases`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              nombre: faseDefault.nombre,
              descripcion: faseDefault.descripcion,
              orden: faseDefault.orden
            })
          })

          if (createResponse.ok) {
            successCount++
          } else {
            const errorText = await createResponse.text()
            console.error(`Error creando fase ${faseDefault.nombre}:`, errorText)
            errorCount++
          }
        } catch (createError) {
          console.error(`Error creando fase ${faseDefault.nombre}:`, createError)
          errorCount++
        }
      }

      if (successCount > 0) {
        handleRefresh()
        toast({
          title: 'Fases creadas exitosamente',
          description: `Se crearon ${successCount} fases${errorCount > 0 ? ` (${errorCount} errores)` : ''}. Ve a la pestaña "Fases" para verlas.`,
        })
      } else {
        toast({
          title: 'Error',
          description: 'No se pudieron crear las fases. Verifica la configuración y permisos.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error en handleCreateDefaultFases:', error)
      toast({
        title: 'Error',
        description: 'Error de conexión. Inténtalo de nuevo.',
        variant: 'destructive'
      })
    }
  }

  console.log('🎨 [CRONOGRAMA TAB] Renderizando componente')

  return (
    <div className="space-y-6">
      {/* Header del Tab */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Contenido principal con tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="selector" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Tipos
          </TabsTrigger>
          <TabsTrigger value="fases" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Fases
          </TabsTrigger>
          <TabsTrigger value="lista" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Lista EDTs
          </TabsTrigger>
          <TabsTrigger value="gantt" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Vista Gantt
          </TabsTrigger>
          <TabsTrigger value="metricas" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Métricas
          </TabsTrigger>
          <TabsTrigger value="filtros" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </TabsTrigger>
        </TabsList>

        {/* Tab de Selector de Cronogramas */}
        <TabsContent value="selector" className="space-y-4">
          <ProyectoCronogramaSelector
            proyectoId={proyectoId}
            selectedCronograma={selectedCronograma}
            onCronogramaChange={(newCronograma) => {
              console.log('🔄 [CRONOGRAMA TAB] Cambio de cronograma:', newCronograma)
              setSelectedCronograma(newCronograma)
              toast({
                title: 'Cronograma cambiado',
                description: `Ahora trabajando con: ${newCronograma.nombre}`,
                variant: 'default'
              })
            }}
            onCronogramaCreate={() => {
              handleRefresh()
            }}
          />
        </TabsContent>

        {/* Tab de Fases */}
        <TabsContent value="fases" className="space-y-4">
          <ProyectoFasesList
            proyectoId={proyectoId}
            cronogramaId={selectedCronograma?.id}
            onFaseSelect={(fase) => {
              console.log('Fase seleccionada:', fase)
            }}
            onFaseCreate={() => {
              toast({
                title: 'Funcionalidad pendiente',
                description: 'La creación de fases estará disponible próximamente.',
                variant: 'default'
              })
            }}
            onFaseEdit={(fase: ProyectoFase) => {
              toast({
                title: 'Funcionalidad pendiente',
                description: `Edición de fase "${fase.nombre}" estará disponible próximamente.`,
                variant: 'default'
              })
            }}
            onFaseDelete={(faseId: string) => {
              handleRefresh()
            }}
          />
        </TabsContent>

        {/* Tab de Lista de EDTs */}
        <TabsContent value="lista" className="space-y-4">
          <ProyectoEdtList
            proyectoId={proyectoId}
            cronogramaId={selectedCronograma?.id}
            onEdtCreate={() => {
              toast({
                title: 'Funcionalidad pendiente',
                description: 'La creación de EDTs estará disponible próximamente.',
                variant: 'default'
              })
            }}
            onEdtEdit={(edt: ProyectoEdt) => {
              toast({
                title: 'Funcionalidad pendiente',
                description: `Edición de EDT "${edt.nombre}" estará disponible próximamente.`,
                variant: 'default'
              })
            }}
            onEdtDelete={(edtId: string) => {
              handleRefresh()
            }}
          />
        </TabsContent>

        {/* Tab de Vista Gantt */}
        <TabsContent value="gantt" className="space-y-4">
          <ProyectoGanttChart
            proyectoId={proyectoId}
            cronogramaId={selectedCronograma?.id}
            height={600}
          />
        </TabsContent>

        {/* Tab de Métricas */}
        <TabsContent value="metricas" className="space-y-4">
          <ProyectoCronogramaMetrics
            proyectoId={proyectoId}
          />
        </TabsContent>

        {/* Tab de Filtros */}
        <TabsContent value="filtros" className="space-y-4">
          <ProyectoCronogramaFilters
            onFiltersChange={(filters: FilterState) => {
              console.log('Filtros aplicados:', filters)
              toast({
                title: 'Filtros aplicados',
                description: 'Los filtros se aplicarán en la próxima versión.',
                variant: 'default'
              })
            }}
          />
        </TabsContent>
      </Tabs>

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
                <span>Actividades específicas dentro de EDTs</span>
              </div>
            </div>
            <div>
              Última actualización: {new Date().toLocaleString('es-ES')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}