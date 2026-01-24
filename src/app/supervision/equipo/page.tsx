'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, TrendingUp, BarChart3, AlertCircle, Download, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/use-toast'
import { VistaEquipoDashboard } from '@/components/tareas/VistaEquipoDashboard'
import { format } from 'date-fns'

interface MiembroEquipo {
  id: string
  nombre: string
  email: string
  rol: string
  horasRegistradas: number
  horasObjetivo: number
  tareasCompletadas: number
  tareasAsignadas: number
  eficiencia: number
  estado: 'activo' | 'inactivo' | 'vacaciones'
  ultimoRegistro: Date | null
  proyectosActivos: number
}

interface ProyectoEquipo {
  id: string
  nombre: string
  codigo: string
  miembros: MiembroEquipo[]
  horasTotales: number
  tareasTotales: number
  tareasCompletadas: number
  progresoGeneral: number
}

interface MetricasEquipo {
  totalMiembros: number
  miembrosActivos: number
  horasTotalesEquipo: number
  tareasTotalesEquipo: number
  tareasCompletadasEquipo: number
  eficienciaPromedio: number
  progresoPromedioProyectos: number
  proyectosActivos: number
}

interface AlertasEquipo {
  bajoRendimiento: number
  sinRegistroReciente: number
}

export default function VistaEquipoPage() {
  const [proyectos, setProyectos] = useState<ProyectoEquipo[]>([])
  const [miembros, setMiembros] = useState<MiembroEquipo[]>([])
  const [metricas, setMetricas] = useState<MetricasEquipo | null>(null)
  const [alertas, setAlertas] = useState<AlertasEquipo | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()

  // Cargar datos del equipo
  const cargarEquipo = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tareas/equipo')

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: 'No autorizado',
            description: 'Debe iniciar sesion para ver el equipo',
            variant: 'destructive'
          })
          return
        }
        if (response.status === 403) {
          toast({
            title: 'Sin permisos',
            description: 'No tiene permisos para ver el equipo',
            variant: 'destructive'
          })
          return
        }
        throw new Error('Error al cargar equipo')
      }

      const data = await response.json()

      if (data.success) {
        setProyectos(data.data.proyectos)
        setMiembros(data.data.miembros)
        setMetricas(data.data.metricas)
        setAlertas(data.data.alertas)
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (error) {
      console.error('Error cargando equipo:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar la informacion del equipo',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos cuando hay sesion
  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      toast({
        title: 'No autenticado',
        description: 'Debe iniciar sesion para acceder a esta pagina',
        variant: 'destructive'
      })
      setLoading(false)
      return
    }

    cargarEquipo()
  }, [status, session])

  // Exportar a CSV
  const exportarCSV = () => {
    if (miembros.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay datos para exportar',
        variant: 'destructive'
      })
      return
    }

    const csvRows = [
      '=== METRICAS DEL EQUIPO ===',
      `Fecha de exportacion,${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      `Total Miembros,${metricas?.totalMiembros || 0}`,
      `Miembros Activos,${metricas?.miembrosActivos || 0}`,
      `Horas Totales,${metricas?.horasTotalesEquipo || 0}`,
      `Tareas Totales,${metricas?.tareasTotalesEquipo || 0}`,
      `Tareas Completadas,${metricas?.tareasCompletadasEquipo || 0}`,
      `Eficiencia Promedio,${metricas?.eficienciaPromedio || 0}%`,
      `Proyectos Activos,${metricas?.proyectosActivos || 0}`,
      '',
      '=== MIEMBROS DEL EQUIPO ===',
      'Nombre,Email,Rol,Horas Registradas,Horas Objetivo,Tareas Completadas,Tareas Asignadas,Eficiencia,Estado,Ultimo Registro,Proyectos Activos'
    ]

    miembros.forEach(m => {
      const ultimoReg = m.ultimoRegistro ? format(new Date(m.ultimoRegistro), 'dd/MM/yyyy') : 'Sin registro'
      csvRows.push(
        `"${m.nombre}","${m.email}","${m.rol}",${m.horasRegistradas},${m.horasObjetivo},${m.tareasCompletadas},${m.tareasAsignadas},${m.eficiencia}%,"${m.estado}","${ultimoReg}",${m.proyectosActivos}`
      )
    })

    csvRows.push('')
    csvRows.push('=== PROYECTOS ===')
    csvRows.push('Codigo,Proyecto,Miembros,Horas Totales,Tareas Totales,Tareas Completadas,Progreso')

    proyectos.forEach(p => {
      csvRows.push(
        `"${p.codigo}","${p.nombre}",${p.miembros.length},${p.horasTotales},${p.tareasTotales},${p.tareasCompletadas},${p.progresoGeneral}%`
      )
    })

    const csvContent = csvRows.join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `equipo-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Exportado',
      description: 'Archivo CSV descargado correctamente'
    })
  }

  // Si no hay sesion, mostrar mensaje
  if (!session?.user && status !== 'loading') {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Acceso Denegado
              </h2>
              <p className="text-gray-600">
                Debe iniciar sesion para ver el equipo.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vista de Equipo</h1>
          <p className="text-gray-600 mt-1">
            Monitorea el rendimiento y progreso de tu equipo
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportarCSV}
            disabled={miembros.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => router.push('/supervision/resumen')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Resumen Proyectos
          </Button>
          <Button variant="outline" onClick={() => router.push('/supervision/analisis-edt')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Analisis EDT
          </Button>
        </div>
      </div>

      {/* Informacion del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-lg font-semibold">Gestion de Equipo</p>
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
                <p className="text-lg font-semibold">Analisis Multivista</p>
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
        metricas={metricas}
        alertas={alertas}
        loading={loading}
        onRecargar={cargarEquipo}
      />
    </div>
  )
}
