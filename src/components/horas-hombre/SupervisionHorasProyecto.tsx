'use client'

/**
 * SupervisionHorasProyecto - Vista de supervisión de horas del proyecto
 * 
 * Muestra todas las horas registradas por todo el equipo en un proyecto
 * para administradores, coordinadores y gestores.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Users,
  Clock,
  Calendar,
  TrendingUp,
  Eye,
  User
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface RegistroHoras {
  id: string
  horas: number
  descripcion: string
  textoJerarquico: string
  usuario: {
    id: string
    nombre: string
    email: string
  }
  recursoNombre: string
  aprobado: boolean
  fecha: Date
}

interface ResumenDia {
  fecha: Date
  fechaString: string
  diaNombre: string
  totalHoras: number
  registros: RegistroHoras[]
}

interface ResumenUsuario {
  usuarioId: string
  nombre: string
  email: string
  horas: number
  registros: number
  diasActivos: number
}

interface ResumenProyecto {
  proyecto: {
    id: string
    codigo: string
    nombre: string
    cliente: string
    estado: string
  }
  periodo: {
    inicio: string
    fin: string
    semana: string
  }
  metricas: {
    totalHoras: number
    usuariosActivos: number
    promedioDiario: number
    promedioPorUsuario: number
    totalRegistros: number
  }
}

interface SupervisionHorasProyectoProps {
  proyectoId: string
  semanaISO: string
  fechaInicio: string
  fechaFin: string
}

export function SupervisionHorasProyecto({
  proyectoId,
  semanaISO,
  fechaInicio,
  fechaFin
}: SupervisionHorasProyectoProps) {
  const [resumenProyecto, setResumenProyecto] = useState<ResumenProyecto | null>(null)
  const [diasSemana, setDiasSemana] = useState<ResumenDia[]>([])
  const [resumenUsuarios, setResumenUsuarios] = useState<ResumenUsuario[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Cargar datos de supervisión
  useEffect(() => {
    loadSupervisionHoras()
  }, [proyectoId, semanaISO])

  const loadSupervisionHoras = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        proyectoId,
        semana: semanaISO
      })

      const response = await fetch(`/api/horas-hombre/supervision-proyecto?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar datos de supervisión')
      }

      const data = await response.json()

      if (data.success) {
        setResumenProyecto(data.data.resumenProyecto)
        setDiasSemana(data.data.diasSemana || [])
        setResumenUsuarios(data.data.resumenUsuarios || [])
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (error) {
      console.error('Error cargando supervisión de horas:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de supervisión',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getColorPorHoras = (horas: number) => {
    if (horas === 0) return 'bg-gray-100'
    if (horas < 20) return 'bg-red-100'
    if (horas < 40) return 'bg-yellow-100'
    return 'bg-green-100'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando datos de supervisión...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!resumenProyecto) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Sin Datos
            </h3>
            <p className="text-gray-600">
              No se encontraron horas registradas para este proyecto en el período seleccionado.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Métricas del Proyecto */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{resumenProyecto.metricas.totalHoras}h</p>
                <p className="text-sm text-gray-600">Total Horas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{resumenProyecto.metricas.usuariosActivos}</p>
                <p className="text-sm text-gray-600">Usuarios Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{resumenProyecto.metricas.promedioDiario}h</p>
                <p className="text-sm text-gray-600">Promedio/Día</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{resumenProyecto.metricas.totalRegistros}</p>
                <p className="text-sm text-gray-600">Registros</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información del Proyecto */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Proyecto:</span>
              <p className="text-gray-900">{resumenProyecto.proyecto.codigo} - {resumenProyecto.proyecto.nombre}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Cliente:</span>
              <p className="text-gray-900">{resumenProyecto.proyecto.cliente}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Período:</span>
              <p className="text-gray-900">{resumenProyecto.periodo.inicio} al {resumenProyecto.periodo.fin}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vista Semanal del Proyecto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Vista Semanal por Día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-4">
            {/* Headers de días */}
            {diasSemana.map((dia, index) => (
              <div key={index} className="text-center">
                <div className="font-medium text-gray-900 mb-2">
                  {dia.diaNombre}
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  {format(new Date(dia.fecha), 'd MMM', { locale: es })}
                </div>
                
                {/* Celda del día */}
                <div className={`min-h-[200px] border rounded-lg p-3 ${getColorPorHoras(dia.totalHoras)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold">{dia.totalHoras}h</span>
                    <Badge variant="secondary" className="text-xs">
                      {dia.registros.length}
                    </Badge>
                  </div>

                  {/* Registros del día */}
                  <div className="space-y-1">
                    {dia.registros.slice(0, 4).map((registro) => (
                      <div
                        key={registro.id}
                        className="text-xs bg-white/80 rounded px-2 py-1 truncate"
                        title={`${registro.textoJerarquico} - ${registro.descripcion}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-gray-500" />
                            <span className="truncate flex-1" title={registro.usuario.nombre}>
                              {registro.usuario.nombre.split(' ')[0]}
                            </span>
                          </div>
                          <span className="font-medium">{registro.horas}h</span>
                        </div>
                      </div>
                    ))}

                    {dia.registros.length > 4 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dia.registros.length - 4} más...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumen por Usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumen por Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {resumenUsuarios.map((usuario) => (
              <div key={usuario.usuarioId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-blue-500 text-white flex items-center justify-center text-sm font-medium rounded-full">
                    {usuario.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{usuario.nombre}</p>
                    <p className="text-sm text-gray-600">{usuario.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-lg">{usuario.horas}h</p>
                    <p className="text-gray-600">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">{usuario.registros}</p>
                    <p className="text-gray-600">Registros</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">{usuario.diasActivos}</p>
                    <p className="text-gray-600">Días</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}