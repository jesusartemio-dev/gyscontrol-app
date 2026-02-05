'use client'

/**
 * Página de Registro de Horas en Campo
 * Permite a supervisores/coordinadores registrar horas de cuadrilla
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MapPin,
  Plus,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Building,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { RegistroCampoWizard } from '@/components/horas-hombre/RegistroCampoWizard'

interface MiRegistro {
  id: string
  fechaTrabajo: string
  descripcion: string | null
  ubicacion: string | null
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  motivoRechazo: string | null
  createdAt: string
  proyecto: { id: string; codigo: string; nombre: string }
  proyectoEdt: { id: string; nombre: string } | null
  aprobadoPor: { id: string; name: string | null } | null
  cantidadTareas: number
  cantidadMiembros: number
  totalHoras: number
}

export default function RegistroCampoPage() {
  const { toast } = useToast()
  const [registros, setRegistros] = useState<MiRegistro[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [stats, setStats] = useState({
    pendientes: 0,
    aprobados: 0,
    rechazados: 0,
    total: 0
  })

  useEffect(() => {
    cargarMisRegistros()
  }, [])

  const cargarMisRegistros = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/horas-hombre/campo/mis-registros')

      if (!response.ok) throw new Error('Error cargando registros')

      const data = await response.json()
      setRegistros(data.data || [])
      setStats(data.stats || { pendientes: 0, aprobados: 0, rechazados: 0, total: 0 })

    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los registros',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWizardSuccess = () => {
    cargarMisRegistros()
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge className="bg-amber-100 text-amber-800">Pendiente</Badge>
      case 'aprobado':
        return <Badge className="bg-green-100 text-green-800">Aprobado</Badge>
      case 'rechazado':
        return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>
      default:
        return <Badge>{estado}</Badge>
    }
  }

  const filtrarPorEstado = (estado: string) => {
    if (estado === 'todos') return registros
    return registros.filter(r => r.estado === estado)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-green-600" />
            Registro de Horas en Campo
          </h1>
          <p className="text-sm text-gray-500">
            Registra las horas de trabajo de tu cuadrilla en campo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargarMisRegistros} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={() => setShowWizard(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Registro
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Clock className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-gray-500">Total registros</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendientes}</p>
              <p className="text-xs text-gray-500">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.aprobados}</p>
              <p className="text-xs text-gray-500">Aprobados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.rechazados}</p>
              <p className="text-xs text-gray-500">Rechazados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de registros */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Registros</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="todos">
            <TabsList className="mb-4">
              <TabsTrigger value="todos">Todos ({stats.total})</TabsTrigger>
              <TabsTrigger value="pendiente">Pendientes ({stats.pendientes})</TabsTrigger>
              <TabsTrigger value="aprobado">Aprobados ({stats.aprobados})</TabsTrigger>
              <TabsTrigger value="rechazado">Rechazados ({stats.rechazados})</TabsTrigger>
            </TabsList>

            {['todos', 'pendiente', 'aprobado', 'rechazado'].map(tab => (
              <TabsContent key={tab} value={tab}>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mr-3" />
                    <span>Cargando...</span>
                  </div>
                ) : filtrarPorEstado(tab).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p>No hay registros {tab !== 'todos' ? tab + 's' : ''}</p>
                    {tab === 'todos' && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setShowWizard(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Crear primer registro
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtrarPorEstado(tab).map(registro => (
                      <div
                        key={registro.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="bg-blue-50">
                                <Building className="h-3 w-3 mr-1" />
                                {registro.proyecto.codigo}
                              </Badge>
                              {registro.proyectoEdt && (
                                <Badge variant="outline">
                                  {registro.proyectoEdt.nombre}
                                </Badge>
                              )}
                              {getEstadoBadge(registro.estado)}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(registro.fechaTrabajo), 'dd/MM/yyyy', { locale: es })}
                              </div>
                              <div className="flex items-center gap-1 text-purple-600">
                                {registro.cantidadTareas} tarea(s)
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {registro.cantidadMiembros} persona(s)
                              </div>
                              <div className="flex items-center gap-1 text-green-600 font-medium">
                                <Clock className="h-4 w-4" />
                                {registro.totalHoras}h total
                              </div>
                              {registro.ubicacion && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {registro.ubicacion}
                                </div>
                              )}
                            </div>

                            {registro.estado === 'rechazado' && registro.motivoRechazo && (
                              <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                                <strong>Motivo:</strong> {registro.motivoRechazo}
                              </div>
                            )}

                            {registro.estado === 'aprobado' && registro.aprobadoPor && (
                              <div className="mt-2 text-xs text-gray-500">
                                Aprobado por: {registro.aprobadoPor.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Wizard */}
      <RegistroCampoWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onSuccess={handleWizardSuccess}
      />
    </div>
  )
}
