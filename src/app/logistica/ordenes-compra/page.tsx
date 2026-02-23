'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Search, X, Loader2, FileText, ChevronRight, Edit, Trash2, Upload, Download } from 'lucide-react'
import { toast } from 'sonner'
import { getOrdenesCompra, deleteOrdenCompra } from '@/lib/services/ordenCompra'
import OCImportExcelModal from '@/components/logistica/OCImportExcelModal'
import { exportarOCAExcel } from '@/lib/utils/ordenCompraExcel'
import type { OrdenCompra } from '@/types'

interface ProveedorRef { id: string; nombre: string; ruc: string | null }
interface ProyectoRef { id: string; codigo: string; nombre: string }
interface CentroCostoRef { id: string; nombre: string; activo: boolean }

const ESTADOS = [
  { value: 'all', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
]

const CATEGORIAS = [
  { value: 'all', label: 'Todas' },
  { value: 'equipos', label: 'Equipos' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'gastos', label: 'Gastos' },
]

const formatCurrency = (amount: number, moneda = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

const estadoColor: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  aprobada: 'bg-emerald-100 text-emerald-700',
  enviada: 'bg-blue-100 text-blue-700',
  confirmada: 'bg-purple-100 text-purple-700',
  parcial: 'bg-orange-100 text-orange-700',
  completada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-700',
}

const categoriaLabel: Record<string, string> = {
  equipos: 'Equipos',
  servicios: 'Servicios',
  gastos: 'Gastos',
}

function getAsignadoA(oc: OrdenCompra): string {
  if (oc.proyecto) return `${oc.proyecto.codigo} - ${oc.proyecto.nombre}`
  if (oc.centroCosto) return oc.centroCosto.nombre
  return '-'
}

export default function OrdenesCompraPage() {
  const router = useRouter()
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterCategoria, setFilterCategoria] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<OrdenCompra | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [proveedores, setProveedores] = useState<ProveedorRef[]>([])
  const [proyectos, setProyectos] = useState<ProyectoRef[]>([])
  const [centrosCosto, setCentrosCosto] = useState<CentroCostoRef[]>([])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [ocData, provRes, proyRes, ccRes] = await Promise.all([
        getOrdenesCompra(),
        fetch('/api/proveedores').then(r => r.json()),
        fetch('/api/proyectos?fields=id,codigo,nombre').then(r => r.json()),
        fetch('/api/centro-costo').then(r => r.json()),
      ])
      setOrdenes(ocData)
      setProveedores(provRes.data || provRes || [])
      setProyectos(Array.isArray(proyRes) ? proyRes : proyRes.data || [])
      setCentrosCosto(Array.isArray(ccRes) ? ccRes : ccRes.data || [])
    } catch {
      toast.error('Error al cargar órdenes de compra')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteOrdenCompra(deleteTarget.id)
      toast.success(`OC ${deleteTarget.numero} eliminada`)
      setDeleteTarget(null)
      loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const filtered = useMemo(() => {
    let result = ordenes
    if (filterEstado !== 'all') result = result.filter(o => o.estado === filterEstado)
    if (filterCategoria !== 'all') result = result.filter(o => o.categoriaCosto === filterCategoria)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(o =>
        o.numero.toLowerCase().includes(term) ||
        o.proveedor?.nombre?.toLowerCase().includes(term) ||
        o.proyecto?.codigo?.toLowerCase().includes(term) ||
        o.proyecto?.nombre?.toLowerCase().includes(term) ||
        o.centroCosto?.nombre?.toLowerCase().includes(term) ||
        o.observaciones?.toLowerCase().includes(term)
      )
    }
    return result
  }, [ordenes, filterEstado, filterCategoria, searchTerm])

  // Stats
  const stats = useMemo(() => {
    const pendAprobacion = ordenes.filter(o => o.estado === 'borrador').length
    const enviadas = ordenes.filter(o => o.estado === 'enviada').length
    const totalComprometido = ordenes
      .filter(o => !['cancelada', 'borrador'].includes(o.estado))
      .reduce((s, o) => s + o.total, 0)
    return { pendAprobacion, enviadas, totalComprometido }
  }, [ordenes])

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-600" />
            Órdenes de Compra
          </h1>
          <p className="text-sm text-muted-foreground">
            {ordenes.length} órdenes | {stats.pendAprobacion} por aprobar | {stats.enviadas} enviadas | Comprometido: {formatCurrency(stats.totalComprometido)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => exportarOCAExcel(filtered as any)}
          >
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-1" />
            Importar
          </Button>
          <Button onClick={() => router.push('/logistica/ordenes-compra/nueva')} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-1" />
            Nueva OC
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, proveedor, proyecto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2.5">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS.map(e => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {ordenes.length === 0 ? 'No hay órdenes de compra aún. Crea la primera.' : 'No se encontraron resultados.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Asignado a</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(oc => (
                  <TableRow
                    key={oc.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/logistica/ordenes-compra/${oc.id}`)}
                  >
                    <TableCell className="font-mono text-sm font-medium">{oc.numero}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{oc.proveedor?.nombre || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {getAsignadoA(oc)}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground capitalize">
                        {categoriaLabel[oc.categoriaCosto] || oc.categoriaCosto}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${estadoColor[oc.estado] || ''}`}>
                        {oc.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const cxp = (oc as any).cuentasPorPagar?.[0]
                        if (!cxp) return <span className="text-[10px] text-gray-400">Sin factura</span>
                        if (cxp.numeroFactura) return <Badge className="text-[10px] bg-green-100 text-green-700">{cxp.estado === 'pagada' ? 'Pagada' : 'Facturada'}</Badge>
                        return <Badge className="text-[10px] bg-yellow-100 text-yellow-700">CxP sin factura</Badge>
                      })()}
                    </TableCell>
                    <TableCell className="text-center text-sm">{oc.items?.length || 0}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(oc.total, oc.moneda)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(oc.fechaEmision)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {oc.estado === 'borrador' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/logistica/ordenes-compra/${oc.id}`) }}
                              className="p-1 rounded hover:bg-muted"
                              title="Editar"
                            >
                              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(oc) }}
                              className="p-1 rounded hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </button>
                          </>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Orden de Compra</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar la OC &quot;{deleteTarget?.numero}&quot;? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <OCImportExcelModal
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        proveedores={proveedores}
        proyectos={proyectos}
        centrosCosto={centrosCosto}
        onImported={loadData}
      />
    </div>
  )
}
