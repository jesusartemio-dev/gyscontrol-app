'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, Loader2, Trash2, Edit, Receipt } from 'lucide-react'
import { createGastoLinea, updateGastoLinea, deleteGastoLinea } from '@/lib/services/gastoLinea'
import GastoAdjuntoUpload from './GastoAdjuntoUpload'
import type { GastoLinea, CategoriaGasto } from '@/types'

const TIPOS_COMPROBANTE = [
  { value: 'factura', label: 'Factura' },
  { value: 'boleta', label: 'Boleta' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'sin_comprobante', label: 'Sin comprobante' },
]

interface GastoLineaTableProps {
  rendicionGastoId: string
  lineas: GastoLinea[]
  categorias: CategoriaGasto[]
  editable: boolean
  onChanged: () => void
}

export default function GastoLineaTable({
  rendicionGastoId,
  lineas,
  categorias,
  editable,
  onChanged,
}: GastoLineaTableProps) {
  const [showForm, setShowForm] = useState(false)
  const [editLinea, setEditLinea] = useState<GastoLinea | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GastoLinea | null>(null)
  const [loading, setLoading] = useState(false)

  // Form fields
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState('')
  const [monto, setMonto] = useState('')
  const [categoriaGastoId, setCategoriaGastoId] = useState('')
  const [tipoComprobante, setTipoComprobante] = useState('')
  const [numeroComprobante, setNumeroComprobante] = useState('')
  const [proveedorNombre, setProveedorNombre] = useState('')
  const [proveedorRuc, setProveedorRuc] = useState('')

  const resetForm = () => {
    setDescripcion('')
    setFecha('')
    setMonto('')
    setCategoriaGastoId('')
    setTipoComprobante('')
    setNumeroComprobante('')
    setProveedorNombre('')
    setProveedorRuc('')
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
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!descripcion.trim() || !fecha || !monto || parseFloat(monto) <= 0) {
      toast.error('Complete los campos obligatorios')
      return
    }

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
        })
        toast.success('Línea actualizada')
      } else {
        await createGastoLinea({
          rendicionGastoId,
          descripcion: descripcion.trim(),
          fecha,
          monto: parseFloat(monto),
          categoriaGastoId: categoriaGastoId || undefined,
          tipoComprobante: tipoComprobante || undefined,
          numeroComprobante: numeroComprobante || undefined,
          proveedorNombre: proveedorNombre || undefined,
          proveedorRuc: proveedorRuc || undefined,
        })
        toast.success('Línea agregada')
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
      toast.success('Línea eliminada')
      setDeleteTarget(null)
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })

  const total = lineas.reduce((sum, l) => sum + l.monto, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Receipt className="h-4 w-4 text-orange-600" />
          Líneas de Gasto
          <span className="text-xs font-normal text-muted-foreground">({lineas.length})</span>
        </h3>
        {editable && (
          <Button size="sm" className="h-7 text-xs bg-orange-600 hover:bg-orange-700" onClick={openCreate}>
            <Plus className="h-3 w-3 mr-1" />
            Agregar Gasto
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-xs">
              <th className="text-left p-2 font-medium">Fecha</th>
              <th className="text-left p-2 font-medium">Descripción</th>
              <th className="text-left p-2 font-medium">Categoría</th>
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
                  Sin líneas de gasto
                </td>
              </tr>
            ) : (
              lineas.map((linea) => (
                <tr key={linea.id} className="border-t hover:bg-muted/30">
                  <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(linea.fecha)}
                  </td>
                  <td className="p-2">
                    <span className="text-xs line-clamp-1">{linea.descripcion}</span>
                    {linea.proveedorNombre && (
                      <span className="text-[10px] text-muted-foreground block">{linea.proveedorNombre}</span>
                    )}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {linea.categoriaGasto?.nombre || '-'}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {linea.tipoComprobante ? (
                      <span>
                        {TIPOS_COMPROBANTE.find(t => t.value === linea.tipoComprobante)?.label || linea.tipoComprobante}
                        {linea.numeroComprobante && ` #${linea.numeroComprobante}`}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-2 text-right font-mono text-xs">
                    {formatCurrency(linea.monto)}
                  </td>
                  <td className="p-2">
                    <GastoAdjuntoUpload
                      gastoLineaId={linea.id}
                      adjuntos={linea.adjuntos || []}
                      editable={editable}
                      onChanged={onChanged}
                    />
                  </td>
                  {editable && (
                    <td className="p-2">
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
        <DialogContent className="sm:max-w-lg">
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
              <Label className="text-sm">Descripción <span className="text-red-500">*</span></Label>
              <Input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Almuerzo equipo de obra"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Categoría</Label>
                <Select value={categoriaGastoId || '__none__'} onValueChange={(v) => setCategoriaGastoId(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin categoría</SelectItem>
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
              Eliminar Línea de Gasto
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar &quot;{deleteTarget?.descripcion}&quot;? Esta acción no se puede deshacer.
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
    </div>
  )
}
