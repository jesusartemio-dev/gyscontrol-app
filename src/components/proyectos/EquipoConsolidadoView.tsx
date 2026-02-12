'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
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
import { toast } from 'sonner'
import {
  Search,
  Loader2,
  Package,
  DollarSign,
  Layers,
  Copy,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ConsolidadoEquipoItem {
  groupKey: string
  codigo: string
  descripcion: string
  marca: string
  categoria: string
  unidad: string
  cantidadTotal: number
  costoClienteTotal: number
  costoInternoTotal: number
  origenes: {
    cotizacionId: string
    cotizacionNombre: string
    proyectoId: string
    proyectoCodigo: string
    cantidad: number
  }[]
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)
}

export function EquipoConsolidadoView() {
  const [items, setItems] = useState<any[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProyecto, setSelectedProyecto] = useState('todos')
  const [selectedCategoria, setSelectedCategoria] = useState('todos')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
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
  }, [])

  // Refetch when project filter changes
  useEffect(() => {
    if (loading) return
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

  // Consolidation logic
  const consolidated = useMemo(() => {
    const groupMap = new Map<string, ConsolidadoEquipoItem>()

    for (const item of items) {
      const groupKey = item.catalogoEquipoId
        ? `cat::${item.catalogoEquipoId}`
        : `code::${(item.codigo || '').toLowerCase()}::${(item.marca || '').toLowerCase()}`

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          groupKey,
          codigo: item.codigo || '',
          descripcion: item.descripcion || '',
          marca: item.marca || '',
          categoria: item.categoria || 'SIN-CATEGORIA',
          unidad: item.unidad || '',
          cantidadTotal: 0,
          costoClienteTotal: 0,
          costoInternoTotal: 0,
          origenes: [],
        })
      }

      const group = groupMap.get(groupKey)!
      const cantidad = item.cantidad || 0
      group.cantidadTotal += cantidad
      group.costoClienteTotal += (item.costoCliente || 0)
      group.costoInternoTotal += (item.costoInterno || 0)

      // Track origin cotización
      const cotizacion = item.proyectoEquipo || item.proyectoEquipoCotizado
      const cotizacionId = cotizacion?.id || 'sin-cotizacion'
      const existingOrigen = group.origenes.find(o => o.cotizacionId === cotizacionId)
      if (existingOrigen) {
        existingOrigen.cantidad += cantidad
      } else {
        group.origenes.push({
          cotizacionId,
          cotizacionNombre: cotizacion?.nombre || 'Sin cotización',
          proyectoId: item.proyecto?.id || '',
          proyectoCodigo: item.proyecto?.codigo || '',
          cantidad,
        })
      }
    }

    return Array.from(groupMap.values())
  }, [items])

  // Extract unique categories
  const categorias = useMemo(() => {
    const cats = new Set<string>()
    for (const item of consolidated) {
      cats.add(item.categoria)
    }
    return Array.from(cats).sort()
  }, [consolidated])

  // Filter consolidated items
  const filteredConsolidated = useMemo(() => {
    let result = consolidated

    if (selectedCategoria !== 'todos') {
      result = result.filter(item => item.categoria === selectedCategoria)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(item =>
        item.codigo.toLowerCase().includes(search) ||
        item.descripcion.toLowerCase().includes(search) ||
        item.marca.toLowerCase().includes(search)
      )
    }

    // Sort by categoria, then codigo
    return result.sort((a, b) => {
      const catCompare = a.categoria.localeCompare(b.categoria)
      if (catCompare !== 0) return catCompare
      return a.codigo.localeCompare(b.codigo)
    })
  }, [consolidated, selectedCategoria, searchTerm])

  // Group by category for visual separators
  const groupedByCategory = useMemo(() => {
    const groups: { categoria: string; items: ConsolidadoEquipoItem[] }[] = []
    let currentCat = ''

    for (const item of filteredConsolidated) {
      if (item.categoria !== currentCat) {
        currentCat = item.categoria
        groups.push({ categoria: currentCat, items: [] })
      }
      groups[groups.length - 1].items.push(item)
    }

    return groups
  }, [filteredConsolidated])

  const stats = useMemo(() => ({
    itemsUnicos: filteredConsolidated.length,
    itemsTotales: items.length,
    costoCliente: filteredConsolidated.reduce((sum, item) => sum + item.costoClienteTotal, 0),
    costoInterno: filteredConsolidated.reduce((sum, item) => sum + item.costoInternoTotal, 0),
    categorias: new Set(filteredConsolidated.map(i => i.categoria)).size,
  }), [filteredConsolidated, items])

  const handleCopyToClipboard = async () => {
    const header = 'Codigo\tDescripcion\tMarca\tCategoria\tUnidad\tCantidad\tCosto Cliente\tCosto Interno\tOrigenes'
    const rows = filteredConsolidated.map(item => {
      const origenes = item.origenes.map(o => `${o.proyectoCodigo}/${o.cotizacionNombre}(${o.cantidad})`).join(', ')
      return `${item.codigo}\t${item.descripcion}\t${item.marca}\t${item.categoria}\t${item.unidad}\t${item.cantidadTotal}\t${item.costoClienteTotal.toFixed(2)}\t${item.costoInternoTotal.toFixed(2)}\t${origenes}`
    })
    const text = [header, ...rows].join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Tabla copiada al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Error al copiar')
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
          <Layers className="h-3 w-3 mr-1" />
          {stats.itemsUnicos} unicos
        </Badge>
        <Badge variant="outline" className="text-xs font-medium">
          {stats.itemsTotales} totales
        </Badge>
        <Badge variant="outline" className="text-xs font-medium">
          {stats.categorias} categorias
        </Badge>
        <div className="hidden md:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-emerald-600">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="font-semibold">{formatCurrency(stats.costoCliente)}</span>
            <span className="text-muted-foreground">cliente</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1 text-blue-600">
            <span className="font-semibold">{formatCurrency(stats.costoInterno)}</span>
            <span className="text-muted-foreground">interno</span>
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

        <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
          <SelectTrigger className="w-full sm:w-44 h-9">
            <SelectValue placeholder="Todas las categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las categorias</SelectItem>
            {categorias.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-1.5"
          onClick={handleCopyToClipboard}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>

      {/* Table */}
      {filteredConsolidated.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No se encontraron items para consolidar</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-white">
                <TableHead className="text-xs font-medium">Codigo</TableHead>
                <TableHead className="text-xs font-medium">Descripcion</TableHead>
                <TableHead className="text-xs font-medium hidden md:table-cell">Marca</TableHead>
                <TableHead className="text-xs font-medium hidden sm:table-cell">Unidad</TableHead>
                <TableHead className="text-xs font-medium text-center w-24">Cant. Total</TableHead>
                <TableHead className="text-xs font-medium text-right w-24">Costo Cliente</TableHead>
                <TableHead className="text-xs font-medium text-right hidden sm:table-cell w-24">Costo Interno</TableHead>
                <TableHead className="text-xs font-medium">Origenes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedByCategory.map((catGroup) => (
                <Fragment key={`cat-${catGroup.categoria}`}>
                  {/* Category separator row */}
                  <TableRow className="bg-gray-100 hover:bg-gray-100">
                    <TableCell colSpan={8} className="py-1.5 px-3">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {catGroup.categoria}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-2">
                        ({catGroup.items.length} items)
                      </span>
                    </TableCell>
                  </TableRow>
                  {catGroup.items.map((item, idx) => (
                    <TableRow key={item.groupKey} className={cn(idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                      <TableCell className="text-xs font-mono">{item.codigo}</TableCell>
                      <TableCell className="text-xs max-w-[200px]">
                        <span className="line-clamp-2">{item.descripcion}</span>
                      </TableCell>
                      <TableCell className="text-xs hidden md:table-cell text-muted-foreground">{item.marca}</TableCell>
                      <TableCell className="text-xs hidden sm:table-cell text-muted-foreground">{item.unidad}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-bold text-blue-700">{item.cantidadTotal}</span>
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium text-emerald-600">
                        {formatCurrency(item.costoClienteTotal)}
                      </TableCell>
                      <TableCell className="text-xs text-right hidden sm:table-cell text-muted-foreground">
                        {formatCurrency(item.costoInternoTotal)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.origenes.map((origen) => (
                            <Badge
                              key={origen.cotizacionId}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 whitespace-nowrap"
                            >
                              {origen.proyectoCodigo} ({origen.cantidad})
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
