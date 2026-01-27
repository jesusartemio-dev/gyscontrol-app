'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from 'sonner'
import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { getProyectoEquipos } from '@/lib/services/proyectoEquipo'
import { createListaEquipoItem } from '@/lib/services/listaEquipoItem'
import {
  Plus,
  Search,
  Package,
  X,
  Loader2,
  ChevronUp,
  ChevronDown,
  Layers
} from 'lucide-react'
import type {
  CatalogoEquipo,
  CategoriaEquipo,
  ProyectoEquipoCotizado,
} from '@/types'

interface Props {
  isOpen: boolean
  proyectoId: string
  listaId: string
  onClose: () => void
  onSuccess?: () => void
  onCreated?: () => Promise<void>
}

type SortField = 'codigo' | 'descripcion'
type SortOrder = 'asc' | 'desc'

export default function ModalAgregarItemDesdeCatalogo({
  isOpen,
  proyectoId,
  listaId,
  onClose,
  onSuccess,
  onCreated,
}: Props) {
  const { data: session } = useSession()
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [secciones, setSecciones] = useState<ProyectoEquipoCotizado[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [search, setSearch] = useState('')
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [proyectoEquipoId, setProyectoEquipoId] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('codigo')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      try {
        setInitialLoading(true)
        const [equiposData, categoriasData, seccionesData] = await Promise.all([
          getCatalogoEquipos(),
          getCategoriasEquipo(),
          getProyectoEquipos(proyectoId),
        ])
        setEquipos(equiposData)
        setCategorias(categoriasData)
        setSecciones(seccionesData)
      } catch (error) {
        console.error('Error al cargar datos:', error)
        toast.error('Error al cargar el catálogo')
      } finally {
        setInitialLoading(false)
      }
    }
    fetchData()
  }, [proyectoId, isOpen])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSeleccionados([])
      setProyectoEquipoId('')
      setSearch('')
      setCategoriaFiltro('todas')
    }
  }, [isOpen])

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (seleccionados.length === equiposFiltrados.length) {
      setSeleccionados([])
    } else {
      setSeleccionados(equiposFiltrados.map(e => e.id))
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleAgregar = async () => {
    if (!session?.user?.id) {
      toast.error('No se pudo identificar el usuario')
      return
    }

    if (seleccionados.length === 0 || !proyectoEquipoId) {
      toast.warning('Selecciona equipos y un grupo del proyecto')
      return
    }

    try {
      setLoading(true)
      for (const id of seleccionados) {
        const equipo = equipos.find((e) => e.id === id)
        if (!equipo) continue

        await createListaEquipoItem({
          listaId,
          proyectoEquipoId,
          catalogoEquipoId: equipo.id,
          responsableId: session.user.id,
          codigo: equipo.codigo,
          descripcion: equipo.descripcion,
          unidad: equipo.unidad?.nombre || 'UND',
          marca: equipo.marca || '',
          categoria: equipo.categoriaEquipo?.nombre || '',
          cantidad: 1,
          presupuesto: equipo.precioVenta ?? 0,
          origen: 'nuevo',
          estado: 'borrador',
        })
      }

      toast.success(`${seleccionados.length} equipo(s) agregado(s)`)
      onSuccess?.()
      await onCreated?.()
      onClose()
    } catch (error) {
      console.error('Error al agregar equipos:', error)
      toast.error('Error al agregar los equipos')
    } finally {
      setLoading(false)
    }
  }

  const equiposFiltrados = useMemo(() => {
    let filtered = equipos.filter((e) => {
      const matchCategoria = categoriaFiltro === 'todas' || e.categoriaId === categoriaFiltro
      const matchSearch = !search ||
        e.codigo.toLowerCase().includes(search.toLowerCase()) ||
        e.descripcion.toLowerCase().includes(search.toLowerCase())
      return matchCategoria && matchSearch
    })

    // Sort
    filtered.sort((a, b) => {
      const aVal = sortField === 'codigo' ? a.codigo : a.descripcion
      const bVal = sortField === 'codigo' ? b.codigo : b.descripcion
      const compare = aVal.localeCompare(bVal)
      return sortOrder === 'asc' ? compare : -compare
    })

    return filtered
  }, [equipos, categoriaFiltro, search, sortField, sortOrder])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc'
      ? <ChevronUp className="h-3 w-3 inline ml-0.5" />
      : <ChevronDown className="h-3 w-3 inline ml-0.5" />
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            <DialogTitle className="text-sm font-semibold">
              Agregar desde Catálogo
            </DialogTitle>
            <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
              {seleccionados.length} seleccionados
            </Badge>
          </div>
        </DialogHeader>

        {/* Filtros inline */}
        <div className="px-4 py-2 border-b bg-gray-50/50 flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar código o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                onClick={() => setSearch('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
            <SelectTrigger className="h-7 w-44 text-xs">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                  {cat.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-[10px] text-muted-foreground ml-auto">
            {equiposFiltrados.length} de {equipos.length}
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 min-h-0">
          {initialLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : equiposFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">No se encontraron equipos</p>
              {(search || categoriaFiltro !== 'todas') && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs mt-2"
                  onClick={() => { setSearch(''); setCategoriaFiltro('todas') }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="border-b">
                    <th className="py-2 px-2 w-8">
                      <Checkbox
                        checked={seleccionados.length === equiposFiltrados.length && equiposFiltrados.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="h-3.5 w-3.5"
                      />
                    </th>
                    <th
                      className="py-2 px-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground w-40"
                      onClick={() => handleSort('codigo')}
                    >
                      Código <SortIcon field="codigo" />
                    </th>
                    <th
                      className="py-2 px-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('descripcion')}
                    >
                      Descripción <SortIcon field="descripcion" />
                    </th>
                    <th className="py-2 px-2 text-left font-medium text-muted-foreground w-16">
                      Unidad
                    </th>
                    <th className="py-2 px-2 text-right font-medium text-muted-foreground w-20">
                      Precio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {equiposFiltrados.map((equipo) => {
                    const isSelected = seleccionados.includes(equipo.id)
                    return (
                      <tr
                        key={equipo.id}
                        className={`border-b cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleSeleccion(equipo.id)}
                      >
                        <td className="py-1.5 px-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSeleccion(equipo.id)}
                            className="h-3.5 w-3.5"
                          />
                        </td>
                        <td className="py-1.5 px-2 font-mono text-[11px]">
                          {equipo.codigo}
                        </td>
                        <td className="py-1.5 px-2 truncate max-w-md" title={equipo.descripcion}>
                          {equipo.descripcion}
                        </td>
                        <td className="py-1.5 px-2">
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {equipo.unidad?.nombre || 'UND'}
                          </Badge>
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium">
                          {equipo.precioVenta ? `$${equipo.precioVenta.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Grupo selector */}
            <div className="flex items-center gap-2 flex-1">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={proyectoEquipoId} onValueChange={setProyectoEquipoId}>
                <SelectTrigger className="h-7 w-56 text-xs">
                  <SelectValue placeholder="Seleccionar grupo..." />
                </SelectTrigger>
                <SelectContent>
                  {secciones.map((seccion) => (
                    <SelectItem key={seccion.id} value={seccion.id} className="text-xs">
                      {seccion.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {seleccionados.length > 0 && !proyectoEquipoId && (
                <span className="text-[10px] text-orange-600">← Requerido</span>
              )}
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={loading}
                className="h-7 text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleAgregar}
                disabled={loading || seleccionados.length === 0 || !proyectoEquipoId}
                className="h-7 text-xs min-w-[100px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar ({seleccionados.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
