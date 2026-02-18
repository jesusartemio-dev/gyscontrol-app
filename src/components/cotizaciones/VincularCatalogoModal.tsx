'use client'

import { useEffect, useState } from 'react'
import { Search, Link2, Plus, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { getUnidades } from '@/lib/services/unidad'
import type { CatalogoEquipo, CategoriaEquipo, Unidad, CotizacionEquipoItem } from '@/types'

type Tab = 'buscar' | 'crear'

interface Props {
  item: CotizacionEquipoItem | null
  isOpen: boolean
  onClose: () => void
  onVinculado: (updatedItem: CotizacionEquipoItem) => void
}

export default function VincularCatalogoModal({ item, isOpen, onClose, onVinculado }: Props) {
  const [tab, setTab] = useState<Tab>('buscar')
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([])
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [filtro, setFiltro] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('__ALL__')
  const [saving, setSaving] = useState(false)

  // Form state for "crear nuevo"
  const [nuevoCodigo, setNuevoCodigo] = useState('')
  const [nuevaDescripcion, setNuevaDescripcion] = useState('')
  const [nuevaMarca, setNuevaMarca] = useState('')
  const [nuevoPrecioLista, setNuevoPrecioLista] = useState('')
  const [nuevaCategoriaId, setNuevaCategoriaId] = useState('')
  const [nuevaUnidadId, setNuevaUnidadId] = useState('')

  useEffect(() => {
    if (isOpen) {
      getCatalogoEquipos().then(setEquipos)
      getCategoriasEquipo().then(setCategorias)
      getUnidades().then(setUnidades)
      setTab('buscar')
      setFiltro(item?.codigo || '')
    }
  }, [isOpen, item])

  useEffect(() => {
    if (isOpen && item && tab === 'crear') {
      setNuevoCodigo(item.codigo || '')
      setNuevaDescripcion(item.descripcion?.replace(/\s*\[.*?\]\s*$/g, '') || '')
      setNuevaMarca(item.marca || '')
      setNuevoPrecioLista(String(item.precioLista || ''))
      setNuevaCategoriaId(categorias[0]?.id || '')
    }
  }, [tab, isOpen, item, categorias])

  if (!item) return null

  const equiposFiltrados = equipos.filter(eq =>
    (filtroCategoria === '__ALL__' || eq.categoriaId === filtroCategoria) &&
    (`${eq.codigo} ${eq.descripcion} ${eq.marca || ''}`.toLowerCase().includes(filtro.toLowerCase()))
  ).slice(0, 50)

  const handleVincularExistente = async (catalogo: CatalogoEquipo) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/cotizacion-equipo-item/${item.id}/vincular`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogoEquipoId: catalogo.id }),
      })
      if (!res.ok) throw new Error('Error al vincular')
      const updated = await res.json()
      onVinculado(updated)
      toast.success(`Vinculado a ${catalogo.codigo}`)
      onClose()
    } catch {
      toast.error('Error al vincular al catálogo')
    } finally {
      setSaving(false)
    }
  }

  const handleCrearNuevo = async () => {
    if (!nuevoCodigo || !nuevaDescripcion || !nuevoPrecioLista || !nuevaCategoriaId || !nuevaUnidadId) {
      toast.error('Completa los campos requeridos')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/cotizacion-equipo-item/${item.id}/vincular`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nuevoCatalogo: {
            codigo: nuevoCodigo,
            descripcion: nuevaDescripcion,
            marca: nuevaMarca,
            precioLista: Number(nuevoPrecioLista),
            categoriaId: nuevaCategoriaId,
            unidadId: nuevaUnidadId || undefined,
          },
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al crear')
      }
      const updated = await res.json()
      onVinculado(updated)
      toast.success(`Creado y vinculado: ${nuevoCodigo}`)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear en catálogo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">Vincular al catálogo: {item.codigo}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b pb-2">
          <button
            onClick={() => setTab('buscar')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-t text-xs font-medium transition-colors ${
              tab === 'buscar' ? 'bg-blue-50 text-blue-700 border border-b-0 border-blue-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Search className="h-3 w-3" /> Buscar existente
          </button>
          <button
            onClick={() => setTab('crear')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-t text-xs font-medium transition-colors ${
              tab === 'crear' ? 'bg-green-50 text-green-700 border border-b-0 border-green-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus className="h-3 w-3" /> Crear nuevo
          </button>
        </div>

        {tab === 'buscar' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Buscar por código, descripción o marca..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <select
                className="border rounded px-2 text-xs h-8"
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
              >
                <option value="__ALL__">Todas</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div className="max-h-[250px] overflow-y-auto border rounded">
              {equiposFiltrados.length === 0 ? (
                <p className="p-4 text-center text-xs text-gray-500">No se encontraron equipos</p>
              ) : (
                equiposFiltrados.map(eq => (
                  <button
                    key={eq.id}
                    onClick={() => handleVincularExistente(eq)}
                    disabled={saving}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-blue-50 border-b text-xs transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-blue-700">{eq.codigo}</div>
                      <div className="text-gray-600 truncate">{eq.descripcion}</div>
                      {eq.marca && <div className="text-[10px] text-gray-400">{eq.marca}</div>}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="font-mono text-green-700">${eq.precioVenta?.toFixed(2)}</div>
                      <Link2 className="h-3 w-3 text-blue-400 ml-auto" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'crear' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Código *</Label>
                <Input value={nuevoCodigo} onChange={e => setNuevoCodigo(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Marca</Label>
                <Input value={nuevaMarca} onChange={e => setNuevaMarca(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descripción *</Label>
              <Input value={nuevaDescripcion} onChange={e => setNuevaDescripcion(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Precio Lista *</Label>
                <Input type="number" value={nuevoPrecioLista} onChange={e => setNuevoPrecioLista(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Categoría *</Label>
                <select
                  className="border rounded px-2 h-8 text-xs w-full"
                  value={nuevaCategoriaId}
                  onChange={e => setNuevaCategoriaId(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Unidad *</Label>
                <select
                  className="border rounded px-2 h-8 text-xs w-full"
                  value={nuevaUnidadId}
                  onChange={e => setNuevaUnidadId(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={handleCrearNuevo} disabled={saving} className="w-full h-8 text-xs">
              {saving ? 'Creando...' : 'Crear en catálogo y vincular'}
            </Button>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            <X className="h-3 w-3 mr-1" /> Dejar como temporal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
