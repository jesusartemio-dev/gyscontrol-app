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
  ClipboardList,
  DollarSign,
  Building2,
  Eye,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ListaEquipoItem, EstadoListaItem } from '@/types'
import { Button } from '@/components/ui/button'

const estadoItemColors: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  por_revisar: 'bg-yellow-50 text-yellow-700',
  por_cotizar: 'bg-blue-50 text-blue-700',
  por_validar: 'bg-orange-50 text-orange-700',
  por_aprobar: 'bg-purple-50 text-purple-700',
  aprobado: 'bg-green-50 text-green-700',
  rechazado: 'bg-red-50 text-red-700',
}

const estadoItemLabels: Record<string, string> = {
  borrador: 'Borrador',
  por_revisar: 'Por Revisar',
  por_cotizar: 'Por Cotizar',
  por_validar: 'Por Validar',
  por_aprobar: 'Por Aprobar',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

const origenLabels: Record<string, string> = {
  cotizado: 'Cotizado',
  nuevo: 'Nuevo',
  reemplazo: 'Reemplazo',
}

const estadoListaColors: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviada: 'bg-indigo-50 text-indigo-700',
  por_revisar: 'bg-yellow-50 text-yellow-700',
  por_cotizar: 'bg-blue-50 text-blue-700',
  por_validar: 'bg-orange-50 text-orange-700',
  por_aprobar: 'bg-purple-50 text-purple-700',
  aprobada: 'bg-green-50 text-green-700',
  rechazada: 'bg-red-50 text-red-700',
  completada: 'bg-emerald-50 text-emerald-700',
}

const estadoListaLabels: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  por_revisar: 'Por Revisar',
  por_cotizar: 'Por Cotizar',
  por_validar: 'Por Validar',
  por_aprobar: 'Por Aprobar',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  completada: 'Completada',
}

interface ListaGroup {
  listaId: string
  listaNombre: string
  listaCodigo: string
  listaEstado: string
  proyectoId: string
  proyectoNombre: string
  proyectoCodigo: string
  items: ListaEquipoItem[]
  totalCosto: number
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)
}

export function ListaItemsView() {
  const [items, setItems] = useState<ListaEquipoItem[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProyecto, setSelectedProyecto] = useState('todos')
  const [selectedEstado, setSelectedEstado] = useState('todos')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [itemsRes, proyectosRes] = await Promise.all([
          fetch('/api/lista-equipo-item', { cache: 'no-store' }),
          fetch('/api/proyecto', { cache: 'no-store' }),
        ])
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json()
          setItems(itemsData)
        }
        if (proyectosRes.ok) {
          const proyectosData = await proyectosRes.json()
          setProyectos(proyectosData)
        }
      } catch {
        toast.error('Error al cargar los datos')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Refetch when project filter changes
  useEffect(() => {
    if (loading) return
    const loadItems = async () => {
      try {
        const params = new URLSearchParams()
        if (selectedProyecto !== 'todos') params.set('proyectoId', selectedProyecto)
        const res = await fetch(`/api/lista-equipo-item?${params}`, { cache: 'no-store' })
        if (res.ok) setItems(await res.json())
      } catch {
        toast.error('Error al filtrar items')
      }
    }
    loadItems()
  }, [selectedProyecto]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredItems = useMemo(() => {
    let result = items

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
  }, [items, selectedEstado, searchTerm])

  const groups = useMemo(() => {
    const groupMap = new Map<string, ListaGroup>()

    for (const item of filteredItems) {
      const lista = (item as any).listaEquipo
      if (!lista) continue

      const key = lista.id
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          listaId: lista.id,
          listaNombre: lista.nombre || 'Sin nombre',
          listaCodigo: lista.codigo || '',
          listaEstado: lista.estado || 'borrador',
          proyectoId: lista.proyectoId || '',
          proyectoNombre: '',
          proyectoCodigo: '',
          items: [],
          totalCosto: 0,
        })
        // Try to find proyecto name
        const proy = proyectos.find((p: any) => p.id === lista.proyectoId)
        if (proy) {
          const g = groupMap.get(key)!
          g.proyectoNombre = proy.nombre
          g.proyectoCodigo = proy.codigo
        }
      }

      const group = groupMap.get(key)!
      group.items.push(item)
      const costo = (item.precioElegido || item.presupuesto || 0) * (item.cantidad || 0)
      group.totalCosto += costo
    }

    return Array.from(groupMap.values()).sort((a, b) => a.listaCodigo.localeCompare(b.listaCodigo))
  }, [filteredItems, proyectos])

  // Expand all groups by default
  useEffect(() => {
    if (groups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(groups.map(g => g.listaId)))
    }
  }, [groups]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => ({
    totalItems: filteredItems.length,
    totalCosto: filteredItems.reduce((sum, item) =>
      sum + ((item.precioElegido || item.presupuesto || 0) * (item.cantidad || 0)), 0),
    aprobados: filteredItems.filter(i => i.estado === 'aprobado').length,
    pendientes: filteredItems.filter(i => ['borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar'].includes(i.estado)).length,
    rechazados: filteredItems.filter(i => i.estado === 'rechazado').length,
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
      setExpandedGroups(new Set(groups.map(g => g.listaId)))
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
          {stats.totalGroups} listas
        </Badge>
        <div className="hidden md:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-green-600">
            <span className="font-medium">{stats.aprobados} aprobados</span>
          </div>
          <div className="flex items-center gap-1 text-yellow-600">
            <span className="font-medium">{stats.pendientes} pendientes</span>
          </div>
          {stats.rechazados > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <span className="font-medium">{stats.rechazados} rechazados</span>
            </div>
          )}
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1 text-emerald-600">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="font-semibold">{formatCurrency(stats.totalCosto)}</span>
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
            {Object.entries(estadoItemLabels).map(([key, label]) => (
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
              key={group.listaId}
              open={expandedGroups.has(group.listaId)}
              onOpenChange={() => toggleGroup(group.listaId)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {expandedGroups.has(group.listaId) ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                    )}
                    <ClipboardList className="h-4 w-4 shrink-0 text-blue-500" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{group.listaNombre}</span>
                        <span className="font-mono text-xs text-muted-foreground">{group.listaCodigo}</span>
                        <Badge variant="outline" className={cn('text-[10px] px-1.5', estadoListaColors[group.listaEstado])}>
                          {estadoListaLabels[group.listaEstado] || group.listaEstado}
                        </Badge>
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
                    <span className="font-semibold text-emerald-600">{formatCurrency(group.totalCosto)}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild onClick={(e) => e.stopPropagation()}>
                      <Link href={`/proyectos/${group.proyectoId}/equipos/listas/${group.listaId}`}>
                        <Eye className="h-3.5 w-3.5 text-gray-500" />
                      </Link>
                    </Button>
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
                        <TableHead className="text-xs font-medium text-center w-20">Cant.</TableHead>
                        <TableHead className="text-xs font-medium hidden sm:table-cell">Unidad</TableHead>
                        <TableHead className="text-xs font-medium text-right w-24">Costo</TableHead>
                        <TableHead className="text-xs font-medium text-center w-24">Estado</TableHead>
                        <TableHead className="text-xs font-medium text-center hidden lg:table-cell w-20">Origen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((item, idx) => {
                        const costo = (item.precioElegido || item.presupuesto || 0) * (item.cantidad || 0)
                        return (
                          <TableRow key={item.id} className={cn(idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                            <TableCell className="text-xs font-mono">{item.codigo}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{item.descripcion}</TableCell>
                            <TableCell className="text-xs hidden md:table-cell text-muted-foreground">{item.marca}</TableCell>
                            <TableCell className="text-xs text-center font-medium">{item.cantidad}</TableCell>
                            <TableCell className="text-xs hidden sm:table-cell text-muted-foreground">{item.unidad}</TableCell>
                            <TableCell className="text-xs text-right font-medium text-emerald-600">{formatCurrency(costo)}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={cn('text-[10px] px-1.5', estadoItemColors[item.estado])}>
                                {estadoItemLabels[item.estado] || item.estado}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center hidden lg:table-cell">
                              <span className={cn('text-[10px]', item.origen === 'nuevo' ? 'text-amber-600' : 'text-muted-foreground')}>
                                {origenLabels[item.origen] || item.origen}
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
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
