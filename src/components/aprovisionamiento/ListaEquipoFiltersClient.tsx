'use client'

// ✅ React & Next.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ✅ UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

// ✅ Icons
import { Search, Filter, X, Calendar as CalendarIcon, DollarSign } from 'lucide-react'

// ✅ Utils
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// 🎯 Types
interface Filtros {
  busqueda?: string
  proyecto?: string
  estado?: string
  fechaInicio?: string
  fechaFin?: string
  montoMin?: string
  montoMax?: string
  coherencia?: string
}

interface ListaEquipoFiltersClientProps {
  filtros: Filtros
  searchParams: Record<string, string | undefined>
  showQuickFilters?: boolean
}

export default function ListaEquipoFiltersClient({ 
  filtros, 
  searchParams,
  showQuickFilters = true 
}: ListaEquipoFiltersClientProps) {
  const router = useRouter()
  
  // 🔁 Local state for filters
  const [localFiltros, setLocalFiltros] = useState<Filtros>(filtros)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // 📡 Handle filter changes
  const handleFiltroChange = (key: keyof Filtros, value: string | undefined) => {
    // ✅ Convert 'all' to undefined for proper filtering
    const cleanedValue = value === 'all' ? undefined : value
    
    const newFiltros = { ...localFiltros, [key]: cleanedValue }
    setLocalFiltros(newFiltros)
    
    // Build new URL params
    const params = new URLSearchParams()
    
    // Add all current search params except the one being changed
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== key) {
        params.set(k, v)
      }
    })
    
    // Add the new filter value
    if (cleanedValue) {
      params.set(key, cleanedValue)
    }
    
    // Reset to page 1 when filters change
    params.set('page', '1')
    
    // Navigate with new params
    router.push(`/finanzas/aprovisionamiento/listas?${params.toString()}`)
  }
  
  // 📡 Clear all filters
  const clearFilters = () => {
    setLocalFiltros({})
    router.push('/finanzas/aprovisionamiento/listas')
  }
  
  // 📡 Remove specific filter
  const removeFilter = (key: keyof Filtros) => {
    handleFiltroChange(key, undefined)
  }
  
  return (
    <div className="space-y-4">
      {/* 🔍 Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar por código, descripción o proyecto..."
          value={localFiltros.busqueda || ''}
          onChange={(e) => handleFiltroChange('busqueda', e.target.value || undefined)}
          className="pl-10"
        />
      </div>
      
      {/* 🏷️ Quick Filters */}
      {showQuickFilters && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={localFiltros.estado === 'PENDIENTE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFiltroChange('estado', localFiltros.estado === 'PENDIENTE' ? undefined : 'PENDIENTE')}
          >
            Pendientes
          </Button>
          <Button
            variant={localFiltros.estado === 'APROBADO' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFiltroChange('estado', localFiltros.estado === 'APROBADO' ? undefined : 'APROBADO')}
          >
            Aprobadas
          </Button>
          <Button
            variant={localFiltros.coherencia === 'true' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFiltroChange('coherencia', localFiltros.coherencia === 'true' ? undefined : 'true')}
          >
            Solo coherentes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros avanzados
          </Button>
        </div>
      )}
      
      {/* 📋 Advanced Filters */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Filtros Avanzados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Estado */}
              <div>
                <label className="text-sm font-medium mb-2 block">Estado</label>
                <Select
                  value={localFiltros.estado || ''}
                  onValueChange={(value) => handleFiltroChange('estado', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="BORRADOR">Borrador</SelectItem>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="APROBADO">Aprobado</SelectItem>
                    <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                    <SelectItem value="ENVIADO">Enviado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Rango de fechas */}
              <div>
                <label className="text-sm font-medium mb-2 block">Fecha inicio</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !localFiltros.fechaInicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFiltros.fechaInicio ? (
                        format(new Date(localFiltros.fechaInicio), "PPP", { locale: es })
                      ) : (
                        "Seleccionar fecha"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localFiltros.fechaInicio ? new Date(localFiltros.fechaInicio) : undefined}
                      onSelect={(date) => handleFiltroChange('fechaInicio', date?.toISOString().split('T')[0])}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Fecha fin</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !localFiltros.fechaFin && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFiltros.fechaFin ? (
                        format(new Date(localFiltros.fechaFin), "PPP", { locale: es })
                      ) : (
                        "Seleccionar fecha"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localFiltros.fechaFin ? new Date(localFiltros.fechaFin) : undefined}
                      onSelect={(date) => handleFiltroChange('fechaFin', date?.toISOString().split('T')[0])}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Rango de montos */}
              <div>
                <label className="text-sm font-medium mb-2 block">Monto mínimo</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={localFiltros.montoMin || ''}
                    onChange={(e) => handleFiltroChange('montoMin', e.target.value || undefined)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Monto máximo</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={localFiltros.montoMax || ''}
                    onChange={(e) => handleFiltroChange('montoMax', e.target.value || undefined)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
              <Button onClick={() => setShowAdvanced(false)}>
                Aplicar filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 🏷️ Active Filters */}
      {Object.entries(localFiltros).some(([_, value]) => value) && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(localFiltros).map(([key, value]) => {
            if (!value) return null
            
            let label = value
            if (key === 'estado') {
              const estadoLabels: Record<string, string> = {
                'BORRADOR': 'Borrador',
                'PENDIENTE': 'Pendiente',
                'APROBADO': 'Aprobado',
                'RECHAZADO': 'Rechazado',
                'ENVIADO': 'Enviado'
              }
              label = estadoLabels[value] || value
            } else if (key === 'coherencia' && value === 'true') {
              label = 'Solo coherentes'
            } else if (key === 'fechaInicio') {
              label = `Desde: ${format(new Date(value), 'dd/MM/yyyy')}`
            } else if (key === 'fechaFin') {
              label = `Hasta: ${format(new Date(value), 'dd/MM/yyyy')}`
            } else if (key === 'montoMin') {
              label = `Min: $${value}`
            } else if (key === 'montoMax') {
              label = `Max: $${value}`
            }
            
            return (
              <Badge key={key} variant="secondary" className="gap-1">
                {label}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => removeFilter(key as keyof Filtros)}
                />
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}