'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, TrendingUp, BarChart3 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { VistaEquipoDashboard } from '@/components/tareas/VistaEquipoDashboard'

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

export default function EquipoPage() {
  const [proyectos, setProyectos] = useState<ProyectoEquipo[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Simulación de datos
  useEffect(() => {
    const proyectosSimulados: ProyectoEquipo[] = [
      {
        nombre: 'Centro de Datos ABC',
        progresoGeneral: 75,
        horasTotales: 450,
        tareasTotales: 45,
        miembros: [
          {
            id: '1',
            nombre: 'Juan Pérez',
            rol: 'Ingeniero Senior',
            horasRegistradas: 85,
            horasObjetivo: 100,
            tareasCompletadas: 12,
            tareasAsignadas: 15,
            eficiencia: 85,
            estado: 'activo',
            ultimoRegistro: new Date('2025-01-15')
          },
          {
            id: '2',
            nombre: 'María García',
            rol: 'Coordinadora',
            horasRegistradas: 95,
            horasObjetivo: 100,
            tareasCompletadas: 18,
            tareasAsignadas: 20,
            eficiencia: 90,
            estado: 'activo',
            ultimoRegistro: new Date('2025-01-15')
          },
          {
            id: '3',
            nombre: 'Carlos López',
            rol: 'Técnico',
            horasRegistradas: 65,
            horasObjetivo: 80,
            tareasCompletadas: 8,
            tareasAsignadas: 10,
            eficiencia: 80,
            estado: 'activo',
            ultimoRegistro: new Date('2025-01-14')
          }
        ]
      },
      {
        nombre: 'Oficinas Corporativas XYZ',
        progresoGeneral: 60,
        horasTotales: 280,
        tareasTotales: 32,
        miembros: [
          {
            id: '4',
            nombre: 'Ana Rodríguez',
            rol: 'Ingeniera Junior',
            horasRegistradas: 45,
            horasObjetivo: 60,
            tareasCompletadas: 6,
            tareasAsignadas: 12,
            eficiencia: 50,
            estado: 'activo',
            ultimoRegistro: new Date('2025-01-13')
          },
          {
            id: '5',
            nombre: 'Pedro Sánchez',
            rol: 'Supervisor',
            horasRegistradas: 75,
            horasObjetivo: 80,
            tareasCompletadas: 14,
            tareasAsignadas: 16,
            eficiencia: 88,
            estado: 'activo',
            ultimoRegistro: new Date('2025-01-15')
          }
        ]
      }
    ]

    setProyectos(proyectosSimulados)
    setLoading(false)
  }, [])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipo</h1>
          <p className="text-gray-600 mt-1">
            Monitorea el rendimiento y progreso de tu equipo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/tareas/asignadas')}>
            <Users className="h-4 w-4 mr-2" />
            Ver Tareas
          </Button>
          <Button variant="outline" onClick={() => router.push('/tareas/progreso')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Ver Progreso
          </Button>
        </div>
      </div>

      {/* Información del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-lg font-semibold">Gestión de Equipo</p>
                <p className="text-sm text-gray-600">
                  Monitoreo completo del rendimiento del equipo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-lg font-semibold">Alertas Inteligentes</p>
                <p className="text-sm text-gray-600">
                  Notificaciones de bajo rendimiento y registros pendientes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-lg font-semibold">Análisis Multivista</p>
                <p className="text-sm text-gray-600">
                  Vista general, por proyecto y por miembro
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard de vista de equipo */}
      <VistaEquipoDashboard
        proyectos={proyectos}
        loading={loading}
      />
    </div>
  )
}