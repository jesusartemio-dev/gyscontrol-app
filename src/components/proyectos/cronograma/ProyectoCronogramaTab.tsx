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
import type { ProyectoCronograma } from '@/types/modelos'

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
  const [activeTab, setActiveTab] = useState('lista')
  const [showEdtForm, setShowEdtForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

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

  return (
    <div className="space-y-6">
      {/* Header del Tab */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Cronograma de 4 Niveles
          </h2>
          <p className="text-muted-foreground">
            Jerarquía completa: Proyecto → Fases → EDTs → Tareas para {proyectoNombre}
          </p>
        </div>

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

          <Button
            variant="outline"
            onClick={handleCreateDefaultFases}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Fases por Defecto
          </Button>

          <Button
            onClick={handleCreateEdt}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo EDT
          </Button>
        </div>
      </div>

      {/* Modal de creación de EDT */}
      {showEdtForm && (
        <div> {/* TODO: Implementar ProyectoEdtForm */} </div>
      )}

      {/* Contenido principal con tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
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

        {/* Tab de Fases */}
        <TabsContent value="fases" className="space-y-4">
          <div> {/* TODO: Implementar ProyectoFasesList */} </div>
        </TabsContent>

        {/* Tab de Lista de EDTs */}
        <TabsContent value="lista" className="space-y-4">
          <div> {/* TODO: Implementar ProyectoEdtList */} </div>
        </TabsContent>

        {/* Tab de Vista Gantt */}
        <TabsContent value="gantt" className="space-y-4">
          <div> {/* TODO: Implementar ProyectoCronogramaGanttView */} </div>
        </TabsContent>

        {/* Tab de Métricas */}
        <TabsContent value="metricas" className="space-y-4">
          <div> {/* TODO: Implementar ProyectoCronogramaMetrics */} </div>
        </TabsContent>

        {/* Tab de Filtros */}
        <TabsContent value="filtros" className="space-y-4">
          <div> {/* TODO: Implementar ProyectoCronogramaFilters */} </div>
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