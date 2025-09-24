'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, AlertTriangle } from 'lucide-react'
import { GanttPorFases } from '@/components/proyectos/fases/GanttPorFases'
import type { ProyectoFase } from '@/types/modelos'

interface ProyectoCronogramaGanttViewProps {
  proyectoId: string
  cronogramaId?: string
}

export function ProyectoCronogramaGanttView({
  proyectoId,
  cronogramaId
}: ProyectoCronogramaGanttViewProps) {
  const [fases, setFases] = useState<ProyectoFase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cronogramaId) {
      loadGanttData()
    } else {
      setLoading(false)
    }
  }, [proyectoId, cronogramaId])

  const loadGanttData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch fases with EDTs and tasks for the selected cronograma
      const response = await fetch(`/api/proyectos/${proyectoId}/cronograma-gantt?cronogramaId=${cronogramaId}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Error al cargar datos del Gantt: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setFases(data.data || [])
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (err) {
      console.error('Error loading Gantt data:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar datos del Gantt')
    } finally {
      setLoading(false)
    }
  }

  if (!cronogramaId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Selecciona un Cronograma
            </h3>
            <p className="text-gray-600">
              Para ver la vista Gantt, primero selecciona un tipo de cronograma en la pestaña "Tipos".
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Vista Gantt del Cronograma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <div className="space-y-2">
                  {[1, 2].map((j) => (
                    <div key={j} className="ml-8 border-l-2 border-gray-200 p-2">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (fases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Vista Gantt del Cronograma
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay datos para mostrar
            </h3>
            <p className="text-gray-600">
              Este cronograma no tiene fases, EDTs o tareas configuradas.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Transform data to match GanttPorFases expected format
  const transformedFases = fases.map(fase => ({
    ...fase,
    edts: fase.edts?.map(edt => ({
      ...edt,
      tareas: (edt as any).ProyectoTarea || [] // Map ProyectoTarea to tareas
    })) || []
  }))

  return (
    <GanttPorFases
      fases={transformedFases}
      proyectoId={proyectoId}
      onEdtClick={(edt) => {
        console.log('EDT clicked:', edt)
        // TODO: Implement EDT detail view
      }}
      onTareaClick={(tarea) => {
        console.log('Tarea clicked:', tarea)
        // TODO: Implement task detail view
      }}
    />
  )
}