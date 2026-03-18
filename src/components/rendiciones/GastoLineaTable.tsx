'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Plus, Loader2, Trash2, Edit, Receipt, ScanLine, ShieldCheck, FileSpreadsheet, Download, ArrowRightLeft } from 'lucide-react'
import { createGastoLinea, updateGastoLinea, deleteGastoLinea } from '@/lib/services/gastoLinea'
import GastoAdjuntoUpload from './GastoAdjuntoUpload'
import CargaMasivaComprobantes from './CargaMasivaComprobantes'
import GastoLineaPreviewDrawer from './GastoLineaPreviewDrawer'
import GastoLineaImportExcelModal from './GastoLineaImportExcelModal'
import { exportarGastoLineasAExcel } from '@/lib/utils/gastoLineaExcel'
import type { GastoLinea, CategoriaGasto } from '@/types'

const TIPOS_COMPROBANTE = [
  { value: 'factura', label: 'Factura' },
  { value: 'boleta', label: 'Boleta' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'sin_comprobante', label: 'Sin comprobante' },
]

const CATEGORIAS_COSTO = [
  { value: 'equipos', label: 'Equipos' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'gastos', label: 'Gastos' },
]

interface HojaInfo {
  proyectoId?: string | null
  proyectoNombre?: string | null
  centroCostoId?: string | null
  centroCostoNombre?: string | null
  categoriaCosto?: string | null
}

interface GastoLineaTableProps {
  hojaDeGastosId: string
  lineas: GastoLinea[]
  categorias: CategoriaGasto[]
  editable: boolean
  onChanged: () => void
  showConformidad?: boolean
  hojaInfo?: HojaInfo
}

export default function GastoLineaTable({
  hojaDeGastosId,
  lineas,
  categorias,
  editable,
  onChanged,
  showConformidad = false,
  hojaInfo,
}: GastoLineaTableProps) {
  const [showForm, setShowForm] = useState(false)
  const [editLinea, setEditLinea] = useState<GastoLinea | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GastoLinea | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCargaMasiva, setShowCargaMasiva] = useState(false)
  const [showImportExcel, setShowImportExcel] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  // Form fields
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState('')
  const [monto, setMonto] = useState('')
  const [categoriaGastoId, setCategoriaGastoId] = useState('')
  const [tipoComprobante, setTipoComprobante] = useState('')
  const [numeroComprobante, setNumeroComprobante] = useState('')
  const [proveedorNombre, setProveedorNombre] = useState('')
  const [proveedorRuc, setProveedorRuc] = useState('')

  // Override fields
  const [showOverride, setShowOverride] = useState(false)
  const [overrideType, setOverrideType] = useState<'proyecto' | 'centroCosto' | ''>('')
  const [overrideProyectoId, setOverrideProyectoId] = useState('')
  const [overrideCentroCostoId, setOverrideCentroCostoId] = useState('')
  const [overrideCategoriaCosto, setOverrideCategoriaCosto] = useState('')

  // Lists for override selectors
  const [proyectos, setProyectos] = useState<{ id: string; nombre: string; codigo: string }[]>([])
  const [centrosCosto, setCentrosCosto] = useState<{ id: string; nombre: string }[]>([])
  const [loadingLists, setLoadingLists] = useState(false)

  // Load projects and cost centers when override is shown
  useEffect(() => {
    if (showOverride && proyectos.length === 0 && centrosCosto.length === 0) {
      loadOverrideLists()
    }
  }, [showOverride])

  const loadOverrideLists = async () => {
    try {
      setLoadingLists(true)
      const [proyRes, ccRes] = await Promise.all([
        fetch('/api/proyectos'),
        fetch('/api/centro-costo'),
      ])
      if (proyRes.ok) {
        const pData = await proyRes.json()
        setProyectos((pData.data || pData || []).map((p: any) => ({ id: p.id, nombre: p.nombre, codigo: p.codigo })))
      }
      if (ccRes.ok) {
        const ccData = await ccRes.json()
        setCentrosCosto((ccData.data || ccData || []).filter((cc: any) => cc.activo !== false).map((cc: any) => ({ id: cc.id, nombre: cc.nombre })))
      }
    } catch {
      // Silently fail - override is optional
    } finally {
      setLoadingLists(false)
    }
  }

  const resetForm = () => {
    setDescripcion('')
    setFecha('')
    setMonto('')
    setCategoriaGastoId('')
    setTipoComprobante('')
    setNumeroComprobante('')
    setProveedorNombre('')
    setProveedorRuc('')
    setShowOverride(false)
    setOverrideType('')
    setOverrideProyectoId('')
    setOverrideCentroCostoId('')
    setOverrideCategoriaCosto('')
    setEditLinea(null)
  }

  const openCreate = () => {
    resetForm()
    setFecha(new Date().toISOString().split('T')[0])
    setShowForm(true)
  }

  const openEdit = (linea: GastoLinea) => {
    setEditLinea(linea)
    setDescripcion(linea.descripcion)
    setFecha(linea.fecha ? linea.fecha.split('T')[0] : '')
    setMonto(String(linea.monto))
    setCategoriaGastoId(linea.categoriaGastoId || '')
    setTipoComprobante(linea.tipoComprobante || '')
    setNumeroComprobante(linea.numeroComprobante || '')
    setProveedorNombre(linea.proveedorNombre || '')
    setProveedorRuc(linea.proveedorRuc || '')

    // Load override state
    if (linea.proyectoId || linea.centroCostoId || linea.categoriaCosto) {
      setShowOverride(true)
      setOverrideType(linea.proyectoId ? 'proyecto' : linea.centroCostoId ? 'centroCosto' : '')
      setOverrideProyectoId(linea.proyectoId || '')
      setOverrideCentroCostoId(linea.centroCostoId || '')
      setOverrideCategoriaCosto(linea.categoriaCosto || '')
    } else {
      setShowOverride(false)
      setOverrideType('')
      setOverrideProyectoId('')
      setOverrideCentroCostoId('')
      setOverrideCategoriaCosto('')
    }

    setShowForm(true)
  }

  const getOverridePayload = (): { proyectoId: string | null; centroCostoId: string | null; categoriaCosto: 'equipos' | 'servicios' | 'gastos' | null } => {
    if (!showOverride) {
      return { proyectoId: null, centroCostoId: null, categoriaCosto: null }
    }
    return {
      proyectoId: overrideType === 'proyecto' && overrideProyectoId ? overrideProyectoId : null,
      centroCostoId: overrideType === 'centroCosto' && overrideCentroCostoId ? overrideCentroCostoId : null,
      categoriaCosto: (overrideCategoriaCosto as 'equipos' | 'servicios' | 'gastos') || null,
    }
  }

  const handleSave = async () => {
    if (!descripcion.trim() || !fecha || !monto || parseFloat(monto) <= 0) {
      toast.error('Complete los campos obligatorios')
      return
    }

    const overrideData = getOverridePayload()

    try {
      setLoading(true)
      if (editLinea) {
        await updateGastoLinea(editLinea.id, {
          descripcion: descripcion.trim(),
          fecha,
          monto: parseFloat(monto),
          categoriaGastoId: categoriaGastoId || null,
          tipoComprobante: tipoComprobante || null,
          numeroComprobante: numeroComprobante || null,
          proveedorNombre: proveedorNombre || null,
          proveedorRuc: proveedorRuc || null,
          ...overrideData,
        })
        toast.success('Linea actualizada')
      } else {
        await createGastoLinea({
          hojaDeGastosId,
          descripcion: descripcion.trim(),
          fecha,
          monto: parseFloat(monto),
          categoriaGastoId: categoriaGastoId || undefined,
          tipoComprobante: tipoComprobante || undefined,
          numeroComprobante: numeroComprobante || undefined,
          proveedorNombre: proveedorNombre || undefined,
          proveedorRuc: proveedorRuc || undefined,
          ...overrideData,
        })
        toast.success('Linea agregada')
      }
      setShowForm(false)
      resetForm()
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteGastoLinea(deleteTarget.id)
      toast.success('Linea eliminada')
      setDeleteTarget(null)
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

  const formatDate = (date: string) => {
    const d = date.split('T')[0]
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
  }

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true)
      await exportarGastoLineasAExcel(lineas)
      toast.success('Excel exportado')
    } catch {
      toast.error('Error al exportar')
    } finally {
      setExportingExcel(false)
    }
  }

  // Helper to get the effective destination display for a line
  const getDestinoLinea = (linea: GastoLinea) => {
    if (linea.proyecto) return linea.proyecto.codigo
    if (linea.centroCosto) return linea.centroCosto.nombre
    return null
  }

  const tieneOverride = (linea: GastoLinea) => {
    return !!(linea.proyectoId || linea.centroCostoId || linea.categoriaCosto)
  }

  const total = lineas.reduce((sum, l) => sum + l.monto, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Receipt className="h-4 w-4 text-orange-600" />
          Lineas de Gasto
          <span className="text-xs font-normal text-muted-foreground">({lineas.length})</span>
        </h3>
        <div className="flex items-center gap-2">
          {lineas.length > 0 && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleExportExcel} disabled={exportingExcel}>
              {exportingExcel ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
              Exportar
            </Button>
          )}
          {editable && (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowImportExcel(true)}>
                <FileSpreadsheet className="h-3 w-3 mr-1" />
                Importar Excel
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowCargaMasiva(true)}>
                <ScanLine className="h-3 w-3 mr-1" />
                Carga Masiva
              </Button>
              <Button size="sm" className="h-7 text-xs bg-orange-600 hover:bg-orange-700" onClick={openCreate}>
                <Plus className="h-3 w-3 mr-1" />
                Agregar Gasto
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-xs">
              <th className="text-left p-2 font-medium">Fecha</th>
              <th className="text-left p-2 font-medium">Descripcion</th>
              <th className="text-left p-2 font-medium">Categoria</th>
              <th className="text-left p-2 font-medium">Comprobante</th>
              <th className="text-right p-2 font-medium">Monto</th>
              <th className="text-left p-2 font-medium">Adjuntos</th>
              {editable && <th className="w-[60px]"></th>}
            </tr>
          </thead>
          <tbody>
            {lineas.length === 0 ? (
              <tr>
                <td colSpan={editable ? 7 : 6} className="text-center py-6 text-muted-foreground text-xs">
                  Sin lineas de gasto
                </td>
              </tr>
            ) : (
              lineas.map((linea, idx) => (
                <tr
                  key={linea.id}
                  className="border-t hover:bg-muted/30 cursor-pointer"
                  onClick={() => setPreviewIndex(idx)}
                >
                  <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(linea.fecha)}
                  </td>
                  <td className="p-2">
                    <span className="text-xs line-clamp-1">{linea.descripcion}</span>
                    {linea.proveedorNombre && (
                      <span className="text-[10px] text-muted-foreground block">{linea.proveedorNombre}</span>
                    )}
                    {tieneOverride(linea) && (
                      <span className="inline-flex items-center gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">
                          <ArrowRightLeft className="h-2.5 w-2.5 mr-0.5" />
                          {getDestinoLinea(linea) || ''}
                          {linea.categoriaCosto && ` (${linea.categoriaCosto})`}
                        </Badge>
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {linea.categoriaGasto?.nombre || '-'}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {linea.sunatVerificado === true && (
                        <ShieldCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      )}
                      {linea.tipoComprobante ? (
                        <span>
                          {TIPOS_COMPROBANTE.find(t => t.value === linea.tipoComprobante)?.label || linea.tipoComprobante}
                          {linea.numeroComprobante && ` #${linea.numeroComprobante}`}
                        </span>
                      ) : '-'}
                    </span>
                  </td>
                  <td className="p-2 text-right font-mono text-xs">
                    {formatCurrency(linea.monto)}
                  </td>
                  <td className="p-2" onClick={(e) => e.stopPropagation()}>
                    <GastoAdjuntoUpload
                      gastoLineaId={linea.id}
                      adjuntos={linea.adjuntos || []}
                      editable={editable}
                      onChanged={onChanged}
                    />
                  </td>
                  {editable && (
                    <td className="p-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(linea)}
                          className="p-1 rounded hover:bg-muted"
                        >
                          <Edit className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(linea)}
                          className="p-1 rounded hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
            {lineas.length > 0 && (
              <tr className="border-t bg-muted/30 font-medium">
                <td colSpan={4} className="p-2 text-xs text-right">Total:</td>
                <td className="p-2 text-right font-mono text-xs">{formatCurrency(total)}</td>
                <td colSpan={editable ? 2 : 1}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm() }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-orange-100">
                <Receipt className="h-4 w-4 text-orange-700" />
              </div>
              {editLinea ? 'Editar Gasto' : 'Agregar Gasto'}
            </DialogTitle>
            <DialogDescription>
              {editLinea ? 'Modifica los datos del gasto.' : 'Registra un nuevo gasto con su comprobante.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Fecha <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Monto (PEN) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Descripcion <span className="text-red-500">*</span></Label>
              <Input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Almuerzo equipo de obra"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Categoria</Label>
                <Select value={categoriaGastoId || '__none__'} onValueChange={(v) => setCategoriaGastoId(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin categoria</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Tipo comprobante</Label>
                <Select value={tipoComprobante || '__none__'} onValueChange={(v) => setTipoComprobante(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin especificar</SelectItem>
                    {TIPOS_COMPROBANTE.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">N° comprobante</Label>
                <Input
                  value={numeroComprobante}
                  onChange={(e) => setNumeroComprobante(e.target.value)}
                  placeholder="F001-00123"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">RUC proveedor</Label>
                <Input
                  value={proveedorRuc}
                  onChange={(e) => setProveedorRuc(e.target.value)}
                  placeholder="20123456789"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Nombre proveedor</Label>
              <Input
                value={proveedorNombre}
                onChange={(e) => setProveedorNombre(e.target.value)}
                placeholder="Restaurante El Buen Sabor"
                disabled={loading}
              />
            </div>

            {/* Override de imputacion */}
            <div className="border-t pt-3">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => {
                  setShowOverride(!showOverride)
                  if (showOverride) {
                    setOverrideType('')
                    setOverrideProyectoId('')
                    setOverrideCentroCostoId('')
                    setOverrideCategoriaCosto('')
                  }
                }}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                {showOverride ? 'Quitar destino diferente' : 'Asignar a otro proyecto / centro de costo'}
              </button>

              {showOverride && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <p className="text-xs text-blue-700">
                    Este gasto se imputara a un destino diferente al del requerimiento
                    {hojaInfo?.proyectoNombre && ` (${hojaInfo.proyectoNombre})`}
                    {hojaInfo?.centroCostoNombre && ` (${hojaInfo.centroCostoNombre})`}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo de destino</Label>
                      <Select
                        value={overrideType || '__none__'}
                        onValueChange={(v) => {
                          setOverrideType(v === '__none__' ? '' : v as 'proyecto' | 'centroCosto')
                          setOverrideProyectoId('')
                          setOverrideCentroCostoId('')
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sin especificar</SelectItem>
                          <SelectItem value="proyecto">Proyecto</SelectItem>
                          <SelectItem value="centroCosto">Centro de Costo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo de costo</Label>
                      <Select
                        value={overrideCategoriaCosto || '__none__'}
                        onValueChange={(v) => setOverrideCategoriaCosto(v === '__none__' ? '' : v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Heredar del req." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Heredar del requerimiento</SelectItem>
                          {CATEGORIAS_COSTO.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {overrideType === 'proyecto' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Proyecto</Label>
                      {loadingLists ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground p-2">
                          <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
                        </div>
                      ) : (
                        <Select value={overrideProyectoId || '__none__'} onValueChange={(v) => setOverrideProyectoId(v === '__none__' ? '' : v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleccionar proyecto..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Sin seleccionar</SelectItem>
                            {proyectos.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.codigo} - {p.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {overrideType === 'centroCosto' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Centro de Costo</Label>
                      {loadingLists ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground p-2">
                          <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
                        </div>
                      ) : (
                        <Select value={overrideCentroCostoId || '__none__'} onValueChange={(v) => setOverrideCentroCostoId(v === '__none__' ? '' : v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleccionar centro de costo..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Sin seleccionar</SelectItem>
                            {centrosCosto.map((cc) => (
                              <SelectItem key={cc.id} value={cc.id}>{cc.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }} disabled={loading} className="h-9">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !descripcion.trim() || !fecha || !monto}
              className="h-9 bg-orange-600 hover:bg-orange-700"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              {editLinea ? 'Guardar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Eliminar Linea de Gasto
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar &quot;{deleteTarget?.descripcion}&quot;? Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-9 bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import from Excel */}
      <GastoLineaImportExcelModal
        isOpen={showImportExcel}
        onClose={() => setShowImportExcel(false)}
        hojaDeGastosId={hojaDeGastosId}
        categorias={categorias}
        onSuccess={onChanged}
      />

      {/* Bulk upload dialog */}
      <CargaMasivaComprobantes
        open={showCargaMasiva}
        onOpenChange={setShowCargaMasiva}
        hojaDeGastosId={hojaDeGastosId}
        categorias={categorias}
        onSuccess={onChanged}
      />

      {/* Preview drawer */}
      <GastoLineaPreviewDrawer
        lineas={lineas}
        currentIndex={previewIndex}
        onIndexChange={setPreviewIndex}
        categorias={categorias}
        editable={editable}
        onChanged={onChanged}
        showConformidad={showConformidad}
      />
    </div>
  )
}
