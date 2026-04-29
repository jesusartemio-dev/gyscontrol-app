'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Download, FileSpreadsheet, Loader2, Pencil, Plus, Search, Upload } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import ModalImportarCatalogoEPP from '@/components/seguridad/ModalImportarCatalogoEPP'
import { exportarCatalogoEppAExcel } from '@/lib/utils/catalogoEppExcel'

const SUBCATEGORIAS = [
  { value: 'cabeza', label: 'Cabeza (cascos)' },
  { value: 'manos', label: 'Manos (guantes)' },
  { value: 'ojos', label: 'Ojos (lentes)' },
  { value: 'auditiva', label: 'Auditiva (tapones)' },
  { value: 'respiratoria', label: 'Respiratoria (mascarillas)' },
  { value: 'pies', label: 'Pies (calzado)' },
  { value: 'caida', label: 'Caída (arnés)' },
  { value: 'ropa', label: 'Ropa industrial' },
  { value: 'visibilidad', label: 'Visibilidad (chalecos)' },
  { value: 'otro', label: 'Otro' },
]

const TALLA_CAMPOS = [
  { value: 'calzado', label: 'Calzado' },
  { value: 'camisa', label: 'Camisa' },
  { value: 'pantalon', label: 'Pantalón' },
  { value: 'casco', label: 'Casco' },
]

interface Unidad {
  id: string
  nombre: string
}

interface CatalogoEppItem {
  id: string
  codigo: string
  descripcion: string
  marca: string | null
  modelo: string | null
  talla: string | null
  unidadId: string
  unidad: { id: string; nombre: string }
  subcategoria: string
  requiereTalla: boolean
  tallaCampo: string | null
  vidaUtilDias: number | null
  esConsumible: boolean
  precioReferencial: number | null
  monedaReferencial: string
  activo: boolean
}

interface DraftItem {
  id?: string
  codigo: string
  descripcion: string
  marca: string
  modelo: string
  talla: string
  unidadId: string
  subcategoria: string
  requiereTalla: boolean
  tallaCampo: string
  vidaUtilDias: string
  esConsumible: boolean
  precioReferencial: string
  monedaReferencial: string
  activo: boolean
}

const DRAFT_VACIO: DraftItem = {
  codigo: '',
  descripcion: '',
  marca: '',
  modelo: '',
  talla: '',
  unidadId: '',
  subcategoria: 'otro',
  requiereTalla: false,
  tallaCampo: '',
  vidaUtilDias: '',
  esConsumible: false,
  precioReferencial: '',
  monedaReferencial: 'PEN',
  activo: true,
}

export default function CatalogoEppPage() {
  const [items, setItems] = useState<CatalogoEppItem[]>([])
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroSub, setFiltroSub] = useState<string>('todas')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<DraftItem>({ ...DRAFT_VACIO })
  const [saving, setSaving] = useState(false)
  const [importarOpen, setImportarOpen] = useState(false)

  const cargar = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (!mostrarInactivos) params.set('activo', 'true')
      const [resItems, resUnidades] = await Promise.all([
        fetch(`/api/catalogo-epp?${params.toString()}`),
        fetch('/api/unidad'),
      ])
      if (resItems.ok) setItems(await resItems.json())
      if (resUnidades.ok) setUnidades(await resUnidades.json())
    } catch {
      toast.error('Error al cargar catálogo EPP')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [mostrarInactivos])

  const itemsFiltrados = items.filter(i => {
    if (filtroSub !== 'todas' && i.subcategoria !== filtroSub) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        i.codigo.toLowerCase().includes(q) ||
        i.descripcion.toLowerCase().includes(q) ||
        (i.marca || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const abrirCrear = () => {
    setDraft({ ...DRAFT_VACIO, unidadId: unidades[0]?.id ?? '' })
    setModalOpen(true)
  }

  const abrirEditar = (item: CatalogoEppItem) => {
    setDraft({
      id: item.id,
      codigo: item.codigo,
      descripcion: item.descripcion,
      marca: item.marca ?? '',
      modelo: item.modelo ?? '',
      talla: item.talla ?? '',
      unidadId: item.unidadId,
      subcategoria: item.subcategoria,
      requiereTalla: item.requiereTalla,
      tallaCampo: item.tallaCampo ?? '',
      vidaUtilDias: item.vidaUtilDias?.toString() ?? '',
      esConsumible: item.esConsumible,
      precioReferencial: item.precioReferencial?.toString() ?? '',
      monedaReferencial: item.monedaReferencial,
      activo: item.activo,
    })
    setModalOpen(true)
  }

  const guardar = async () => {
    if (!draft.codigo.trim()) return toast.error('Código es obligatorio')
    if (!draft.descripcion.trim()) return toast.error('Descripción es obligatoria')
    if (!draft.unidadId) return toast.error('Unidad es obligatoria')
    if (draft.requiereTalla && !draft.tallaCampo) {
      return toast.error('Selecciona el tipo de talla a consultar (Calzado/Camisa/Pantalón/Casco)')
    }
    if (draft.requiereTalla && !draft.talla.trim()) {
      return toast.error('Indica la talla específica de este SKU (ej. M, 40)')
    }

    setSaving(true)
    try {
      const payload = {
        codigo: draft.codigo.trim(),
        descripcion: draft.descripcion.trim(),
        marca: draft.marca.trim() || null,
        modelo: draft.modelo.trim() || null,
        talla: draft.requiereTalla ? draft.talla.trim() : null,
        unidadId: draft.unidadId,
        subcategoria: draft.subcategoria,
        requiereTalla: draft.requiereTalla,
        tallaCampo: draft.requiereTalla ? draft.tallaCampo : null,
        vidaUtilDias: draft.vidaUtilDias ? Number(draft.vidaUtilDias) : null,
        esConsumible: draft.esConsumible,
        precioReferencial: draft.precioReferencial ? Number(draft.precioReferencial) : null,
        monedaReferencial: draft.monedaReferencial,
        activo: draft.activo,
      }
      const url = draft.id ? `/api/catalogo-epp/${draft.id}` : '/api/catalogo-epp'
      const method = draft.id ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al guardar')
      }
      toast.success(draft.id ? 'EPP actualizado' : 'EPP creado')
      setModalOpen(false)
      cargar()
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/seguridad">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Catálogo EPP</h1>
          <p className="text-sm text-muted-foreground">Crea y administra los EPPs disponibles para entregar</p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportarCatalogoEppAExcel(items)}
          disabled={items.length === 0}
          title="Descargar el catálogo en formato Excel"
        >
          <Download className="h-4 w-4 mr-1" /> Exportar
        </Button>
        <Button variant="outline" onClick={() => setImportarOpen(true)}>
          <Upload className="h-4 w-4 mr-1" /> Importar
        </Button>
        <Button onClick={abrirCrear} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-1" /> Nuevo EPP
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Código, descripción o marca" className="pl-8" />
          </div>
          <Select value={filtroSub} onValueChange={setFiltroSub}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las subcategorías</SelectItem>
              {SUBCATEGORIAS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={mostrarInactivos} onCheckedChange={setMostrarInactivos} />
            Incluir inactivos
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : itemsFiltrados.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Sin EPPs registrados. Crea el primero.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Talla</TableHead>
                  <TableHead>Subcategoría</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Tipo talla</TableHead>
                  <TableHead className="text-right">Vida útil</TableHead>
                  <TableHead className="text-right">Precio ref.</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsFiltrados.map(item => (
                  <TableRow key={item.id} className={item.activo ? '' : 'opacity-50'}>
                    <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{item.descripcion}</div>
                      {item.modelo && <div className="text-[10px] text-muted-foreground">{item.modelo}</div>}
                    </TableCell>
                    <TableCell className="text-xs">{item.marca || '—'}</TableCell>
                    <TableCell className="text-xs font-mono font-semibold">{item.talla || '—'}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{item.subcategoria}</Badge></TableCell>
                    <TableCell className="text-xs">{item.unidad.nombre}</TableCell>
                    <TableCell className="text-xs">{item.requiereTalla ? item.tallaCampo : '—'}</TableCell>
                    <TableCell className="text-right text-xs">
                      {item.esConsumible ? <span className="text-amber-600">consumible</span> : item.vidaUtilDias ? `${item.vidaUtilDias}d` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      {item.precioReferencial ? `${item.monedaReferencial === 'USD' ? 'US$' : 'S/'} ${item.precioReferencial.toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => abrirEditar(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal crear/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Editar EPP' : 'Nuevo EPP'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Código *</Label>
              <Input value={draft.codigo} onChange={e => setDraft(d => ({ ...d, codigo: e.target.value }))} placeholder="EPP-CASCO-MSA-M" className="font-mono text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subcategoría *</Label>
              <Select value={draft.subcategoria} onValueChange={v => setDraft(d => ({ ...d, subcategoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUBCATEGORIAS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Descripción *</Label>
              <Input value={draft.descripcion} onChange={e => setDraft(d => ({ ...d, descripcion: e.target.value }))} placeholder="Ej: Casco de seguridad ABS" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Marca</Label>
              <Input value={draft.marca} onChange={e => setDraft(d => ({ ...d, marca: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Modelo</Label>
              <Input value={draft.modelo} onChange={e => setDraft(d => ({ ...d, modelo: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unidad *</Label>
              <Select value={draft.unidadId} onValueChange={v => setDraft(d => ({ ...d, unidadId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{unidades.map(u => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vida útil (días)</Label>
              <Input type="number" min={0} value={draft.vidaUtilDias} onChange={e => setDraft(d => ({ ...d, vidaUtilDias: e.target.value }))} placeholder="365 = anual" disabled={draft.esConsumible} />
              <p className="text-[10px] text-muted-foreground">Vacío o consumible = sin vencimiento</p>
            </div>
            <div className="col-span-2 border-t pt-3 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={draft.requiereTalla} onCheckedChange={v => setDraft(d => ({ ...d, requiereTalla: v, tallaCampo: v ? d.tallaCampo : '', talla: v ? d.talla : '' }))} />
                Requiere talla
              </label>
              {draft.requiereTalla && (
                <div className="grid grid-cols-2 gap-3 pl-7">
                  <div className="space-y-1">
                    <Label className="text-xs">Talla específica de este SKU *</Label>
                    <Input
                      value={draft.talla}
                      onChange={e => setDraft(d => ({ ...d, talla: e.target.value }))}
                      placeholder="Ej: M, L, 40"
                      className="h-8 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">El valor concreto (S/M/L o número) que define este SKU.</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de talla *</Label>
                    <Select value={draft.tallaCampo} onValueChange={v => setDraft(d => ({ ...d, tallaCampo: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Calzado / Camisa / ..." /></SelectTrigger>
                      <SelectContent>{TALLA_CAMPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Qué medida del empleado se consulta al entregar.</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={draft.esConsumible} onCheckedChange={v => setDraft(d => ({ ...d, esConsumible: v, vidaUtilDias: v ? '' : d.vidaUtilDias }))} />
                  Consumible
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={draft.activo} onCheckedChange={v => setDraft(d => ({ ...d, activo: v }))} />
                  Activo
                </label>
              </div>
            </div>
            <div className="col-span-2 grid grid-cols-[80px_1fr] gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Moneda</Label>
                <Select value={draft.monedaReferencial} onValueChange={v => setDraft(d => ({ ...d, monedaReferencial: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEN">S/</SelectItem>
                    <SelectItem value="USD">US$</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Precio referencial</Label>
                <Input type="number" min={0} step={0.01} value={draft.precioReferencial} onChange={e => setDraft(d => ({ ...d, precioReferencial: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {draft.id ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de importación masiva desde Excel */}
      <ModalImportarCatalogoEPP
        open={importarOpen}
        onOpenChange={setImportarOpen}
        unidades={unidades}
        onImportado={cargar}
      />
    </div>
  )
}
