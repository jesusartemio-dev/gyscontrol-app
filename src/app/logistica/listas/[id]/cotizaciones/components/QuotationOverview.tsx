'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart3, Mail, CheckCircle, AlertTriangle, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react'
import Link from 'next/link'

interface QuotationStats {
  totalItems: number
  withQuotations: number
  receivedQuotations: number
  selectedCount: number
  completionPercentage: number
}

interface ListaInfo {
  id: string
  codigo: string
  nombre: string
  estado: string
  proyecto: {
    id: string
    codigo: string
    nombre: string
  }
  items: any[]
}

export default function QuotationOverview({ listaId }: { listaId: string }) {
  const [stats, setStats] = useState<QuotationStats | null>(null)
  const [listaInfo, setListaInfo] = useState<ListaInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuotationStats()
  }, [listaId])

  const fetchQuotationStats = async () => {
    try {
      const response = await fetch(`/api/logistica/listas/${listaId}/cotizaciones/dashboard`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setListaInfo(data.lista)
      }
    } catch (error) {
      console.error('Error fetching quotation stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Project and List Information */}
      {listaInfo && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-gray-900">{listaInfo.nombre}</h2>
                  <Badge variant="outline" className="bg-white">
                    {listaInfo.codigo}
                  </Badge>
                </div>
                <p className="text-gray-600">
                  Proyecto: <span className="font-medium">{listaInfo.proyecto.nombre}</span>
                  <span className="mx-2">•</span>
                  Código: <span className="font-mono">{listaInfo.proyecto.codigo}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/logistica/listas/${listaId}`}>
                    Ver Lista Completa
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/proyectos/${listaInfo.proyecto.id}`}>
                    Ver Proyecto
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Welcome Message */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">Vista General de Cotizaciones</h2>
        <p className="text-gray-600">
          Estado actual del proceso de cotización para esta lista técnica
        </p>
      </div>

      {/* Quick Actions Banner */}
      {stats.totalItems > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-green-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900">Acciones Rápidas</h3>
                  <p className="text-sm text-green-700">
                    {stats.receivedQuotations === 0
                      ? "Necesitas solicitar cotizaciones a proveedores"
                      : stats.selectedCount === 0
                      ? `${stats.receivedQuotations} cotizaciones listas para selección`
                      : `${stats.selectedCount} ganadores seleccionados - listo para pedidos`
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {stats.receivedQuotations > 0 && stats.selectedCount === 0 && (
                  <Button size="sm" asChild className="bg-green-600 hover:bg-green-700">
                    <Link href={`/logistica/listas/${listaId}/cotizaciones?tab=seleccionar`}>
                      🏆 Seleccionar Ahora
                    </Link>
                  </Button>
                )}
                {stats.selectedCount > 0 && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/logistica/listas/${listaId}`}>
                      📦 Crear Pedidos
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {stats.totalItems === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay items en esta lista
            </h3>
            <p className="text-gray-600 text-center mb-4">
              Esta lista técnica no tiene items para cotizar aún.
              Los items se agregan desde el módulo de proyectos.
            </p>
            <Button variant="outline" asChild>
              <Link href={`/logistica/listas/${listaId}`}>
                Ver Lista Técnica
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Items Totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalItems}
                </div>
                <p className="text-xs text-muted-foreground">
                  Items en la lista técnica
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Con Cotizaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.withQuotations}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalItems > 0 ? Math.round((stats.withQuotations / stats.totalItems) * 100) : 0}% tienen cotizaciones
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Cotizaciones Recibidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.receivedQuotations}
                </div>
                <p className="text-xs text-muted-foreground">
                  Proveedores han cotizado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Seleccionadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.selectedCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ganadoras elegidas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Estado del Proceso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completado:</span>
                    <span className="font-medium">{stats.completionPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pendiente:</span>
                    <span className="font-medium">{(100 - stats.completionPercentage).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Próximos Pasos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  {stats.withQuotations === 0 && (
                    <p className="text-orange-600">• Solicitar cotizaciones a proveedores</p>
                  )}
                  {stats.withQuotations > 0 && stats.receivedQuotations === 0 && (
                    <p className="text-blue-600">• Esperar respuesta de proveedores</p>
                  )}
                  {stats.receivedQuotations > 0 && stats.selectedCount === 0 && (
                    <p className="text-green-600">• Seleccionar cotizaciones ganadoras</p>
                  )}
                  {stats.selectedCount > 0 && (
                    <p className="text-purple-600">• Crear pedidos de compra</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Acciones Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link href={`/logistica/listas/${listaId}/cotizaciones?tab=actualizar`}>
                      📝 Actualizar Cotizaciones
                    </Link>
                  </Button>
                  {stats.receivedQuotations > 0 && (
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link href={`/logistica/listas/${listaId}/cotizaciones?tab=seleccionar`}>
                        🏆 Seleccionar Ganadores
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <Link href={`/logistica/listas/${listaId}`}>
                      ➕ Crear Nueva Cotización
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Progress Visualization - Only show if there are items */}
      {stats.totalItems > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Progreso del Proceso de Cotización</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Completitud general</span>
                  <span className="font-medium">{stats.completionPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${stats.completionPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.selectedCount}</div>
                  <div className="text-xs text-green-700 font-medium">Seleccionadas</div>
                  <div className="text-xs text-green-600">Listas para pedidos</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.receivedQuotations - stats.selectedCount}</div>
                  <div className="text-xs text-blue-700 font-medium">Por Seleccionar</div>
                  <div className="text-xs text-blue-600">Esperando decisión</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{stats.withQuotations - stats.receivedQuotations}</div>
                  <div className="text-xs text-yellow-700 font-medium">Pendientes</div>
                  <div className="text-xs text-yellow-600">Esperando cotización</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{stats.totalItems - stats.withQuotations}</div>
                  <div className="text-xs text-gray-700 font-medium">Sin Cotización</div>
                  <div className="text-xs text-gray-600">Requieren acción</div>
                </div>
              </div>

              {/* Process Flow Visualization */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3">Flujo del Proceso</h4>
                <div className="flex items-center justify-between text-xs">
                  <div className={`flex flex-col items-center p-2 rounded ${stats.totalItems > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                    <div className="font-medium">Items</div>
                    <div>({stats.totalItems})</div>
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
                  <div className={`flex flex-col items-center p-2 rounded ${stats.withQuotations > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-500'}`}>
                    <div className="font-medium">Cotizando</div>
                    <div>({stats.withQuotations})</div>
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
                  <div className={`flex flex-col items-center p-2 rounded ${stats.receivedQuotations > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    <div className="font-medium">Recibidas</div>
                    <div>({stats.receivedQuotations})</div>
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
                  <div className={`flex flex-col items-center p-2 rounded ${stats.selectedCount > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500'}`}>
                    <div className="font-medium">Seleccionadas</div>
                    <div>({stats.selectedCount})</div>
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
                  <div className={`flex flex-col items-center p-2 rounded ${stats.selectedCount > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-500'}`}>
                    <div className="font-medium">Pedidos</div>
                    <div>(Próximo)</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}