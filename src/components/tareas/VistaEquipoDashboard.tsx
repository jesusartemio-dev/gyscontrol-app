'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Target,
  BarChart3,
  UserCheck
} from 'lucide-react'

interface MiembroEquipo {
  id: string
  nombre: string
  rol: string
  avatar?: string
  horasRegistradas: number
  horasObjetivo: number
  tareasCompletadas: number
  tareasAsignadas: number
  eficiencia: number
  estado: 'activo' | 'inactivo' | 'vacaciones'
  ultimoRegistro: Date
}

interface ProyectoEquipo {
  nombre: string
  miembros: MiembroEquipo[]
  horasTotales: number
  tareasTotales: number
  progresoGeneral: number
}

interface VistaEquipoDashboardProps {
  proyectos?: ProyectoEquipo[]
  loading?: boolean
}

export function VistaEquipoDashboard({ 
  proyectos = [],
  loading = false
}: VistaEquipoDashboardProps) {
  const [vistaActiva, setVistaActiva] = useState('general')

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'bg-green-100 text-green-800'
      case 'inactivo': return 'bg-gray-100 text-gray-800'
      case 'vacaciones': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEficienciaColor = (eficiencia: number) => {
    if (eficiencia >= 90) return 'text-green-600'
    if (eficiencia >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  const miembrosBajoRendimiento = proyectos.flatMap(p =>
    p.miembros.filter(m => m.eficiencia < 70)
  )

  const miembrosSinRegistro = proyectos.flatMap(p =>
    p.miembros.filter(m => {
      const diasSinRegistro = Math.floor((Date.now() - m.ultimoRegistro.getTime()) / (1000 * 60 * 60 * 24))
      return diasSinRegistro > 3
    })
  )

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
      {/* Alertas */}
      {(miembrosBajoRendimiento.length > 0 || miembrosSinRegistro.length > 0) && (
        <div className="space-y-3">
          {miembrosBajoRendimiento.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-900">
                      {miembrosBajoRendimiento.length} miembro{miembrosBajoRendimiento.length > 1 ? 's' : ''} con rendimiento bajo
                    </p>
                    <p className="text-sm text-orange-700">
                      Eficiencia por debajo del 70%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {miembrosSinRegistro.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">
                      {miembrosSinRegistro.length} miembro{miembrosSinRegistro.length > 1 ? 's' : ''} sin registro reciente
                    </p>
                    <p className="text-sm text-red-700">
                      Más de 3 días sin registrar horas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Vista por proyectos */}
      <Tabs value={vistaActiva} onValueChange={setVistaActiva}>
        <TabsList>
          <TabsTrigger value="general">Vista General</TabsTrigger>
          <TabsTrigger value="proyectos">Por Proyecto</TabsTrigger>
          <TabsTrigger value="miembros">Por Miembro</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Estadísticas generales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {proyectos.reduce((sum, p) => sum + p.miembros.length, 0)}
                    </p>
                    <p className="text-sm text-gray-600">Miembros Totales</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {proyectos.reduce((sum, p) => sum + p.horasTotales, 0)}h
                    </p>
                    <p className="text-sm text-gray-600">Horas Totales</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {proyectos.reduce((sum, p) => sum + p.tareasTotales, 0)}
                    </p>
                    <p className="text-sm text-gray-600">Tareas Totales</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {Math.round(proyectos.reduce((sum, p) => sum + p.progresoGeneral, 0) / proyectos.length)}%
                    </p>
                    <p className="text-sm text-gray-600">Progreso Promedio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Proyectos overview */}
          <div className="space-y-4">
            {proyectos.map((proyecto, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{proyecto.nombre}</CardTitle>
                    <Badge variant="outline">
                      {proyecto.progresoGeneral}% completado
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Miembros</p>
                      <p className="font-medium">{proyecto.miembros.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Horas Totales</p>
                      <p className="font-medium">{proyecto.horasTotales}h</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tareas</p>
                      <p className="font-medium">{proyecto.tareasTotales}</p>
                    </div>
                  </div>
                  <Progress value={proyecto.progresoGeneral} className="h-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="proyectos" className="space-y-6">
          {proyectos.map((proyecto, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {proyecto.nombre}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {proyecto.miembros.map((miembro) => (
                  <div key={miembro.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={miembro.avatar} />
                          <AvatarFallback>
                            {miembro.nombre.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{miembro.nombre}</p>
                          <p className="text-sm text-gray-600">{miembro.rol}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getEstadoColor(miembro.estado)}>
                          {miembro.estado}
                        </Badge>
                        <Badge variant="outline" className={getEficienciaColor(miembro.eficiencia)}>
                          {miembro.eficiencia}% eficiencia
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Horas</p>
                        <p className="font-medium">
                          {miembro.horasRegistradas}h / {miembro.horasObjetivo}h
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tareas</p>
                        <p className="font-medium">
                          {miembro.tareasCompletadas} / {miembro.tareasAsignadas}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Último Registro</p>
                        <p className="font-medium">
                          {new Date(miembro.ultimoRegistro).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Eficiencia</p>
                        <p className={`font-medium ${getEficienciaColor(miembro.eficiencia)}`}>
                          {miembro.eficiencia}%
                        </p>
                      </div>
                    </div>

                    <Progress value={miembro.eficiencia} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="miembros" className="space-y-4">
          {proyectos.flatMap(p => p.miembros).map((miembro) => (
            <Card key={miembro.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={miembro.avatar} />
                      <AvatarFallback>
                        {miembro.nombre.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{miembro.nombre}</h3>
                      <p className="text-sm text-gray-600">{miembro.rol}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{miembro.eficiencia}%</p>
                      <p className="text-sm text-gray-600">Eficiencia</p>
                    </div>
                    <Badge className={getEstadoColor(miembro.estado)}>
                      {miembro.estado}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-600">Horas Registradas</p>
                    <p className="font-medium">{miembro.horasRegistradas}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tareas Completadas</p>
                    <p className="font-medium">{miembro.tareasCompletadas}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Último Registro</p>
                    <p className="font-medium">
                      {new Date(miembro.ultimoRegistro).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Proyecto</p>
                    <p className="font-medium">
                      {proyectos.find(p => p.miembros.some(m => m.id === miembro.id))?.nombre}
                    </p>
                  </div>
                </div>

                <Progress value={miembro.eficiencia} className="h-2 mt-4" />
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}