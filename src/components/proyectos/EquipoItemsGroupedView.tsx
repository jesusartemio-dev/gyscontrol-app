'use client'

import { useState, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import {
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  Package,
  DollarSign,
  Building2,
  Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { ProyectoEquipoCotizadoItem } from '@/types/modelos'

const estadoColors: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-700',
  en_lista: 'bg-blue-50 text-blue-700',
  reemplazado: 'bg-orange-50 text-orange-700',
  descartado: 'bg-red-50 text-red-700',
}

const estadoLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_lista: 'En Lista',
  reemplazado: 'Reemplazado',
  descartado: 'Descartado',
}

interface EquipoGroup {
  cotizacionId: string
  cotizacionNombre: string
  proyectoId: string
  proyectoNombre: string
  proyectoCodigo: string
  items: (ProyectoEquipoCotizadoItem & { proyecto?: any })[]
  totalCostoCliente: number
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)
}

interface EquipoItemsGroupedViewProps {
  initialItems?: (ProyectoEquipoCotizadoItem & { proyecto?: any })[]
  proyectos?: any[]
}

export function EquipoItemsGroupedView({ initialItems, proyectos: initialProyectos }: EquipoItemsGroupedViewProps) {
  const [items, setItems] = useState<(ProyectoEquipoCotizadoItem & { proyecto?: any })[]>(initialItems || [])
  const [proyectos, setProyectos] = useState<any[]>(initialProyectos || [])
  const [loading, setLoading] = useState(!initialItems)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProyecto, setSelectedProyecto] = useState('todos')
  const [selectedEstado, setSelectedEstado] = useState('todos')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (initialItems && initialProyectos) return
    const loadData = async () => {
      setLoading(true)
      try {
        const proyectosRes = await fetch('/api/proyecto', { cache: 'no-store' })
        if (!proyectosRes.ok) throw new Error('Failed to fetch projects')
        const proyectosData = await proyectosRes.json()
        setProyectos(proyectosData)

        // Fetch items for all projects
        const allItems: any[] = []
        for (const p of proyectosData) {
          const res = await fetch(`/api/proyecto-equipo-item/from-proyecto/${p.id}`, { cache: 'no-store' })
          if (res.ok) {
            const data = await res.json()
            const itemsWithProyecto = (data.data || data || []).map((item: any) => ({
              ...item,
              proyecto: p,
            }))
            allItems.push(...itemsWithProyecto)
          }
        }
        setItems(allItems)
      } catch {
        toast.error('Error al cargar los datos')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [initialItems, initialProyectos])

  // Refetch when project filter changes (only if fetching client-side)
  useEffect(() => {
    if (loading || (initialItems && initialProyectos)) return
    const loadItems = async () => {
      try {
        if (selectedProyecto === 'todos') {
          const allItems: any[] = []
          for (const p of proyectos) {
            const res = await fetch(`/api/proyecto-equipo-item/from-proyecto/${p.id}`, { cache: 'no-store' })
            if (res.ok) {
              const data = await res.json()
              const itemsWithProyecto = (data.data || data || []).map((item: any) => ({
                ...item,
                proyecto: p,
              }))
              allItems.push(...itemsWithProyecto)
            }
          }
          setItems(allItems)
        } else {
          const p = proyectos.find((pr: any) => pr.id === selectedProyecto)
          const res = await fetch(`/api/proyecto-equipo-item/from-proyecto/${selectedProyecto}`, { cache: 'no-store' })
          if (res.ok) {
            const data = await res.json()
            setItems((data.data || data || []).map((item: any) => ({ ...item, proyecto: p })))
          }
        }
      } catch {
        toast.error('Error al filtrar items')
      }
    }
    loadItems()
  }, [selectedProyecto]) // eslint-disable-line react-hooks/exhaustive-deps

  // For server-side data, filter by project client-side
  const projectFilteredItems = useMemo(() => {
    if (!initialItems || selectedProyecto === 'todos') return items
    return items.filter(item => item.proyecto?.id === selectedProyecto)
  }, [items, selectedProyecto, initialItems])

  const filteredItems = useMemo(() => {
    let result = projectFilteredItems

    if (selectedEstado !== 'todos') {
      result = result.filter(item => item.estado === selectedEstado)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(item =>
        item.codigo?.toLowerCase().includes(search) ||
        item.descripcion?.toLowerCase().includes(search) ||
        item.marca?.toLowerCase().includes(search) ||
        item.categoria?.toLowerCase().includes(search)
      )
    }

    return result
  }, [projectFilteredItems, selectedEstado, searchTerm])

  const groups = useMemo(() => {
    const groupMap = new Map<string, EquipoGroup>()

    for (const item of filteredItems) {
      const cotizacion = (item as any).proyectoEquipo || (item as any).proyectoEquipoCotizado
      const key = cotizacion?.id || 'sin-cotizacion'
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          cotizacionId: key,
          cotizacionNombre: cotizacion?.nombre || 'Sin cotizacion',
          proyectoId: item.proyecto?.id || '',
          proyectoNombre: item.proyecto?.nombre || '',
          proyectoCodigo: item.proyecto?.codigo || '',
          items: [],
          totalCostoCliente: 0,
        })
      }
      const group = groupMap.get(key)!
      group.items.push(item)
      group.totalCostoCliente += (item.costoCliente || 0)
    }

    return Array.from(groupMap.values()).sort((a, b) => a.cotizacionNombre.localeCompare(b.cotizacionNombre))
  }, [filteredItems])

  // Expand all groups by default
  useEffect(() => {
    if (groups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(groups.map(g => g.cotizacionId)))
    }
  }, [groups]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => ({
    totalItems: filteredItems.length,
    totalCostoCliente: filteredItems.reduce((sum, item) => sum + (item.costoCliente || 0), 0),
    pendientes: filteredItems.filter(i => i.estado === 'pendiente').length,
    enLista: filteredItems.filter(i => i.estado === 'en_lista').length,
    totalGroups: groups.length,
  }), [filteredItems, groups])

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (expandedGroups.size === groups.length) {
      setExpandedGroups(new Set())
    } else {
      setExpandedGroups(new Set(groups.map(g => g.cotizacionId)))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Stats Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-xs font-medium">
          {stats.totalItems} items
        </Badge>
        <Badge variant="outline" className="text-xs font-medium">
          {stats.totalGroups} cotizaciones
        </Badge>
        <div className="hidden md:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-gray-600">
            <span className="font-medium">{stats.pendientes} pendientes</span>
          </div>
          <div className="flex items-center gap-1 text-blue-600">
            <span className="font-medium">{stats.enLista} en lista</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1 text-emerald-600">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="font-semibold">{formatCurrency(stats.totalCostoCliente)}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por codigo, descripcion, marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        <Select value={selectedProyecto} onValueChange={setSelectedProyecto}>
          <SelectTrigger className="w-full sm:w-48 h-9">
            <SelectValue placeholder="Todos los proyectos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los proyectos</SelectItem>
            {proyectos.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="font-medium">{p.codigo}</span>
                <span className="text-muted-foreground ml-1.5 text-xs">{p.nombre}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedEstado} onValueChange={setSelectedEstado}>
          <SelectTrigger className="w-full sm:w-40 h-9">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {Object.entries(estadoLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={toggleAll}>
          {expandedGroups.size === groups.length ? 'Colapsar' : 'Expandir'} todo
        </Button>
      </div>

      {/* Groups */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No se encontraron items</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <Collapsible
              key={group.cotizacionId}
              open={expandedGroups.has(group.cotizacionId)}
              onOpenChange={() => toggleGroup(group.cotizacionId)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {expandedGroups.has(group.cotizacionId) ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                    )}
                    <Briefcase className="h-4 w-4 shrink-0 text-blue-500" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{group.cotizacionNombre}</span>
                      </div>
                      {group.proyectoNombre && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Building2 className="h-3 w-3" />
                          <span>{group.proyectoCodigo} - {group.proyectoNombre}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    <span className="text-muted-foreground">{group.items.length} items</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(group.totalCostoCliente)}</span>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border rounded-b-lg border-t-0 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-white">
                        <TableHead className="text-xs font-medium">Codigo</TableHead>
                        <TableHead className="text-xs font-medium">Descripcion</TableHead>
                        <TableHead className="text-xs font-medium hidden md:table-cell">Marca</TableHead>
                        <TableHead className="text-xs font-medium hidden lg:table-cell">Categoria</TableHead>
                        <TableHead className="text-xs font-medium text-center w-16">Cant.</TableHead>
                        <TableHead className="text-xs font-medium text-right hidden sm:table-cell w-24">P. Cliente</TableHead>
                        <TableHead className="text-xs font-medium text-right w-24">Costo</TableHead>
                        <TableHead className="text-xs font-medium text-center w-24">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((item, idx) => (
                        <TableRow key={item.id} className={cn(idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                          <TableCell className="text-xs font-mono">{item.codigo}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{item.descripcion}</TableCell>
                          <TableCell className="text-xs hidden md:table-cell text-muted-foreground">{item.marca}</TableCell>
                          <TableCell className="text-xs hidden lg:table-cell text-muted-foreground">{item.categoria}</TableCell>
                          <TableCell className="text-xs text-center font-medium">{item.cantidad}</TableCell>
                          <TableCell className="text-xs text-right hidden sm:table-cell text-muted-foreground">
                            {formatCurrency(item.precioCliente || 0)}
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium text-emerald-600">
                            {formatCurrency(item.costoCliente || 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn('text-[10px] px-1.5', estadoColors[item.estado])}>
                              {estadoLabels[item.estado] || item.estado}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  )
}
