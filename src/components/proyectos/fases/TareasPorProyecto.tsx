// ===================================================
// 📁 Archivo: TareasPorProyecto.tsx
// 📌 Ubicación: src/components/proyectos/fases/
// 🔧 Descripción: Vista general de tareas organizadas por fases y EDTs
//
// 🧠 Uso: Vista jerárquica de tareas en el proyecto
// ✍️ Autor: Sistema GYS - Implementación Cronograma 4 Niveles
// 📅 Última actualización: 2025-09-22
// ===================================================

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Target, CheckCircle, Clock, AlertCircle, PlayCircle } from 'lucide-react'
import { ProyectoTareaList } from './ProyectoTareaList'

// ✅ Tipos locales
interface ProyectoFase {
  id: string
  nombre: string
  descripcion?: string
  orden: number
  fechaInicioPlan?: string
  fechaFinPlan?: string
  fechaInicioReal?: string
  fechaFinReal?: string
  estado: 'planificado' | 'en_progreso' | 'completado' | 'pausado' | 'cancelado'
  porcentajeAvance: number
  createdAt: string
  updatedAt: string
  edts: any[]
  metricas: {
    totalEdts: number
    edtsCompletados: number
    progresoFase: number
    horasPlanTotal: number
    horasRealesTotal: number
  }
}

interface TareasPorProyectoProps {
  fases: ProyectoFase[]
  proyectoId: string
  onRefresh: () => void
}

export function TareasPorProyecto({ fases, proyectoId, onRefresh }: TareasPorProyectoProps) {
  const [faseExpandida, setFaseExpandida] = useState<string | null>(null)
  const [edtSeleccionado, setEdtSeleccionado] = useState<string | null>(null)

  // ✅ Función para obtener color del estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completado': return 'bg-green-100 text-green-800'
      case 'en_progreso': return 'bg-blue-100 text-blue-800'
      case 'pendiente': return 'bg-gray-100 text-gray-800'
      case 'cancelado': return 'bg-red-100 text-red-800'
      case 'pausada': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'completado': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'en_progreso': return <PlayCircle className="h-4 w-4 text-blue-500" />
      case 'pendiente': return <Clock className="h-4 w-4 text-gray-500" />
      case 'cancelado': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  // ✅ Estadísticas generales
  const estadisticasGenerales = {
    totalFases: fases.length,
    totalEdts: fases.reduce((sum, f) => sum + f.metricas.totalEdts, 0),
    fasesCompletadas: fases.filter(f => f.estado === 'completado').length,
    edtsCompletados: fases.reduce((sum, f) => sum + f.metricas.edtsCompletados, 0)
  }

  if (fases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay fases disponibles</h3>
          <p className="text-muted-foreground text-center">
            Crea fases y EDTs primero para poder gestionar tareas
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ✅ Header con estadísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📝 Gestión de Tareas
            <Badge variant="secondary">{estadisticasGenerales.totalEdts} EDTs</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Vista jerárquica: Proyecto → Fases → EDTs → Tareas
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {estadisticasGenerales.totalFases}
              </div>
              <div className="text-xs text-muted-foreground">Fases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {estadisticasGenerales.fasesCompletadas}
              </div>
              <div className="text-xs text-muted-foreground">Fases Completadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {estadisticasGenerales.totalEdts}
              </div>
              <div className="text-xs text-muted-foreground">EDTs Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {estadisticasGenerales.edtsCompletados}
              </div>
              <div className="text-xs text-muted-foreground">EDTs Completados</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ Lista jerárquica de fases y EDTs */}
      <div className="space-y-4">
        {fases.map((fase) => (
          <Card key={fase.id}>
            <Collapsible
              open={faseExpandida === fase.id}
              onOpenChange={(open) => setFaseExpandida(open ? fase.id : null)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {faseExpandida === fase.id ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      <div>
                        <CardTitle className="text-lg">
                          Fase {fase.orden}: {fase.nombre}
                        </CardTitle>
                        {fase.descripcion && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {fase.descripcion}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getEstadoIcon(fase.estado)}
                        <Badge className={getEstadoColor(fase.estado)}>
                          {fase.estado.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {fase.metricas.totalEdts} EDTs • {fase.metricas.edtsCompletados} completados
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  {fase.edts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay EDTs en esta fase. Crea EDTs primero para gestionar tareas.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fase.edts.map((edt) => (
                        <div key={edt.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Target className="h-5 w-5 text-blue-500" />
                              <div>
                                <h4 className="font-medium">{edt.nombre}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {edt.edt?.nombre} • {edt.zona || 'Sin zona'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-sm">
                                <div>Horas: {edt.horasPlan || 0}h plan / {edt.horasReales}h real</div>
                                <div>Avance: {edt.porcentajeAvance}%</div>
                              </div>
                              <Badge className={getEstadoColor(edt.estado)}>
                                {edt.estado.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>

                          {/* ✅ Lista de tareas del EDT */}
                          <ProyectoTareaList
                            edtId={edt.id}
                            proyectoId={proyectoId}
                            onRefresh={onRefresh}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  )
}