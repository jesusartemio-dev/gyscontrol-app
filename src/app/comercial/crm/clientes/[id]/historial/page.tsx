'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, History, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import HistorialProyectoList from '@/components/crm/historial/HistorialProyectoList'

interface Cliente {
  id: string
  nombre: string
  codigo: string
}

interface Estadisticas {
  totalProyectos: number
  totalCotizaciones: number
  totalRegistrosHistorial: number
  valorTotalProyectos: number
  valorTotalCotizaciones: number
  proyectosActivos: number
  cotizacionesPendientes: number
}

interface RegistroHistorial {
  id: string
  tipo: 'proyecto' | 'cotizacion' | 'historial'
  titulo: string
  codigo: string | null
  estado: string
  fechaInicio: string | null
  fechaFin: string | null
  valor: number | null
  responsable: string | null
  createdAt: string
  sector?: string
  complejidad?: string
  duracionDias?: number
  calificacionCliente?: number
  exitos?: string
  problemas?: string
}

interface HistorialData {
  cliente: Cliente
  estadisticas: Estadisticas
  registros: RegistroHistorial[]
  filtros: {
    tipo: string
    totalRegistros: number
  }
}

export default function HistorialClientePage() {
  const { id } = useParams()
  const router = useRouter()
  const clienteId = id as string

  const [historialData, setHistorialData] = useState<HistorialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (clienteId) {
      loadHistorialData()
    }
  }, [clienteId])

  const loadHistorialData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/crm/clientes/${clienteId}/historial`)
      if (!response.ok) {
        throw new Error('Error al cargar el historial del cliente')
      }

      const data = await response.json()
      setHistorialData(data)
    } catch (err) {
      console.error('Error loading historial data:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar los datos del historial')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando historial de proyectos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={loadHistorialData} variant="outline">
            Intentar de nuevo
          </Button>
        </div>
      </div>
    )
  }

  if (!historialData) return null

  return (
    <motion.div
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header con navegación */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="h-6 w-px bg-border" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Historial de Proyectos - {historialData.cliente.nombre}
          </h1>
          <p className="text-muted-foreground">
            Registro completo de proyectos y cotizaciones - Cliente {historialData.cliente.codigo}
          </p>
        </div>
      </div>

      {/* Información del cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Resumen Histórico del Cliente
          </CardTitle>
          <CardDescription>
            Estadísticas generales del historial de proyectos y cotizaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {historialData.estadisticas.totalProyectos}
              </div>
              <div className="text-sm text-blue-600">Proyectos Totales</div>
              <div className="text-xs text-blue-500 mt-1">
                {historialData.estadisticas.proyectosActivos} activos
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {historialData.estadisticas.totalCotizaciones}
              </div>
              <div className="text-sm text-green-600">Cotizaciones</div>
              <div className="text-xs text-green-500 mt-1">
                {historialData.estadisticas.cotizacionesPendientes} pendientes
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {historialData.estadisticas.totalRegistrosHistorial}
              </div>
              <div className="text-sm text-purple-600">Registros Históricos</div>
              <div className="text-xs text-purple-500 mt-1">
                Información detallada
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {historialData.filtros.totalRegistros}
              </div>
              <div className="text-sm text-orange-600">Registros Mostrados</div>
              <div className="text-xs text-orange-500 mt-1">
                {historialData.filtros.tipo === 'todos' ? 'Todos los tipos' : `Solo ${historialData.filtros.tipo}`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista del historial */}
      <HistorialProyectoList
        registros={historialData.registros}
        estadisticas={historialData.estadisticas}
        clienteNombre={historialData.cliente.nombre}
        loading={false}
      />
    </motion.div>
  )
}