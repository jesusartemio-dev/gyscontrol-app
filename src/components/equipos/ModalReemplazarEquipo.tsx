'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  Hash,
  FileText,
  X,
  ArrowRight,
  Info
} from 'lucide-react'
import { toast } from 'sonner'

import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import {
  createListaEquipoItem,
  deleteListaEquipoItem,
  updateListaEquipoItem,
} from '@/lib/services/listaEquipoItem'
import { updateProyectoEquipoItem } from '@/lib/services/proyectoEquipoItem'

import type {
  CatalogoEquipo,
  CategoriaEquipo,
  ListaEquipoItem,
} from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  item: ListaEquipoItem
  proyectoId: string
  listaId: string
  onUpdated?: () => void
}

export default function ModalReemplazarEquipo({
  open,
  onClose,
  item,
  proyectoId,
  listaId,
  onUpdated,
}: Props) {
  const { data: session } = useSession()
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CatalogoEquipo | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [motivoCambio, setMotivoCambio] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine replacement context
  const esReemplazoDeReemplazo = !!item?.reemplazaProyectoEquipoCotizadoItemId
  const esNuevo = item?.origen === 'nuevo'
  const tieneProyectoEquipoItem = !!item?.proyectoEquipoItemId || !!item?.reemplazaProyectoEquipoCotizadoItemId

  useEffect(() => {
    if (!open) return
    setSelected(null)
    setCantidad(item?.cantidad || 1)
    setMotivoCambio('')
    setCategoriaFiltro('todas')
    setSearch('')
    setError(null)
    setInitialLoading(true)

    Promise.all([getCatalogoEquipos(), getCategoriasEquipo()])
      .then(([e, c]) => { setEquipos(e); setCategorias(c) })
      .catch(() => { setError('Error al cargar los datos del catálogo'); toast.error('Error al cargar catálogo') })
      .finally(() => setInitialLoading(false))
  }, [open])

  const equiposFiltrados = equipos.filter((e) => {
    const matchCat = categoriaFiltro === 'todas' || e.categoriaId === categoriaFiltro
    const term = search.toLowerCase()
    const matchText = e.codigo.toLowerCase().includes(term) || e.descripcion.toLowerCase().includes(term)
    return matchCat && matchText
  })

  const handleReemplazar = async () => {
    if (!session?.user?.id) {
      toast.error('No se pudo identificar el usuario. Inicia sesión nuevamente.')
      return
    }
    if (!selected || cantidad <= 0 || !motivoCambio.trim()) {
      toast.warning('Completa todos los campos requeridos')
      return
    }

    try {
      setLoading(true)

      // Resolve the original ProyectoEquipoItem ID (trazability chain)
      const proyectoEquipoItemOriginal =
        item.reemplazaProyectoEquipoCotizadoItemId || item.proyectoEquipoItemId || null

      // Step 1: Handle the current item
      if (item.origen === 'cotizado') {
        const tieneCotizaciones = item.cotizaciones && item.cotizaciones.length > 0
        if (tieneCotizaciones) {
          await updateListaEquipoItem(item.id, {
            estado: 'rechazado',
            proyectoEquipoItemId: undefined,
          })
        } else {
          await deleteListaEquipoItem(item.id)
        }
      } else {
        // reemplazo or nuevo — just mark as rechazado
        await updateListaEquipoItem(item.id, { estado: 'rechazado' })
      }

      // Step 2: Create new replacement item
      const nuevoItem = await createListaEquipoItem({
        codigo: selected.codigo,
        descripcion: selected.descripcion,
        unidad: selected.unidad?.nombre ?? 'UND',
        cantidad,
        presupuesto: 0,
        comentarioRevision: motivoCambio,
        estado: 'borrador',
        origen: 'reemplazo',
        listaId,
        proyectoEquipoItemId: proyectoEquipoItemOriginal ?? undefined,
        proyectoEquipoId: item.proyectoEquipoId,
        reemplazaProyectoEquipoCotizadoItemId: proyectoEquipoItemOriginal ?? undefined,
        responsableId: session.user.id,
      })

      // Step 3: Update ProyectoEquipoItem if linked
      if (proyectoEquipoItemOriginal && nuevoItem) {
        await updateProyectoEquipoItem(proyectoEquipoItemOriginal, {
          listaEquipoSeleccionadoId: nuevoItem.id,
          listaId,
          estado: 'reemplazado',
          motivoCambio: motivoCambio.trim(),
          cantidadReal: cantidad,
          precioReal: selected.precioVenta || 0,
          costoReal: cantidad * (selected.precioVenta || 0),
        })
      }

      toast.success('Ítem reemplazado correctamente')
      onUpdated?.()
      onClose()
    } catch (error) {
      console.error('Error al reemplazar ítem:', error)
      toast.error('No se pudo reemplazar el ítem. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // Context message for the user
  const getContextMessage = () => {
    if (esNuevo && !tieneProyectoEquipoItem) {
      return 'Este es un equipo nuevo sin vínculo a cotización. El reemplazo creará un nuevo ítem en la lista sin afectar equipos cotizados.'
    }
    if (esReemplazoDeReemplazo) {
      return `Este equipo ya es un reemplazo. Al reemplazarlo, el nuevo ítem mantendrá la trazabilidad al equipo original cotizado.`
    }
    return 'El equipo cotizado será reemplazado por el nuevo equipo seleccionado del catálogo. Se mantendrá registro del cambio.'
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="p-2 bg-blue-100 rounded-lg">
              <RefreshCw className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Reemplazar Equipo
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-0.5">
                Selecciona un equipo del catálogo para reemplazar <strong>{item?.codigo}</strong>
              </p>
            </div>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-6 py-4 space-y-4">
              {/* Context info banner */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p>{getContextMessage()}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
                    <Badge variant="outline" className="text-[10px]">{item?.codigo}</Badge>
                    <ArrowRight className="h-3 w-3" />
                    {selected ? (
                      <Badge className="bg-blue-100 text-blue-700 text-[10px]">{selected.codigo}</Badge>
                    ) : (
                      <span className="italic">Selecciona nuevo equipo</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Buscar por código o descripción..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                  {search && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setSearch('')}
                    >
                      <X className="h-3 w-3 text-gray-400" />
                    </button>
                  )}
                </div>
                <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                  <SelectTrigger className="h-8 text-sm w-[200px]">
                    <Filter className="h-3 w-3 mr-1 text-gray-400" />
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las categorías</SelectItem>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {equiposFiltrados.length} de {equipos.length}
                </span>
              </div>

              {/* Equipment table */}
              <div className="border rounded-lg overflow-hidden">
                {initialLoading ? (
                  <div className="p-4 space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="p-8 text-center">
                    <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-3">{error}</p>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Reintentar
                    </Button>
                  </div>
                ) : equiposFiltrados.length === 0 ? (
                  <div className="p-8 text-center">
                    <Package className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      {search || categoriaFiltro !== 'todas' ? 'Sin resultados. Ajusta los filtros.' : 'No hay equipos en el catálogo'}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr className="border-b">
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 w-6"></th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 w-[25%]">Código</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Descripción</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 w-[12%]">Unidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {equiposFiltrados.map((equipo) => (
                          <tr
                            key={equipo.id}
                            className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                              selected?.id === equipo.id ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : ''
                            }`}
                            onClick={() => { setSelected(equipo); setCantidad(item?.cantidad || 1) }}
                          >
                            <td className="px-3 py-2">
                              {selected?.id === equipo.id ? (
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                              ) : (
                                <div className="h-4 w-4 border border-gray-300 rounded" />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="font-mono text-xs">{equipo.codigo}</Badge>
                            </td>
                            <td className="px-3 py-2 text-gray-700">{equipo.descripcion}</td>
                            <td className="px-3 py-2">
                              <Badge variant="secondary" className="text-xs">{equipo.unidad?.nombre || 'UND'}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Replacement config — only when selected */}
              {selected && (
                <Card className="border-blue-200">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Configurar reemplazo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-4">
                    {/* Selected summary */}
                    <div className="flex items-center gap-3 p-2.5 bg-green-50 border border-green-200 rounded-lg text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-mono text-xs text-green-800 mr-2">{selected.codigo}</span>
                        <span className="text-gray-700">{selected.descripcion}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{selected.unidad?.nombre || 'UND'}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <Hash className="h-3 w-3" /> Cantidad *
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={cantidad}
                          onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Motivo del reemplazo *
                        </label>
                        <Textarea
                          placeholder="Describe por qué se reemplaza este equipo..."
                          value={motivoCambio}
                          onChange={(e) => setMotivoCambio(e.target.value)}
                          rows={2}
                          className="text-sm resize-none"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t px-6 py-3 bg-gray-50 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {selected
                ? <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> {selected.codigo} seleccionado</span>
                : 'Selecciona un equipo para continuar'
              }
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleReemplazar}
                disabled={!selected || loading || !motivoCambio.trim() || cantidad <= 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Reemplazando...</>
                ) : (
                  <><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reemplazar</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
