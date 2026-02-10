'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, Search, Phone, Mail, Calendar, MessageSquare, Clock, TrendingUp, TrendingDown, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getAllActividades, CrmActividad, TIPOS_ACTIVIDAD, RESULTADOS_ACTIVIDAD } from '@/lib/services/crm/actividades'

interface ActividadExtendida extends CrmActividad {
  crmOportunidad?: {
    id: string
    nombre: string
    cliente?: { id: string; nombre: string; codigo: string }
  }
}

interface Estadisticas {
  total: number
  estaSemana: number
  semanaAnterior: number
  cambioSemanal: number
  porTipo: Record<string, number>
  porResultado: Record<string, number>
  porUsuario: Array<{ usuarioId: string; nombre: string; cantidad: number }>
}

export default function CrmActividadesPage() {
  const router = useRouter()
  const { status } = useSession()
  const [actividades, setActividades] = useState<ActividadExtendida[]>([])
  const [loading, setLoading] = useState(true)
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [resultadoFilter, setResultadoFilter] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const loadActividades = async () => {
      try {
        setLoading(true)
        const filters: any = {}
        if (tipoFilter !== 'todos') filters.tipo = tipoFilter
        if (resultadoFilter !== 'todos') filters.resultado = resultadoFilter
        if (searchTerm) filters.search = searchTerm

        const response = await getAllActividades(filters, { page, limit: 50 })
        setActividades(response.data as ActividadExtendida[])
        setEstadisticas(response.estadisticas as unknown as Estadisticas)
        if (response.pagination) {
          setTotalPages(response.pagination.pages)
        }
      } catch (err) {
        console.error('Error loading actividades:', err)
      } finally {
        setLoading(false)
      }
    }

    loadActividades()
  }, [tipoFilter, resultadoFilter, searchTerm, page])

  const getTipoIcon = (tipo: string) => {
    const icons: Record<string, typeof Phone> = {
      [TIPOS_ACTIVIDAD.LLAMADA]: Phone,
      [TIPOS_ACTIVIDAD.EMAIL]: Mail,
      [TIPOS_ACTIVIDAD.REUNION]: Calendar
    }
    return icons[tipo] || MessageSquare
  }

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      [TIPOS_ACTIVIDAD.LLAMADA]: 'Llamada',
      [TIPOS_ACTIVIDAD.EMAIL]: 'Email',
      [TIPOS_ACTIVIDAD.REUNION]: 'Reunión',
      [TIPOS_ACTIVIDAD.PROPUESTA]: 'Propuesta',
      [TIPOS_ACTIVIDAD.SEGUIMIENTO]: 'Seguimiento',
      [TIPOS_ACTIVIDAD.VISITA]: 'Visita',
      [TIPOS_ACTIVIDAD.DEMOSTRACION]: 'Demo'
    }
    return labels[tipo] || tipo
  }

  const getResultadoColor = (resultado?: string) => {
    if (!resultado) return 'text-muted-foreground'
    const colors: Record<string, string> = {
      [RESULTADOS_ACTIVIDAD.POSITIVO]: 'text-green-600',
      [RESULTADOS_ACTIVIDAD.NEGATIVO]: 'text-red-600',
      [RESULTADOS_ACTIVIDAD.NEUTRO]: 'text-yellow-600',
      [RESULTADOS_ACTIVIDAD.PENDIENTE]: 'text-muted-foreground'
    }
    return colors[resultado] || 'text-muted-foreground'
  }

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha)
    const ahora = new Date()
    const diffMs = ahora.getTime() - date.getTime()
    const diffHoras = diffMs / (1000 * 60 * 60)
    const diffDias = diffMs / (1000 * 60 * 60 * 24)

    if (diffHoras < 1) return 'Hace <1h'
    if (diffHoras < 24) return `Hace ${Math.floor(diffHoras)}h`
    if (diffDias < 7) return `Hace ${Math.floor(diffDias)}d`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  if (loading || status === 'loading') {
    return (
      <div className="p-4 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  const totalTipo = estadisticas?.porTipo ? Object.values(estadisticas.porTipo).reduce((a, b) => a + b, 0) : 0
  const totalResultado = estadisticas?.porResultado ? Object.values(estadisticas.porResultado).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Actividades</h1>
        <p className="text-sm text-muted-foreground">Historial de actividades comerciales</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{estadisticas?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Esta Semana</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{estadisticas?.estaSemana || 0}</p>
              {estadisticas?.cambioSemanal !== undefined && estadisticas.cambioSemanal !== 0 && (
                <span className={`text-xs flex items-center ${estadisticas.cambioSemanal > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {estadisticas.cambioSemanal > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(estadisticas.cambioSemanal)}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">vs {estadisticas?.semanaAnterior || 0} sem. anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Positivos</p>
            <p className="text-2xl font-bold text-green-600">{estadisticas?.porResultado?.positivo || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-bold text-orange-600">{estadisticas?.porResultado?.pendiente || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas detalladas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Por Tipo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {estadisticas?.porTipo && Object.entries(estadisticas.porTipo).map(([tipo, cantidad]) => {
              const percent = totalTipo > 0 ? (cantidad / totalTipo) * 100 : 0
              return (
                <div key={tipo} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{getTipoLabel(tipo)}</span>
                    <span className="text-muted-foreground">{cantidad}</span>
                  </div>
                  <Progress value={percent} className="h-1.5" />
                </div>
              )
            })}
            {(!estadisticas?.porTipo || Object.keys(estadisticas.porTipo).length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-2">Sin datos</p>
            )}
          </CardContent>
        </Card>

        {/* Por Resultado */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Por Resultado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {estadisticas?.porResultado && Object.entries(estadisticas.porResultado).map(([resultado, cantidad]) => {
              const percent = totalResultado > 0 ? (cantidad / totalResultado) * 100 : 0
              const colorClass = resultado === 'positivo' ? 'text-green-600' :
                                 resultado === 'negativo' ? 'text-red-600' :
                                 resultado === 'neutro' ? 'text-yellow-600' : 'text-muted-foreground'
              return (
                <div key={resultado} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className={`capitalize ${colorClass}`}>{resultado}</span>
                    <span className="text-muted-foreground">{cantidad}</span>
                  </div>
                  <Progress value={percent} className="h-1.5" />
                </div>
              )
            })}
            {(!estadisticas?.porResultado || Object.keys(estadisticas.porResultado).length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-2">Sin datos</p>
            )}
          </CardContent>
        </Card>

        {/* Top Usuarios este mes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Top Comerciales (mes)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {estadisticas?.porUsuario && estadisticas.porUsuario.length > 0 ? (
              estadisticas.porUsuario.map((user, idx) => {
                const maxCantidad = estadisticas.porUsuario[0]?.cantidad || 1
                const percent = (user.cantidad / maxCantidad) * 100
                return (
                  <div key={user.usuarioId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate">
                        <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                        {user.nombre}
                      </span>
                      <span className="font-medium">{user.cantidad}</span>
                    </div>
                    <Progress value={percent} className="h-1.5" />
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">Sin datos</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
            className="pl-8 h-9"
          />
        </div>
        <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value={TIPOS_ACTIVIDAD.LLAMADA}>Llamadas</SelectItem>
            <SelectItem value={TIPOS_ACTIVIDAD.EMAIL}>Emails</SelectItem>
            <SelectItem value={TIPOS_ACTIVIDAD.REUNION}>Reuniones</SelectItem>
            <SelectItem value={TIPOS_ACTIVIDAD.PROPUESTA}>Propuestas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resultadoFilter} onValueChange={(v) => { setResultadoFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Resultado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value={RESULTADOS_ACTIVIDAD.POSITIVO}>Positivo</SelectItem>
            <SelectItem value={RESULTADOS_ACTIVIDAD.NEGATIVO}>Negativo</SelectItem>
            <SelectItem value={RESULTADOS_ACTIVIDAD.NEUTRO}>Neutro</SelectItem>
            <SelectItem value={RESULTADOS_ACTIVIDAD.PENDIENTE}>Pendiente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de actividades */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Historial Reciente</CardTitle>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Pág. {page} de {totalPages}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {actividades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay actividades</p>
            </div>
          ) : (
            <div className="divide-y">
              {actividades.map((actividad) => {
                const TipoIcon = getTipoIcon(actividad.tipo)
                return (
                  <div
                    key={actividad.id}
                    className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors"
                  >
                    <TipoIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getTipoLabel(actividad.tipo)}
                        </Badge>
                        {actividad.resultado && (
                          <span className={`text-xs ${getResultadoColor(actividad.resultado)}`}>
                            {actividad.resultado}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-1 truncate">{actividad.descripcion}</p>
                      {actividad.crmOportunidad && (
                        <p
                          className="text-xs text-blue-600 hover:underline cursor-pointer truncate"
                          onClick={() => router.push(`/crm/oportunidades/${actividad.oportunidadId}`)}
                        >
                          {actividad.crmOportunidad.nombre}
                          {actividad.crmOportunidad.cliente && ` - ${actividad.crmOportunidad.cliente.nombre}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatFecha(actividad.fecha)}
                      </span>
                      {actividad.user?.name && (
                        <p className="text-xs text-muted-foreground mt-1">{actividad.user.name}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
