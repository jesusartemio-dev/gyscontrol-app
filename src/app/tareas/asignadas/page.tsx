'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckSquare, TrendingUp, Filter } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TareasAsignadasDashboard } from '@/components/tareas/TareasAsignadasDashboard'

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

export default function TareasAsignadasPage() {
  const [tareas, setTareas] = useState<TareaAsignada[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Simulación de datos (reemplazar con API real)
  useEffect(() => {
    const tareasSimuladas: TareaAsignada[] = [
      {
        id: '1',
        nombre: 'Preparación cableado principal',
        tipo: 'tarea',
        proyectoNombre: 'Centro de Datos ABC',
        responsableNombre: 'Juan Pérez',
        fechaInicio: new Date('2025-01-10'),
        fechaFin: new Date('2025-01-20'),
        horasPlan: 8,
        horasReales: 6,
        progreso: 75,
        estado: 'en_progreso',
        prioridad: 'alta',
        diasRestantes: 3
      },
      {
        id: '2',
        nombre: 'Instalación eléctrica completa',
        tipo: 'actividad',
        proyectoNombre: 'Oficinas Corporativas XYZ',
        responsableNombre: 'María García',
        fechaInicio: new Date('2025-01-15'),
        fechaFin: new Date('2025-01-25'),
        horasPlan: 24,
        horasReales: 18,
        progreso: 75,
        estado: 'en_progreso',
        prioridad: 'media',
        diasRestantes: 8
      },
      {
        id: '3',
        nombre: 'Revisión final de sistemas',
        tipo: 'tarea',
        proyectoNombre: 'Centro de Datos ABC',
        responsableNombre: 'Carlos López',
        fechaInicio: new Date('2025-01-18'),
        fechaFin: new Date('2025-01-22'),
        horasPlan: 12,
        horasReales: 0,
        progreso: 0,
        estado: 'pendiente',
        prioridad: 'critica',
        diasRestantes: 5
      }
    ]
    setTareas(tareasSimuladas)
    setLoading(false)
  }, [])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Tareas Asignadas</h1>
          <p className="text-gray-600 mt-1">
            Gestiona tus tareas asignadas y registra horas trabajadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/tareas/progreso')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Ver Progreso
          </Button>
          <Button variant="outline" onClick={() => router.push('/tareas/equipo')}>
            <CheckSquare className="h-4 w-4 mr-2" />
            Ver Equipo
          </Button>
        </div>
      </div>

      {/* Información del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-lg font-semibold">Gestión Completa</p>
                <p className="text-sm text-gray-600">
                  Todas tus tareas asignadas en un solo lugar
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
                <p className="text-lg font-semibold">Seguimiento de Progreso</p>
                <p className="text-sm text-gray-600">
                  Monitorea el avance y fechas de vencimiento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-lg font-semibold">Filtros Inteligentes</p>
                <p className="text-sm text-gray-600">
                  Filtra por prioridad y estado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard de tareas asignadas */}
      <TareasAsignadasDashboard
        tareas={tareas}
        loading={loading}
      />
    </div>
  )
}