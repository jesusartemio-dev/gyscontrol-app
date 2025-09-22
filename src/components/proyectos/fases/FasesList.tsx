'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'

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

interface FasesListProps {
  fases: ProyectoFase[]
  onFaseEdit: (fase: ProyectoFase) => void
  onFaseDelete: (faseId: string) => void
  onRefresh: () => void
}

// ✅ Función para obtener color del estado
const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'completado': return 'bg-green-100 text-green-800 border-green-200'
    case 'en_progreso': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'planificado': return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'pausado': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'cancelado': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

// ✅ Función para obtener ícono del estado
const getEstadoIcon = (estado: string) => {
  switch (estado) {
    case 'completado': return <CheckCircle className="h-3 w-3" />
    case 'en_progreso': return <PlayCircle className="h-3 w-3" />
    case 'planificado': return <Clock className="h-3 w-3" />
    case 'pausado': return <PauseCircle className="h-3 w-3" />
    case 'cancelado': return <AlertCircle className="h-3 w-3" />
    default: return <Clock className="h-3 w-3" />
  }
}

// ✅ Función para formatear fechas
const formatDate = (dateString?: string) => {
  if (!dateString) return 'No definida'
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function FasesList({ fases, onFaseEdit, onFaseDelete, onRefresh }: FasesListProps) {
  const [expandedFase, setExpandedFase] = useState<string | null>(null)

  if (fases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay fases definidas</h3>
          <p className="text-muted-foreground text-center mb-4">
            Crea fases para organizar mejor el cronograma de tu proyecto
          </p>
          <Button onClick={onRefresh} variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {fases.map((fase, index) => (
          <motion.div
            key={fase.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Fase {fase.orden}
                      </span>
                      <Badge
                        variant="outline"
                        className={getEstadoColor(fase.estado)}
                      >
                        {getEstadoIcon(fase.estado)}
                        <span className="ml-1 capitalize">
                          {fase.estado.replace('_', ' ')}
                        </span>
                      </Badge>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onFaseEdit(fase)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onFaseDelete(fase.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CardTitle className="text-lg">{fase.nombre}</CardTitle>
                {fase.descripcion && (
                  <p className="text-sm text-muted-foreground">{fase.descripcion}</p>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* ✅ Progreso de la fase */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progreso de la fase</span>
                    <span className="font-medium">{fase.metricas.progresoFase.toFixed(1)}%</span>
                  </div>
                  <Progress value={fase.metricas.progresoFase} className="h-2" />
                </div>

                {/* ✅ Métricas principales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {fase.metricas.totalEdts}
                    </div>
                    <div className="text-xs text-muted-foreground">EDTs Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {fase.metricas.edtsCompletados}
                    </div>
                    <div className="text-xs text-muted-foreground">Completados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {fase.metricas.horasPlanTotal}
                    </div>
                    <div className="text-xs text-muted-foreground">Horas Plan</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {fase.metricas.horasRealesTotal}
                    </div>
                    <div className="text-xs text-muted-foreground">Horas Reales</div>
                  </div>
                </div>

                {/* ✅ Fechas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <div className="text-sm font-medium mb-1">Fechas Planificadas</div>
                    <div className="text-sm text-muted-foreground">
                      Inicio: {formatDate(fase.fechaInicioPlan)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Fin: {formatDate(fase.fechaFinPlan)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Fechas Reales</div>
                    <div className="text-sm text-muted-foreground">
                      Inicio: {formatDate(fase.fechaInicioReal)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Fin: {formatDate(fase.fechaFinReal)}
                    </div>
                  </div>
                </div>

                {/* ✅ EDTs de la fase (expandible) */}
                {fase.edts.length > 0 && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedFase(
                        expandedFase === fase.id ? null : fase.id
                      )}
                      className="w-full justify-start"
                    >
                      <span className="text-sm">
                        {fase.edts.length} EDT{fase.edts.length !== 1 ? 's' : ''} en esta fase
                      </span>
                    </Button>

                    {expandedFase === fase.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 space-y-2"
                      >
                        {fase.edts.map((edt: any) => (
                          <div
                            key={edt.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                          >
                            <div>
                              <div className="font-medium">{edt.nombre}</div>
                              <div className="text-muted-foreground">
                                {edt.categoriaServicio?.nombre}
                              </div>
                            </div>
                            <Badge variant="outline" className={getEstadoColor(edt.estado)}>
                              {edt.estado.replace('_', ' ')}
                            </Badge>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}