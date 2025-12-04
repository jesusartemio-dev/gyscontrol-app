'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  Calendar,
  Plus,
  Filter
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface TareaAsignada {
  id: string
  nombre: string
  tipo: 'tarea' | 'actividad' | 'zona' | 'edt'
  proyectoNombre: string
  responsableNombre?: string
  fechaInicio: Date
  fechaFin: Date
  horasPlan: number
  horasReales: number
  progreso: number
  estado: string
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  diasRestantes: number
}

interface TareasAsignadasDashboardProps {
  tareas?: TareaAsignada[]
  loading?: boolean
}

export function TareasAsignadasDashboard({ 
  tareas = [], 
  loading = false 
}: TareasAsignadasDashboardProps) {
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todas')

  // Calcular métricas
  const tareasActivas = tareas.filter(t => t.estado === 'en_progreso' || t.estado === 'pendiente')
  const completadasEstaSemana = tareas.filter(t => t.progreso === 100).length
  const proximasFechasLimite = tareas.filter(t => t.diasRestantes <= 7 && t.estado !== 'completada')

  // Filtrar tareas por prioridad
  const tareasFiltradas = filtroPrioridad === 'todas'
    ? tareasActivas
    : tareasActivas.filter(t => t.prioridad === filtroPrioridad)

  const getColorPrioridad = (prioridad: string) => {
    switch (prioridad) {
      case 'critica': return 'text-red-600 bg-red-100'
      case 'alta': return 'text-orange-600 bg-orange-100'
      case 'media': return 'text-yellow-600 bg-yellow-100'
      case 'baja': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'completada': return <Badge className="bg-green-100 text-green-800">Completada</Badge>
      case 'en_progreso': return <Badge className="bg-blue-100 text-blue-800">En Progreso</Badge>
      case 'pendiente': return <Badge variant="secondary">Pendiente</Badge>
      default: return <Badge variant="outline">{estado}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-8 w-8 bg-gray-300 rounded mb-2"></div>
                  <div className="h-6 w-12 bg-gray-300 rounded mb-1"></div>
                  <div className="h-4 w-20 bg-gray-300 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{tareasActivas.length}</p>
                <p className="text-sm text-gray-600">Tareas Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completadasEstaSemana}</p>
                <p className="text-sm text-gray-600">Completadas Esta Semana</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{proximasFechasLimite.length}</p>
                <p className="text-sm text-gray-600">Próximas Fechas Límite</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {tareas.reduce((sum, t) => sum + t.horasReales, 0)}h
                </p>
                <p className="text-sm text-gray-600">Horas Registradas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtro por prioridad */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="font-medium">Filtrar por prioridad:</span>
            <div className="flex gap-2">
              {[
                { key: 'todas', label: 'Todas', color: 'bg-gray-100' },
                { key: 'critica', label: 'Crítica', color: 'bg-red-100' },
                { key: 'alta', label: 'Alta', color: 'bg-orange-100' },
                { key: 'media', label: 'Media', color: 'bg-yellow-100' },
                { key: 'baja', label: 'Baja', color: 'bg-green-100' }
              ].map(({ key, label, color }) => (
                <Button
                  key={key}
                  variant={filtroPrioridad === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroPrioridad(key)}
                  className={filtroPrioridad === key ? '' : color}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de tareas */}
      <div className="space-y-4">
        {tareasFiltradas.map((tarea) => (
          <Card key={tarea.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{tarea.nombre}</h3>
                    <Badge className={getColorPrioridad(tarea.prioridad)}>
                      {tarea.prioridad.toUpperCase()}
                    </Badge>
                    {getEstadoBadge(tarea.estado)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <UserCheck className="h-4 w-4" />
                      <span>{tarea.proyectoNombre}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Vence: {format(tarea.fechaFin, 'dd/MM/yyyy', { locale: es })}
                        {tarea.diasRestantes > 0 && (
                          <span className={`ml-2 ${tarea.diasRestantes <= 3 ? 'text-red-600 font-medium' : ''}`}>
                            ({tarea.diasRestantes} días)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>
                        {tarea.horasPlan}h plan • {tarea.horasReales}h real
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progreso</span>
                      <span>{tarea.progreso}%</span>
                    </div>
                    <Progress value={tarea.progreso} className="h-2" />
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Ver Detalles
                    </Button>
                    <Link href="/horas-hombre/registro">
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Registrar Horas
                      </Button>
                    </Link>
                    {tarea.progreso < 100 && (
                      <Button size="sm" variant="outline">
                        Marcar Completada
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {tareasFiltradas.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay tareas asignadas
              </h3>
              <p className="text-gray-600">
                Actualmente no tienes tareas asignadas con los filtros seleccionados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}