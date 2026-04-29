'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Plus, Save, Search, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface EmpleadoOpt {
  id: string
  documentoIdentidad: string | null
  tallaCamisa: string | null
  tallaPantalon: string | null
  tallaCalzado: string | null
  tallaCasco: string | null
  cargo: { nombre: string } | null
  departamento: { nombre: string } | null
  user: { id: string; name: string }
}

interface AlmacenOpt {
  id: string
  nombre: string
}

interface ProyectoOpt {
  id: string
  codigo: string
  nombre: string
}

interface CentroCostoOpt {
  id: string
  nombre: string
  tipo: string
}

interface CatalogoEppResult {
  id: string
  codigo: string
  descripcion: string
  marca: string | null
  modelo: string | null
  talla: string | null
  subcategoria: string
  requiereTalla: boolean
  tallaCampo: 'calzado' | 'camisa' | 'pantalon' | 'casco' | null
  vidaUtilDias: number | null
  unidad: { nombre: string }
}

interface ItemDraft {
  catalogoEppId: string
  codigo: string
  descripcion: string
  marca: string | null
  unidadNombre: string
  cantidad: number
  requiereTalla: boolean
  tallaCampo: string | null
  talla: string
  vidaUtilDias: number | null
  stockDisponible: number
  observaciones: string
}

export default function NuevaEntregaEppPage() {
  const router = useRouter()

  const [empleados, setEmpleados] = useState<EmpleadoOpt[]>([])
  const [almacenes, setAlmacenes] = useState<AlmacenOpt[]>([])
  const [proyectos, setProyectos] = useState<ProyectoOpt[]>([])
  const [centros, setCentros] = useState<CentroCostoOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [empleadoId, setEmpleadoId] = useState('')
  const [almacenId, setAlmacenId] = useState('')
  const [imputacion, setImputacion] = useState<{ proyectoId: string | null; centroCostoId: string | null }>({ proyectoId: null, centroCostoId: null })
  const [observaciones, setObservaciones] = useState('')
  const [items, setItems] = useState<ItemDraft[]>([])

  // Búsqueda en catálogo EPP
  const [catalogoQuery, setCatalogoQuery] = useState('')
  const [catalogoResults, setCatalogoResults] = useState<CatalogoEppResult[]>([])
  const [catalogoLoading, setCatalogoLoading] = useState(false)
  const catalogoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const cargar = async () => {
      try {
        const [resEmpleados, resAlmacenes, resProyectos, resCentros] = await Promise.all([
          fetch('/api/empleado'),
          fetch('/api/almacen'),
          fetch('/api/proyectos?fields=id,codigo,nombre&estadosActivos=true'),
          fetch('/api/centro-costo?activo=true'),
        ])
        if (resEmpleados.ok) setEmpleados((await resEmpleados.json()).filter((e: any) => e.activo))
        if (resAlmacenes.ok) {
          const data = await resAlmacenes.json()
          setAlmacenes(data)
          if (data.length === 1) setAlmacenId(data[0].id)
        }
        if (resProyectos.ok) setProyectos(await resProyectos.json())
        if (resCentros.ok) setCentros(await resCentros.json())
      } catch {
        toast.error('Error al cargar datos iniciales')
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  const empleado = empleados.find(e => e.id === empleadoId) ?? null

  const buscarCatalogo = async (q: string) => {
    if (q.trim().length < 2) {
      setCatalogoResults([])
      return
    }
    setCatalogoLoading(true)
    try {
      const res = await fetch(`/api/catalogo-epp/search?q=${encodeURIComponent(q.trim())}&limit=15`)
      if (res.ok) setCatalogoResults(await res.json())
    } catch {
      setCatalogoResults([])
    } finally {
      setCatalogoLoading(false)
    }
  }

  const handleCatalogoQuery = (val: string) => {
    setCatalogoQuery(val)
    if (catalogoTimerRef.current) clearTimeout(catalogoTimerRef.current)
    catalogoTimerRef.current = setTimeout(() => buscarCatalogo(val), 300)
  }

  // Determina la talla a usar para la entrega:
  // 1. Si el SKU del catálogo ya tiene `talla` definida, esa es la verdad (cada SKU es una talla específica).
  // 2. Si no, sugiere la talla del empleado según el tallaCampo (legacy).
  const tallaSugerida = (cat: CatalogoEppResult): string => {
    if (!cat.requiereTalla) return ''
    if (cat.talla) return cat.talla
    if (!empleado || !cat.tallaCampo) return ''
    return (
      (cat.tallaCampo === 'camisa' && empleado.tallaCamisa) ||
      (cat.tallaCampo === 'pantalon' && empleado.tallaPantalon) ||
      (cat.tallaCampo === 'calzado' && empleado.tallaCalzado) ||
      (cat.tallaCampo === 'casco' && empleado.tallaCasco) ||
      ''
    )
  }

  // Detecta si la talla del catálogo (cuando existe) coincide con la del empleado.
  // Devuelve un mensaje de aviso si NO coincide (talla del SKU != talla del empleado).
  const avisoMismatchTalla = (cat: CatalogoEppResult): string | null => {
    if (!cat.requiereTalla || !cat.talla || !empleado || !cat.tallaCampo) return null
    const tallaEmpleado =
      (cat.tallaCampo === 'camisa' && empleado.tallaCamisa) ||
      (cat.tallaCampo === 'pantalon' && empleado.tallaPantalon) ||
      (cat.tallaCampo === 'calzado' && empleado.tallaCalzado) ||
      (cat.tallaCampo === 'casco' && empleado.tallaCasco) ||
      ''
    if (!tallaEmpleado) return null
    if (tallaEmpleado.trim().toLowerCase() !== cat.talla.trim().toLowerCase()) {
      return `Empleado usa talla ${tallaEmpleado}, este SKU es talla ${cat.talla}`
    }
    return null
  }

  const consultarStock = async (catalogoEppId: string): Promise<number> => {
    if (!almacenId) return 0
    try {
      const res = await fetch(`/api/stock-epp?almacenId=${almacenId}`)
      if (!res.ok) return 0
      const lista: any[] = await res.json()
      const stock = lista.find(s => s.catalogoEpp.id === catalogoEppId)
      return stock?.cantidadDisponible ?? 0
    } catch {
      return 0
    }
  }

  const agregarDelCatalogo = async (cat: CatalogoEppResult) => {
    if (items.find(i => i.catalogoEppId === cat.id)) {
      toast.warning('Este EPP ya está en la lista')
      return
    }
    const stockDisponible = await consultarStock(cat.id)
    const aviso = avisoMismatchTalla(cat)
    if (aviso) toast.warning(aviso)
    setItems(prev => [
      ...prev,
      {
        catalogoEppId: cat.id,
        codigo: cat.codigo,
        descripcion: cat.descripcion,
        marca: cat.marca,
        unidadNombre: cat.unidad?.nombre ?? 'und',
        cantidad: 1,
        requiereTalla: cat.requiereTalla,
        tallaCampo: cat.tallaCampo,
        talla: tallaSugerida(cat),
        vidaUtilDias: cat.vidaUtilDias,
        stockDisponible,
        observaciones: '',
      },
    ])
    setCatalogoQuery('')
    setCatalogoResults([])
  }

  const updateItem = (idx: number, patch: Partial<ItemDraft>) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const guardar = async () => {
    if (!empleadoId) return toast.error('Selecciona un empleado')
    if (!almacenId) return toast.error('Selecciona un almacén')
    if (items.length === 0) return toast.error('Agrega al menos un EPP')

    for (const item of items) {
      if (item.cantidad <= 0) return toast.error(`Cantidad inválida en ${item.codigo}`)
      if (item.cantidad > item.stockDisponible) {
        return toast.error(`Stock insuficiente para ${item.codigo}: disponible ${item.stockDisponible}`)
      }
      if (item.requiereTalla && !item.talla.trim()) {
        return toast.error(`Falta indicar talla para ${item.codigo}`)
      }
    }

    setSaving(true)
    try {
      const payload = {
        empleadoId,
        almacenId,
        proyectoId: imputacion.proyectoId,
        centroCostoId: imputacion.centroCostoId,
        observaciones: observaciones.trim() || null,
        items: items.map(i => ({
          catalogoEppId: i.catalogoEppId,
          cantidad: i.cantidad,
          talla: i.requiereTalla ? i.talla.trim() : null,
          observaciones: i.observaciones || null,
        })),
      }
      const res = await fetch('/api/entrega-epp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al guardar')
      }
      const created = await res.json()
      toast.success(`Entrega ${created.numero} registrada`)
      router.push(`/seguridad/entregas/${created.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const imputacionValue = imputacion.proyectoId
    ? `proyecto:${imputacion.proyectoId}`
    : imputacion.centroCostoId
    ? `centro:${imputacion.centroCostoId}`
    : '__ninguna__'

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/seguridad/entregas">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Nueva entrega de EPPs</h1>
          <p className="text-sm text-muted-foreground">Registra los EPPs entregados a un empleado</p>
        </div>
      </div>

      {/* Empleado y almacén */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Datos generales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Empleado <span className="text-red-500">*</span></Label>
            <Combobox
              value={empleadoId}
              onValueChange={setEmpleadoId}
              placeholder="Seleccionar empleado..."
              searchPlaceholder="Buscar por nombre o DNI..."
              emptyMessage="Sin resultados"
              options={empleados.map(e => ({
                value: e.id,
                label: `${e.user.name}${e.documentoIdentidad ? ` · ${e.documentoIdentidad}` : ''}${e.cargo?.nombre ? ` · ${e.cargo.nombre}` : ''}`,
              }))}
            />
            {empleado && (
              <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                {empleado.tallaCamisa && <Badge variant="secondary">Camisa: {empleado.tallaCamisa}</Badge>}
                {empleado.tallaPantalon && <Badge variant="secondary">Pantalón: {empleado.tallaPantalon}</Badge>}
                {empleado.tallaCalzado && <Badge variant="secondary">Calzado: {empleado.tallaCalzado}</Badge>}
                {empleado.tallaCasco && <Badge variant="secondary">Casco: {empleado.tallaCasco}</Badge>}
                {!empleado.tallaCamisa && !empleado.tallaPantalon && !empleado.tallaCalzado && !empleado.tallaCasco && (
                  <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Sin tallas registradas</span>
                )}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Almacén <span className="text-red-500">*</span></Label>
            <Select value={almacenId} onValueChange={setAlmacenId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar almacén..." /></SelectTrigger>
              <SelectContent>{almacenes.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label className="text-xs">Imputación (opcional — proyecto o centro de costo)</Label>
            <p className="text-[10px] text-muted-foreground -mt-0.5">
              Solo para reportes — no genera gasto al proyecto. El costo contable se mantiene donde se compró el EPP.
            </p>
            <Select
              value={imputacionValue}
              onValueChange={v => {
                if (v === '__ninguna__') setImputacion({ proyectoId: null, centroCostoId: null })
                else if (v.startsWith('proyecto:')) setImputacion({ proyectoId: v.slice(9), centroCostoId: null })
                else if (v.startsWith('centro:')) setImputacion({ proyectoId: null, centroCostoId: v.slice(7) })
              }}
            >
              <SelectTrigger><SelectValue placeholder="Sin imputar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ninguna__"><span className="text-muted-foreground">Sin imputar</span></SelectItem>
                {proyectos.length > 0 && <div className="px-2 py-1 text-[10px] font-semibold text-blue-700 uppercase">Proyectos</div>}
                {proyectos.map(p => (
                  <SelectItem key={`p-${p.id}`} value={`proyecto:${p.id}`}>{p.codigo} — {p.nombre}</SelectItem>
                ))}
                {centros.length > 0 && <div className="px-2 py-1 text-[10px] font-semibold text-emerald-700 uppercase">Centros de costo</div>}
                {centros.map(c => (
                  <SelectItem key={`c-${c.id}`} value={`centro:${c.id}`}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label className="text-xs">Observaciones</Label>
            <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Notas adicionales..." />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">EPPs a entregar</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {/* Buscar en catálogo EPP */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Agregar EPP del catálogo</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={catalogoQuery}
                onChange={e => handleCatalogoQuery(e.target.value)}
                placeholder="Código o descripción (mín. 2 caracteres)"
                className="pl-8"
              />
              {catalogoLoading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
            {catalogoQuery.trim().length >= 2 && !catalogoLoading && (
              <div className="border rounded-md max-h-44 overflow-auto bg-background shadow-sm">
                {catalogoResults.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</div>
                ) : (
                  catalogoResults.map(c => {
                    const aviso = avisoMismatchTalla(c)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => agregarDelCatalogo(c)}
                        className="w-full text-left px-3 py-1.5 hover:bg-muted/60 border-b last:border-b-0 text-xs"
                      >
                        <div className="font-medium flex items-center gap-2">
                          <span>{c.descripcion}</span>
                          {c.talla && <Badge variant="outline" className="text-[9px] py-0 h-4 font-mono">talla {c.talla}</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                          <span>{c.codigo}</span>
                          {c.marca && <span>· {c.marca}</span>}
                          <span>· {c.unidad?.nombre}</span>
                          {aviso && <span className="text-amber-600">⚠ {aviso}</span>}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center border rounded-md border-dashed">Sin EPPs agregados</p>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => {
                const stockOk = it.cantidad <= it.stockDisponible
                return (
                  <div key={idx} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{it.descripcion}</div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                          <span>{it.codigo}</span>
                          {it.marca && <span>· {it.marca}</span>}
                          <span>· {it.unidadNombre}</span>
                          {it.vidaUtilDias && <span>· vida útil {it.vidaUtilDias}d</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Cantidad *</Label>
                        <Input type="number" min={0.01} step={0.01} value={it.cantidad}
                          onChange={e => updateItem(idx, { cantidad: parseFloat(e.target.value) || 0 })}
                          className={`h-8 text-sm ${stockOk ? '' : 'border-red-400'}`} />
                        <p className={`text-[10px] ${stockOk ? 'text-muted-foreground' : 'text-red-600'}`}>
                          Stock disponible: {it.stockDisponible} {it.unidadNombre}
                        </p>
                      </div>
                      {it.requiereTalla && (
                        <div className="space-y-1">
                          <Label className="text-[10px]">Talla * <span className="text-muted-foreground">({it.tallaCampo})</span></Label>
                          <Input value={it.talla}
                            onChange={e => updateItem(idx, { talla: e.target.value })}
                            placeholder="S/M/L o número" className="h-8 text-sm" />
                        </div>
                      )}
                      <div className="space-y-1 md:col-span-1">
                        <Label className="text-[10px]">Observación item</Label>
                        <Input value={it.observaciones}
                          onChange={e => updateItem(idx, { observaciones: e.target.value })}
                          className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href="/seguridad/entregas"><Button variant="outline" disabled={saving}>Cancelar</Button></Link>
        <Button onClick={guardar} disabled={saving || items.length === 0} className="bg-orange-600 hover:bg-orange-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Registrar entrega
        </Button>
      </div>
    </div>
  )
}
