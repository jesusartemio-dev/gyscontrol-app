'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Search, History } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ListaHistorialHoras } from '@/components/horas-hombre/ListaHistorialHoras'

interface RegistroHoras {
  id: string
  fecha: Date
  horas: number
  descripcion: string
  nivel: 'proyecto' | 'fase' | 'edt' | 'actividad' | 'tarea'
  elementoNombre: string
  proyectoNombre: string
  aprobado: boolean
}

export default function HistorialHorasPage() {
  const [registros, setRegistros] = useState<RegistroHoras[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Cargar datos reales desde la API
  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/horas-hombre/historial')
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        if (data.success) {
          setRegistros(data.data)
        } else {
          throw new Error(data.error || 'Error desconocido')
        }
      } catch (error) {
        console.error('Error cargando historial:', error)
        setRegistros([])
      } finally {
        setLoading(false)
      }
    }
    
    cargarHistorial()
  }, [])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historial de Horas</h1>
          <p className="text-gray-600 mt-1">
            Revisa todos tus registros de horas trabajadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/horas-hombre/timesheet')}>
            <History className="h-4 w-4 mr-2" />
            Ver Timesheet
          </Button>
          <Button variant="outline" onClick={() => router.push('/horas-hombre/registro')}>
            <Clock className="h-4 w-4 mr-2" />
            Registrar Horas
          </Button>
        </div>
      </div>

      {/* Información del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-lg font-semibold">Historial Completo</p>
                <p className="text-sm text-gray-600">
                  Todos tus registros de horas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Search className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-lg font-semibold">Búsqueda Avanzada</p>
                <p className="text-sm text-gray-600">
                  Filtros por fecha, proyecto y nivel
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <History className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-lg font-semibold">Exportación</p>
                <p className="text-sm text-gray-600">
                  Descarga en formato CSV
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Componente de historial */}
      <ListaHistorialHoras
        registros={registros}
        loading={loading}
        onExport={() => {
          // Manejar callback de exportación
          console.log('Exportación completada')
        }}
      />
    </div>
  )
}