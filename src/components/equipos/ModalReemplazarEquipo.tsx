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
  // Pedidos del ítem: los enviados o más avanzados bloquean el reemplazo; los
  // en borrador se pasan al equipo nuevo.
  const [pedidos, setPedidos] = useState<{
    bloqueantes: { pedidoCodigo: string; pedidoEstado: string }[]
    enBorrador: { pedidoCodigo: string; cantidadPedida: number }[]
  } | null>(null)

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

    setPedidos(null)
    if (item?.id) {
      fetch(`/api/lista-equipo-item/${item.id}/pedidos-bloqueantes`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => d && setPedidos({ bloqueantes: d.bloqueantes ?? [], enBorrador: d.enBorrador ?? [] }))
        .catch(() => { /* sin aviso: el servidor igual valida al mover */ })
    }
  }, [open])

  const bloqueado = (pedidos?.bloqueantes.length ?? 0) > 0
  // Qué falta para poder reemplazar (antes el botón quedaba gris sin decir por qué).
  const faltante = bloqueado
    ? 'el ítem está en un pedido enviado o aprobado'
    : !selected ? 'seleccionar el equipo nuevo'
    : !(cantidad > 0) ? 'la cantidad'
    : !motivoCambio.trim() ? 'el motivo del reemplazo'
    : null

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
    if (faltante) {
      toast.warning(`Falta: ${faltante}`)
      return
    }
    if (!selected) return

    try {
      setLoading(true)

      // Resolve the original ProyectoEquipoItem ID (trazability chain)
      const proyectoEquipoItemOriginal =
        item.reemplazaProyectoEquipoCotizadoItemId || item.proyectoEquipoItemId || null

      // Orden: 1) crear el nuevo, 2) pasarle los pedidos en borrador, 3) sacar el
      // viejo. Antes se intentaba borrar el viejo primero: si tenía pedido no se
      // podía, quedaban los dos en la lista y el pedido seguía con el viejo.

      // Step 1: Create new replacement item
      // Inherit presupuesto from the original cotizado item (price GYS quoted to client)
      const presupuestoHeredado = item.presupuesto || item.proyectoEquipoItem?.precioCliente || 0
      const nuevoItem = await createListaEquipoItem({
        codigo: selected.codigo,
        descripcion: selected.descripcion,
        marca: selected.marca || '',
        unidad: selected.unidad?.nombre ?? 'UND',
        cantidad,
        presupuesto: presupuestoHeredado,
        comentarioRevision: motivoCambio,
        estado: 'borrador',
        origen: 'reemplazo',
        listaId,
        catalogoEquipoId: selected.id,
        proyectoEquipoItemId: proyectoEquipoItemOriginal ?? undefined,
        proyectoEquipoId: item.proyectoEquipoId,
        reemplazaProyectoEquipoCotizadoItemId: proyectoEquipoItemOriginal ?? undefined,
        responsableId: session.user.id,
      })
      if (!nuevoItem?.id) throw new Error('No se pudo crear el ítem nuevo')

      // Step 2: los pedidos en borrador (o cancelados) del viejo pasan al nuevo.
      const mover = await fetch(`/api/lista-equipo-item/${item.id}/mover-pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevoItemId: nuevoItem.id }),
      })
      const movido = await mover.json().catch(() => null)
      if (!mover.ok) {
        // No dejar dos ítems: se deshace el nuevo y no se toca el viejo.
        await deleteListaEquipoItem(nuevoItem.id)
        toast.error(movido?.error || 'No se pudieron pasar los pedidos al equipo nuevo')
        return
      }

      // Step 3: sacar el ítem anterior de la lista. Se conserva solo si tiene
      // cotizaciones de proveedor (para no perder su historial).
      const tieneCotizaciones = (item.cotizaciones?.length ?? 0) > 0
      if (tieneCotizaciones) {
        await updateListaEquipoItem(item.id, {
          estado: 'borrador',
          proyectoEquipoItemId: null,
        })
      } else {
        const eliminado = await deleteListaEquipoItem(item.id)
        if (!eliminado) {
          await updateListaEquipoItem(item.id, { estado: 'borrador' })
          toast.warning('El ítem anterior no se pudo eliminar (tiene otra dependencia). Quedó en la lista como borrador.')
        }
      }

      // Step 4: Update ProyectoEquipoItem if linked
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

      const nMovidas = (movido?.movidas ?? []).length
      toast.success(nMovidas > 0
        ? `Ítem reemplazado. ${(movido.movidas as { pedido: string }[]).map(m => m.pedido).join(', ')} ahora pide el equipo nuevo.`
        : 'Ítem reemplazado correctamente')
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
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-4xl max-h-[92dvh] overflow-hidden p-0 flex flex-col">
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="hidden sm:block p-2 bg-blue-100 rounded-lg">
              <RefreshCw className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <DialogTitle className="text-base sm:text-lg font-semibold text-gray-900">
                Reemplazar Equipo
              </DialogTitle>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                Reemplazar <strong className="break-all">{item?.codigo}</strong> por un equipo del catálogo
              </p>
            </div>
          </div>

          {/* div con scroll propio, no ScrollArea: su contenido interno toma el
              ancho de la línea más larga y en el celular todo se cortaba a la derecha. */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <div className="px-3 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
              {/* Context info banner */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p>{getContextMessage()}</p>
                  <div className="mt-2 p-2 bg-white/60 border border-blue-100 rounded text-xs text-gray-700">
                    <span className="font-mono font-medium text-blue-800">{item?.codigo}</span>
                    <span className="mx-1.5 text-gray-400">—</span>
                    <span>{item?.descripcion}</span>
                  </div>
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

              {/* Pedidos del ítem */}
              {bloqueado && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    No se puede reemplazar: está en{' '}
                    <strong>{pedidos!.bloqueantes.map(p => `${p.pedidoCodigo} (${p.pedidoEstado})`).join(', ')}</strong>.
                    Pasa ese pedido a borrador primero (Volver a Enviado → Volver a Borrador).
                  </p>
                </div>
              )}
              {!bloqueado && (pedidos?.enBorrador.length ?? 0) > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Está en <strong>{pedidos!.enBorrador.map(p => p.pedidoCodigo).join(', ')}</strong> (borrador):
                    al reemplazar, ese pedido pasará a pedir el equipo nuevo (sin pasar de la cantidad nueva).
                  </p>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1 basis-full sm:basis-0">
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
                  <SelectTrigger className="h-8 text-sm flex-1 sm:flex-none sm:w-[200px]">
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
                    {/* Celular: cada equipo en una fila de dos líneas (código y descripción),
                        sin columnas que se salgan de la pantalla. */}
                    <ul className="divide-y sm:hidden">
                      {equiposFiltrados.map((equipo) => (
                        <li
                          key={equipo.id}
                          className={`flex cursor-pointer items-start gap-2.5 px-3 py-2 ${selected?.id === equipo.id ? 'bg-blue-50' : 'active:bg-gray-50'}`}
                          onClick={() => { setSelected(equipo); setCantidad(item?.cantidad || 1) }}
                        >
                          {selected?.id === equipo.id
                            ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                            : <div className="mt-0.5 h-4 w-4 shrink-0 rounded border border-gray-300" />}
                          <div className="min-w-0 flex-1">
                            <p className="break-all font-mono text-xs font-semibold text-gray-900">{equipo.codigo}</p>
                            <p className="text-xs leading-snug text-gray-600">{equipo.descripcion}</p>
                          </div>
                          <span className="shrink-0 text-[10px] text-gray-500">{equipo.unidad?.nombre || 'UND'}</span>
                        </li>
                      ))}
                    </ul>
                    <table className="hidden w-full text-sm sm:table">
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
                  <CardHeader className="px-3 pb-2 pt-3 sm:px-6">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Configurar reemplazo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-3 pb-4 sm:px-6">
                    {/* Selected summary */}
                    <div className="flex items-start gap-3 p-2.5 bg-green-50 border border-green-200 rounded-lg text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="break-all font-mono text-xs text-green-800 mr-2">{selected.codigo}</span>
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
                          inputMode="decimal"
                          step="any"
                          min={0}
                          value={cantidad}
                          onChange={(e) => setCantidad(Number(e.target.value))}
                          className="h-8 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Antes: {item?.cantidad} {item?.unidad}. Ojo si cambia la unidad (p. ej. metros → piezas de 2 m).
                        </p>
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
          </div>

          {/* Footer — en celular: el aviso arriba y los botones a todo el ancho */}
          <div className="border-t px-3 py-2.5 sm:px-6 sm:py-3 bg-gray-50 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-gray-500">
              {faltante
                ? <span className="flex items-center gap-1 font-medium text-amber-700"><AlertCircle className="h-3 w-3" /> Falta: {faltante}</span>
                : <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> {selected?.codigo} seleccionado</span>
              }
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={loading} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleReemplazar}
                disabled={loading || !!faltante}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
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
