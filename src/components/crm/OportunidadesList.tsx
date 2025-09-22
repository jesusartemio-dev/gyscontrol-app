'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  Edit3,
  Trash2,
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
  User,
  TrendingUp,
  AlertCircle,
  Loader2,
  FileText,
  CheckCircle,
  Clock,
  Target,
  Users,
  Phone,
  Mail,
  Handshake
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  getOportunidades,
  CrmOportunidad,
  CrmOportunidadFilters,
  CrmOportunidadPagination,
  CRM_ESTADOS_OPORTUNIDAD,
  CRM_PRIORIDADES
} from '@/lib/services/crm'
import CrearProyectoDesdeCotizacionModal from '@/components/proyectos/CrearProyectoDesdeCotizacionModal'
import { getCotizacionById } from '@/lib/services/cotizacion'
import { getProyectos } from '@/lib/services/proyecto'
import type { Proyecto } from '@/types'
import { useRouter } from 'next/navigation'

interface Props {
  onView?: (oportunidad: CrmOportunidad) => void
  onEdit?: (oportunidad: CrmOportunidad) => void
  onDelete?: (oportunidad: CrmOportunidad) => void
  onCreate?: () => void
  onCreateCotizacion?: (oportunidad: CrmOportunidad) => void
}

// ✅ Formateadores de utilidad
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// ✅ Componente de estado de carga
const OportunidadSkeleton = () => (
  <Card className="mb-2">
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
    </CardHeader>
    <CardContent className="pt-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-6 w-12" />
      </div>
    </CardContent>
  </Card>
)

// ✅ Componente de estado vacío
const EmptyState = ({ onCreate }: { onCreate?: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-12"
  >
    <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
      <TrendingUp className="h-12 w-12 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">
      No hay oportunidades disponibles
    </h3>
    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
      Comienza creando tu primera oportunidad para gestionar tus proyectos comerciales.
    </p>
    {onCreate && (
      <Button onClick={onCreate}>
        <Plus className="h-4 w-4 mr-2" />
        Crear Primera Oportunidad
      </Button>
    )}
  </motion.div>
)

// ✅ Estados mejorados con iconos y colores
const getEstadoAvanzado = (estado: string, cotizacion?: any) => {
  const estados = {
    prospecto: { label: 'Prospecto', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Users, iconColor: 'text-gray-500' },
    contacto_inicial: { label: 'Contacto Inicial', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Phone, iconColor: 'text-blue-500' },
    propuesta_enviada: { label: 'Propuesta Enviada', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Mail, iconColor: 'text-yellow-500' },
    negociacion: { label: 'En Negociación', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Handshake, iconColor: 'text-orange-500' },
    cerrada_ganada: { label: 'Cerrada - Ganada', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, iconColor: 'text-green-500' },
    cerrada_perdida: { label: 'Cerrada - Perdida', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle, iconColor: 'text-red-500' },
    // Legacy support for old state names
    cotizacion: { label: 'Propuesta Enviada', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Mail, iconColor: 'text-yellow-500' },
    ganada: { label: 'Cerrada - Ganada', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, iconColor: 'text-green-500' },
    perdida: { label: 'Cerrada - Perdida', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle, iconColor: 'text-red-500' }
  }

  // Estados mejorados basados en cotización
  if (cotizacion) {
    if (cotizacion.estado === 'aprobada' && estado === 'ganada') {
      return { label: 'Listo para Proyecto', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Target, iconColor: 'text-purple-500' }
    }
    if (cotizacion.estado === 'aprobada') {
      return { label: 'Cotización Aprobada', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, iconColor: 'text-green-500' }
    }
    return { label: `Cotización: ${cotizacion.estado}`, color: 'bg-blue-100 text-blue-800 border-blue-200', icon: FileText, iconColor: 'text-blue-500' }
  }

  return estados[estado as keyof typeof estados] || estados.prospecto
}

// ✅ Función para detectar proyecto existente
const detectarProyectoExistente = async (cotizacionId: string): Promise<Proyecto | null> => {
  try {
    const proyectos = await getProyectos()
    return proyectos.find(p => p.cotizacionId === cotizacionId) || null
  } catch (error) {
    console.error('Error detectando proyecto existente:', error)
    return null
  }
}

// ✅ Componente para mostrar información del proyecto
function ProyectoInfo({ proyecto }: { proyecto: Proyecto }) {
  const router = useRouter()
  const Icon = getEstadoAvanzado(proyecto.estado).icon

  return (
    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-green-900 truncate">
          Proyecto: {proyecto.nombre}
        </p>
        <p className="text-xs text-green-700">
          Código: {proyecto.codigo} • Estado: {proyecto.estado}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/proyectos/${proyecto.id}`)}
        className="text-xs h-7 px-2 flex-shrink-0"
      >
        <Eye className="h-3 w-3 mr-1" />
        Ver Proyecto
      </Button>
    </div>
  )
}

// ✅ Componente de filtros avanzados
function FiltrosAvanzados({
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters
}: {
  filters: CrmOportunidadFilters
  onFiltersChange: (filters: CrmOportunidadFilters) => void
  onApplyFilters: () => void
  onClearFilters: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  const handleFilterChange = (key: keyof CrmOportunidadFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const filtrosActivos = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search') return false
    return value !== undefined && value !== null && value !== ''
  }).length

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtros Avanzados
          {filtrosActivos > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
              {filtrosActivos}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filtros Avanzados</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-xs"
            >
              Limpiar
            </Button>
          </div>

          <Separator />

          {/* Estado de la oportunidad */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Estado</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(CRM_ESTADOS_OPORTUNIDAD).map((estado) => (
                <div key={estado} className="flex items-center space-x-2">
                  <Checkbox
                    id={`estado-${estado}`}
                    checked={filters.estado === estado}
                    onCheckedChange={(checked) =>
                      handleFilterChange('estado', checked ? estado : undefined)
                    }
                  />
                  <Label htmlFor={`estado-${estado}`} className="text-xs">
                    {estado}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Relaciones */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Relaciones</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasCotizacion"
                  checked={filters.hasCotizacion || false}
                  onCheckedChange={(checked) => handleFilterChange('hasCotizacion', checked || undefined)}
                />
                <Label htmlFor="hasCotizacion" className="text-xs">
                  Tiene Cotización
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasProyecto"
                  checked={filters.hasProyecto || false}
                  onCheckedChange={(checked) => handleFilterChange('hasProyecto', checked || undefined)}
                />
                <Label htmlFor="hasProyecto" className="text-xs">
                  Tiene Proyecto
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Probabilidad */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Probabilidad (%)</Label>
            <div className="px-2">
              <Slider
                value={[filters.probabilidadMin || 0, filters.probabilidadMax || 100]}
                onValueChange={([min, max]) => {
                  handleFilterChange('probabilidadMin', min)
                  handleFilterChange('probabilidadMax', max)
                }}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{filters.probabilidadMin || 0}%</span>
                <span>{filters.probabilidadMax || 100}%</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Filtros especiales */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Filtros Especiales</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="soloUrgentes"
                  checked={filters.soloUrgentes || false}
                  onCheckedChange={(checked) => handleFilterChange('soloUrgentes', checked || undefined)}
                />
                <Label htmlFor="soloUrgentes" className="text-xs">
                  Solo Urgentes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="soloVencidas"
                  checked={filters.soloVencidas || false}
                  onCheckedChange={(checked) => handleFilterChange('soloVencidas', checked || undefined)}
                />
                <Label htmlFor="soloVencidas" className="text-xs">
                  Solo Vencidas
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="soloActivas"
                  checked={filters.soloActivas || false}
                  onCheckedChange={(checked) => handleFilterChange('soloActivas', checked || undefined)}
                />
                <Label htmlFor="soloActivas" className="text-xs">
                  Solo Activas
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button onClick={onApplyFilters} size="sm" className="flex-1">
              Aplicar Filtros
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              size="sm"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ✅ Componente wrapper para crear proyecto (maneja la carga de cotización completa)
function CrearProyectoWrapper({ cotizacionId }: { cotizacionId: string }) {
  const [cotizacion, setCotizacion] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadCotizacion = async () => {
      if (!cotizacionId) return

      setLoading(true)
      try {
        const data = await getCotizacionById(cotizacionId)
        setCotizacion(data)
      } catch (error) {
        console.error('Error al cargar cotización:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCotizacion()
  }, [cotizacionId])

  if (loading || !cotizacion) {
    return (
      <Button
        variant="default"
        size="sm"
        disabled
        className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7 px-2"
      >
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Proyecto
      </Button>
    )
  }

  return (
    <CrearProyectoDesdeCotizacionModal
      cotizacion={cotizacion}
      buttonVariant="default"
      buttonSize="sm"
      buttonClassName="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7 px-2"
      showIcon={false}
    />
  )
}

// ✅ Componente principal
export default function OportunidadesList({ onView, onEdit, onDelete, onCreate, onCreateCotizacion }: Props) {
  const [oportunidades, setOportunidades] = useState<CrmOportunidad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<CrmOportunidadFilters>({})
  const [pagination, setPagination] = useState<CrmOportunidadPagination>({ page: 1, limit: 10 })
  const [searchTerm, setSearchTerm] = useState('')
  const [estadisticas, setEstadisticas] = useState<Record<string, { count: number; valorTotal: number }>>({})
  const [proyectosCache, setProyectosCache] = useState<Record<string, Proyecto | null>>({})
  const { toast } = useToast()

  // ✅ Cargar oportunidades y detectar proyectos existentes
  const loadOportunidades = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await getOportunidades(filters, pagination)
      setOportunidades(response.data)
      setEstadisticas(response.estadisticas)

      // Detectar proyectos existentes para oportunidades con cotización
      const cotizacionIds = response.data
        .filter(opp => opp.cotizacionId)
        .map(opp => opp.cotizacionId!)

      if (cotizacionIds.length > 0) {
        try {
          const proyectos = await getProyectos()
          const proyectosMap: Record<string, Proyecto | null> = {}

          cotizacionIds.forEach(cotizacionId => {
            const proyecto = proyectos.find(p => p.cotizacionId === cotizacionId)
            proyectosMap[cotizacionId] = proyecto || null
          })

          setProyectosCache(prev => ({ ...prev, ...proyectosMap }))
        } catch (proyectosError) {
          console.warn('Error al cargar proyectos:', proyectosError)
        }
      }
    } catch (err) {
      console.error('Error al cargar oportunidades:', err)
      setError('Error al cargar oportunidades')
      toast({
        title: "Error",
        description: "No se pudieron cargar las oportunidades",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // ✅ Efecto para cargar datos
  useEffect(() => {
    loadOportunidades()
  }, [filters, pagination])

  // ✅ Efecto para búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm || undefined }))
      setPagination(prev => ({ ...prev, page: 1 }))
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // ✅ Manejar eliminación
  const handleDelete = async (oportunidad: CrmOportunidad) => {
    if (!onDelete) return

    // Aquí iría la lógica de confirmación
    onDelete(oportunidad)
  }

  // ✅ Obtener variante de badge según estado
  const getEstadoVariant = (estado: string) => {
    switch (estado) {
      case CRM_ESTADOS_OPORTUNIDAD.CERRADA_GANADA:
        return 'default'
      case CRM_ESTADOS_OPORTUNIDAD.CERRADA_PERDIDA:
        return 'destructive'
      case CRM_ESTADOS_OPORTUNIDAD.NEGOCIACION:
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // ✅ Obtener variante de badge según prioridad
  const getPrioridadVariant = (prioridad: string) => {
    switch (prioridad) {
      case CRM_PRIORIDADES.CRITICA:
        return 'destructive'
      case CRM_PRIORIDADES.ALTA:
        return 'default'
      case CRM_PRIORIDADES.MEDIA:
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // ✅ Verificar si se puede crear proyecto desde la oportunidad
  const puedeCrearProyecto = (oportunidad: CrmOportunidad) => {
    const tieneCotizacion = !!oportunidad.cotizacion
    const cotizacionAprobada = oportunidad.cotizacion?.estado === 'aprobada'
    const estadoValido = oportunidad.estado === CRM_ESTADOS_OPORTUNIDAD.CERRADA_GANADA ||
                        oportunidad.estado === CRM_ESTADOS_OPORTUNIDAD.NEGOCIACION ||
                        oportunidad.estado === 'cerrada_ganada' // Agregar estado alternativo

    // Debug logs (remover en producción)
    // if (oportunidad.id === 'cmfr5zqa90002l83wrvvmnfrp') {
    //   console.log('🔍 Debug oportunidad específica:', {
    //     id: oportunidad.id,
    //     nombre: oportunidad.nombre,
    //     estado: oportunidad.estado,
    //     tieneCotizacion,
    //     cotizacionEstado: oportunidad.cotizacion?.estado,
    //     cotizacionAprobada,
    //     estadoValido,
    //     puedeCrear: tieneCotizacion && cotizacionAprobada && estadoValido
    //   })
    // }

    return tieneCotizacion && cotizacionAprobada && estadoValido
  }

  return (
    <div className="space-y-6">

      {/* Barra de búsqueda y filtros en una sola línea */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar oportunidades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Filtros rápidos en línea */}
        <div className="flex gap-1">
          <Button
            variant={Object.keys(filters).length === 0 ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilters({})
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="text-xs h-9 px-3"
          >
            Todas
          </Button>
          <Button
            variant={filters.soloActivas ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilters({ soloActivas: true })
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="text-xs h-9 px-3"
          >
            Activas
          </Button>
          <Button
            variant={filters.hasCotizacion ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilters({ hasCotizacion: true })
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="text-xs h-9 px-3"
          >
            Con Cotización
          </Button>
          <Button
            variant={filters.hasProyecto ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilters({ hasProyecto: true })
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="text-xs h-9 px-3"
          >
            Con Proyecto
          </Button>
        </div>

        <FiltrosAvanzados
          filters={filters}
          onFiltersChange={setFilters}
          onApplyFilters={() => {
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
          onClearFilters={() => {
            setFilters({})
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
        />
      </div>

      {/* Indicadores de filtros activos (solo si hay filtros avanzados) */}
      {Object.keys(filters).some(key => key !== 'soloActivas' && key !== 'hasCotizacion' && key !== 'hasProyecto') && (
        <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
          <span>Filtros activos:</span>
          {filters.soloUrgentes && <Badge variant="destructive" className="text-xs">Urgentes ×</Badge>}
          {filters.soloVencidas && <Badge variant="destructive" className="text-xs">Vencidas ×</Badge>}
          {filters.probabilidadMin !== undefined && (
            <Badge variant="outline" className="text-xs">
              Prob: {filters.probabilidadMin}-{filters.probabilidadMax}%
            </Badge>
          )}
        </div>
      )}



      {/* Lista de oportunidades */}
      <div className="space-y-2">
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <OportunidadSkeleton key={i} />
            ))}
          </div>
        ) : oportunidades.length === 0 ? (
          <EmptyState onCreate={onCreate} />
        ) : (
          <AnimatePresence>
            {oportunidades.map((oportunidad, index) => (
              <motion.div
                key={oportunidad.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.05,
                  ease: [0.4, 0, 0.2, 1]
                }}
                whileHover={{ y: -2 }}
                className="group"
              >
                <Card className={`hover:shadow-sm transition-all duration-200 mb-2 ${
                  (() => {
                    const estadoInfo = getEstadoAvanzado(oportunidad.estado, oportunidad.cotizacion)
                    // Add subtle border color based on status
                    if (oportunidad.estado === 'cerrada_ganada' || oportunidad.estado === 'ganada') {
                      return 'border-l-4 border-l-green-500 bg-green-50/30'
                    }
                    if (oportunidad.estado === 'cerrada_perdida' || oportunidad.estado === 'perdida') {
                      return 'border-l-4 border-l-red-500 bg-red-50/30'
                    }
                    if (oportunidad.estado === 'negociacion') {
                      return 'border-l-4 border-l-orange-500 bg-orange-50/30'
                    }
                    if (oportunidad.estado === 'propuesta_enviada' || oportunidad.estado === 'cotizacion') {
                      return 'border-l-4 border-l-blue-500 bg-blue-50/30'
                    }
                    return ''
                  })()
                }`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-semibold text-foreground">
                            {oportunidad.nombre}
                          </CardTitle>
                          {/* Status indicator - More prominent */}
                          {(() => {
                            const estadoInfo = getEstadoAvanzado(oportunidad.estado, oportunidad.cotizacion)
                            const Icon = estadoInfo.icon
                            return (
                              <Badge className={`text-xs font-semibold ${estadoInfo.color} flex items-center gap-1 px-3 py-1 border-2 shadow-sm`}>
                                <Icon className={`h-3 w-3 ${estadoInfo.iconColor}`} />
                                {estadoInfo.label}
                              </Badge>
                            )
                          })()}
                          {oportunidad.cotizacion && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              <FileText className="h-3 w-3 mr-1" />
                              {oportunidad.cotizacion.codigo}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{oportunidad.cliente?.nombre || 'Sin cliente'}</span>
                          <span>•</span>
                          {/* Estado como texto adicional */}
                          <span className="font-medium text-foreground">
                            Estado: {(() => {
                              const estadoInfo = getEstadoAvanzado(oportunidad.estado, oportunidad.cotizacion)
                              return estadoInfo.label
                            })()}
                          </span>
                          {oportunidad.fechaCierreEstimada && (
                            <>
                              <span>•</span>
                              <Calendar className="h-3 w-3" />
                              <span>Cierre: {formatDate(oportunidad.fechaCierreEstimada)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {/* Status indicator - Top right corner */}
                        <div className="flex items-center gap-1">
                          {(() => {
                            const estadoInfo = getEstadoAvanzado(oportunidad.estado, oportunidad.cotizacion)
                            const Icon = estadoInfo.icon
                            return (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoInfo.color} border shadow-sm`}>
                                <Icon className={`h-3 w-3 ${estadoInfo.iconColor}`} />
                              </div>
                            )
                          })()}
                          <Badge variant={getPrioridadVariant(oportunidad.prioridad)} className="text-xs">
                            {oportunidad.prioridad}
                          </Badge>
                        </div>
                        {/* Probability indicator */}
                        <div className="text-xs text-muted-foreground">
                          {oportunidad.probabilidad}% prob.
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          <span>Valor</span>
                        </div>
                        <p className="font-semibold text-green-600 text-sm">
                          {oportunidad.valorEstimado ? formatCurrency(oportunidad.valorEstimado) : 'N/A'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          <span>Probabilidad</span>
                        </div>
                        <p className="font-semibold text-blue-600 text-sm">
                          {oportunidad.probabilidad}%
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>Comercial</span>
                        </div>
                        <p className="font-semibold text-xs">
                          {oportunidad.comercial?.name || 'N/A'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Último Contacto</span>
                        </div>
                        <p className="font-semibold text-xs">
                          {oportunidad.fechaUltimoContacto ? formatDate(oportunidad.fechaUltimoContacto) : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Información de Cotización */}
                    {oportunidad.cotizacion && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-900">Cotización: {oportunidad.cotizacion!.codigo}</span>
                            <Badge
                              variant={
                                oportunidad.cotizacion!.estado === 'aprobada' ? 'default' :
                                oportunidad.cotizacion!.estado === 'enviada' ? 'secondary' :
                                oportunidad.cotizacion!.estado === 'borrador' ? 'outline' : 'destructive'
                              }
                              className="text-xs"
                            >
                              {oportunidad.cotizacion!.estado}
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`/comercial/cotizaciones/${oportunidad.cotizacion!.id}`, '_blank')
                            }}
                            className="text-xs h-6 px-2"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Ver Cotización
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Información del Proyecto si existe */}
                    {oportunidad.cotizacionId && proyectosCache[oportunidad.cotizacionId] && (
                      <ProyectoInfo proyecto={proyectosCache[oportunidad.cotizacionId]!} />
                    )}

                    <div className="flex justify-end gap-1">
                      {onView && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onView(oportunidad)}
                          className="text-xs h-7 px-2"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver Detalles
                        </Button>
                      )}

                      {onCreateCotizacion && !oportunidad.cotizacion && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCreateCotizacion(oportunidad)}
                          className="text-xs h-7 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Crear Cotización
                        </Button>
                      )}

                      {(() => {
                        const puedeCrear = puedeCrearProyecto(oportunidad)
                        const tieneProyecto = oportunidad.cotizacionId && proyectosCache[oportunidad.cotizacionId]
                        const mostrarBotonCrear = puedeCrear && !tieneProyecto

                        // Debug logs (remover en producción)
                        // if (oportunidad.id === 'cmfr5zqa90002l83wrvvmnfrp') {
                        //   console.log('🎯 Render check for specific opportunity:', {
                        //     id: oportunidad.id,
                        //     puedeCrear,
                        //     tieneProyecto: !!tieneProyecto,
                        //     mostrarBotonCrear
                        //   })
                        // }

                        return mostrarBotonCrear ? (
                          <CrearProyectoWrapper cotizacionId={oportunidad.cotizacion!.id} />
                        ) : null
                      })()}

                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(oportunidad)}
                          className="text-xs h-7 px-2"
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      )}

                      {onDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(oportunidad)}
                          className="hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-xs h-7 px-2"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}