'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Grid3X3,
  List,
  Search,
  Filter,
  Eye,
  Trash2,
  Edit3,
  Package,
  Wrench,
  Truck,
  DollarSign,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'

interface Plantilla {
  id: string
  nombre: string
  tipo?: string
  estado?: string
  totalCliente?: number
  totalInterno?: number
  grandTotal?: number
  descuento?: number
  plantillaEquipoId?: string
  plantillaServicioId?: string
  plantillaGastoId?: string
  createdAt?: string
  updatedAt?: string
}

interface PlantillasViewProps {
  plantillas: Plantilla[]
  filterType: 'todas' | 'completas' | 'equipos' | 'servicios' | 'gastos'
  onDelete: (id: string) => void
  onEdit: (id: string, nombre: string) => void
}

type ViewMode = 'table' | 'cards'

export default function PlantillasView({
  plantillas,
  filterType,
  onDelete,
  onEdit
}: PlantillasViewProps) {
  // Detectar si es móvil para vista por defecto
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>(filterType === 'todas' ? 'all' : filterType)

  // Detectar móvil al montar y resetear filtros cuando cambia filterType
  useMemo(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // Si es móvil, usar cards por defecto
      if (mobile && viewMode === 'table') {
        setViewMode('cards')
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Resetear filtros cuando cambia filterType
  useMemo(() => {
    setTypeFilter(filterType === 'todas' ? 'all' : filterType)
  }, [filterType])

  // Determinar el tipo correcto de plantilla basado en filterType
  const getPlantillaType = (plantilla: Plantilla): string => {
    // Si tenemos un filterType específico, usarlo
    if (filterType !== 'todas') {
      return filterType
    }

    // Para el filtro 'todas', usar el campo tipo
    return plantilla.tipo || 'completa'
  }

  // Obtener información del tipo
  const getTipoInfo = (tipo: string) => {
    switch (tipo) {
      case 'completa':
        return {
          label: 'Completa',
          icon: Package,
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        }
      case 'equipos':
        return {
          label: 'Equipos',
          icon: Wrench,
          color: 'bg-orange-100 text-orange-800 border-orange-200'
        }
      case 'servicios':
        return {
          label: 'Servicios',
          icon: Truck,
          color: 'bg-green-100 text-green-800 border-green-200'
        }
      case 'gastos':
        return {
          label: 'Gastos',
          icon: DollarSign,
          color: 'bg-purple-100 text-purple-800 border-purple-200'
        }
      default:
        return {
          label: tipo,
          icon: FileText,
          color: 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }
  }

  // Filtrar plantillas
  const filteredPlantillas = useMemo(() => {
    return plantillas.filter(plantilla => {
      const matchesSearch = plantilla.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      const plantillaType = getPlantillaType(plantilla)
      const matchesType = typeFilter === 'all' || plantillaType === typeFilter

      return matchesSearch && matchesType
    })
  }, [plantillas, searchTerm, typeFilter])

  // Opciones de tipo para filtro
  const typeOptions = useMemo(() => {
    if (filterType === 'todas') {
      // Para 'todas', mostrar todos los tipos disponibles
      const types = [...new Set(plantillas.map(p => getPlantillaType(p)))]
      return types.sort()
    } else {
      // Para filtros específicos, solo mostrar ese tipo
      return [filterType]
    }
  }, [plantillas, filterType])

  const formatCurrency = (amount: number | undefined | null): string => {
    const safeAmount = amount ?? 0
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(safeAmount)
  }

  const getViewLink = (plantilla: Plantilla) => {
    const tipo = getPlantillaType(plantilla)
    switch (tipo) {
      case 'equipos':
        return `/comercial/plantillas/equipos/${plantilla.id}`
      case 'servicios':
        return `/comercial/plantillas/servicios/${plantilla.id}`
      case 'gastos':
        return `/comercial/plantillas/gastos/${plantilla.id}`
      default:
        return `/comercial/plantillas/${plantilla.id}`
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setTypeFilter('all')
  }

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar plantillas por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {typeOptions.map(type => {
                    const tipoInfo = getTipoInfo(type)
                    return (
                      <SelectItem key={type} value={type}>
                        {tipoInfo.label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters} size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            </div>

            {/* View Toggle - Solo mostrar en desktop */}
            {!isMobile && (
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4 mr-2" />
                  Tabla
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="rounded-l-none"
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Cards
                </Button>
              </div>
            )}
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-muted-foreground">
            Mostrando {filteredPlantillas.length} de {plantillas.length} plantillas
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredPlantillas.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {plantillas.length === 0 ? 'No hay plantillas' : 'No se encontraron plantillas'}
              </h3>
              <p className="text-sm">
                {plantillas.length === 0
                  ? 'Comienza creando tu primera plantilla'
                  : 'Intenta ajustar los filtros de búsqueda'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (isMobile || viewMode === 'table') ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-right">Total Cliente</TableHead>
                  <TableHead className="text-right">Total Interno</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlantillas.map((plantilla) => {
                  const tipo = getPlantillaType(plantilla)
                  const tipoInfo = getTipoInfo(tipo)
                  const IconComponent = tipoInfo.icon

                  return (
                    <TableRow key={plantilla.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{plantilla.nombre}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(plantilla.id, plantilla.nombre)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`flex items-center gap-1 w-fit mx-auto ${tipoInfo.color}`}>
                          <IconComponent className="h-3 w-3" />
                          {tipoInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(plantilla.totalCliente || plantilla.grandTotal || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(plantilla.totalInterno || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={(plantilla.totalCliente || plantilla.grandTotal || 0) > 0 ? 'default' : 'secondary'}>
                          {(plantilla.totalCliente || plantilla.grandTotal || 0) > 0 ? 'Configurada' : 'Vacía'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={getViewLink(plantilla)}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete(plantilla.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlantillas.map((plantilla) => {
            const tipo = getPlantillaType(plantilla)
            const tipoInfo = getTipoInfo(tipo)
            const IconComponent = tipoInfo.icon

            return (
              <Card key={plantilla.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <IconComponent className={`h-5 w-5 ${tipo === 'completa' ? 'text-blue-600' :
                        tipo === 'equipos' ? 'text-orange-600' :
                        tipo === 'servicios' ? 'text-green-600' : 'text-purple-600'}`} />
                      <Badge variant="outline" className={tipoInfo.color}>
                        {tipoInfo.label}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(plantilla.id, plantilla.nombre)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(plantilla.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg leading-tight">{plantilla.nombre}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Cliente:</span>
                        <div className="font-medium text-green-600">
                          {formatCurrency(plantilla.totalCliente || plantilla.grandTotal || 0)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Interno:</span>
                        <div className="font-medium">
                          {formatCurrency(plantilla.totalInterno || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Badge variant={(plantilla.totalCliente || plantilla.grandTotal || 0) > 0 ? 'default' : 'secondary'}>
                        {(plantilla.totalCliente || plantilla.grandTotal || 0) > 0 ? 'Configurada' : 'Vacía'}
                      </Badge>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={getViewLink(plantilla)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}