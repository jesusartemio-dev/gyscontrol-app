'use client'

import React, { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Receipt, Search, X, Loader2, ChevronRight, Check, Banknote, FileCheck, XCircle, Lock,
  Upload, Download,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getHojasDeGastos,
  aprobarHoja,
  depositarHoja,
  validarHoja,
  cerrarHoja,
  rechazarHoja,
} from '@/lib/services/hojaDeGastos'
import { exportarRendicionesAExcel } from '@/lib/utils/rendicionExcel'
import { uploadHojaAdjunto, deleteHojaAdjunto } from '@/lib/services/hojaDeGastosAdjunto'
import type { HojaDeGastosAdjunto } from '@/types'
import RendicionImportExcelModal from '@/components/administracion/RendicionImportExcelModal'
import type { HojaDeGastos } from '@/types'

type TabFilter = 'todas' | 'enviado' | 'aprobado' | 'rendido' | 'validado' | 'cerrado' | 'rechazado'

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'aprobado', label: 'Por Depositar' },
  { key: 'todas', label: 'Todas' },
  { key: 'enviado', label: 'Por Aprobar' },
  { key: 'rendido', label: 'Rendidos' },
  { key: 'validado', label: 'Validados' },
  { key: 'cerrado', label: 'Cerrados' },
  { key: 'rechazado', label: 'Rechazados' },
]

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

const estadoColor: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  aprobado: 'bg-emerald-100 text-emerald-700',
  depositado: 'bg-purple-100 text-purple-700',
  rendido: 'bg-orange-100 text-orange-700',
  validado: 'bg-teal-100 text-teal-700',
  cerrado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-700',
}

function getAsignadoA(hoja: HojaDeGastos): string {
  if (hoja.proyecto) return `${hoja.proyecto.codigo} - ${hoja.proyecto.nombre}`
  if (hoja.centroCosto) return hoja.centroCosto.nombre
  return '-'
}

export default function GestionGastosPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Cargando...</span>
        </div>
      </div>
    }>
      <GestionGastosContent />
    </Suspense>
  )
}

function GestionGastosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('estado') as TabFilter) || 'aprobado'

  const [hojas, setHojas] = useState<HojaDeGastos[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [tab, setTab] = useState<TabFilter>(initialTab)
  const [searchTerm, setSearchTerm] = useState('')

  // Dialog states
  const [depositoTarget, setDepositoTarget] = useState<HojaDeGastos | null>(null)
  const [montoDeposito, setMontoDeposito] = useState('')
  const [depositoAdjuntos, setDepositoAdjuntos] = useState<HojaDeGastosAdjunto[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [rechazoTarget, setRechazoTarget] = useState<HojaDeGastos | null>(null)
  const [comentarioRechazo, setComentarioRechazo] = useState('')

  // Import/export state
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [proyectos, setProyectos] = useState<{ id: string; codigo: string; nombre: string }[]>([])
  const [centrosCosto, setCentrosCosto] = useState<{ id: string; nombre: string; activo: boolean }[]>([])
  const [empleados, setEmpleados] = useState<{ id: string; name: string | null; email: string }[]>([])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [data, proyRes, ccRes, empRes] = await Promise.all([
        getHojasDeGastos(),
        fetch('/api/proyectos?fields=id,codigo,nombre').then(r => r.json()),
        fetch('/api/centro-costo').then(r => r.json()),
        fetch('/api/admin/usuarios').then(r => r.json()),
      ])
      setHojas(data)
      setProyectos(Array.isArray(proyRes) ? proyRes : proyRes.data || [])
      setCentrosCosto(Array.isArray(ccRes) ? ccRes : ccRes.data || [])
      setEmpleados(Array.isArray(empRes) ? empRes : empRes.data || [])
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const executeAction = async (
    id: string,
    action: () => Promise<HojaDeGastos>,
    successMsg: string
  ) => {
    try {
      setActionLoading(id)
      await action()
      toast.success(successMsg)
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error en la operación')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAprobar = (hoja: HojaDeGastos) => {
    executeAction(hoja.id, () => aprobarHoja(hoja.id), `${hoja.numero} aprobado`)
  }

  const handleDepositar = async () => {
    if (!depositoTarget || !montoDeposito) return
    await executeAction(
      depositoTarget.id,
      () => depositarHoja(depositoTarget.id, parseFloat(montoDeposito)),
      `Depósito registrado para ${depositoTarget.numero}`
    )
    setDepositoTarget(null)
    setMontoDeposito('')
    setDepositoAdjuntos([])
  }

  const handleUploadConstancia = async (hojaId: string, file: File) => {
    try {
      setUploadingFile(true)
      const adjunto = await uploadHojaAdjunto(hojaId, file)
      setDepositoAdjuntos(prev => [...prev, adjunto])
      toast.success('Constancia subida')
    } catch (e: any) {
      toast.error(e.message || 'Error al subir constancia')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDeleteConstancia = async (adjuntoId: string) => {
    try {
      await deleteHojaAdjunto(adjuntoId)
      setDepositoAdjuntos(prev => prev.filter(a => a.id !== adjuntoId))
      toast.success('Constancia eliminada')
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar')
    }
  }

  const handleValidar = (hoja: HojaDeGastos) => {
    executeAction(hoja.id, () => validarHoja(hoja.id), `${hoja.numero} validado`)
  }

  const handleCerrar = (hoja: HojaDeGastos) => {
    executeAction(hoja.id, () => cerrarHoja(hoja.id), `${hoja.numero} cerrado`)
  }

  const handleRechazar = async () => {
    if (!rechazoTarget || !comentarioRechazo.trim()) return
    await executeAction(
      rechazoTarget.id,
      () => rechazarHoja(rechazoTarget.id, comentarioRechazo.trim()),
      `${rechazoTarget.numero} rechazado`
    )
    setRechazoTarget(null)
    setComentarioRechazo('')
  }

  // Counts per tab
  const counts = useMemo(() => {
    const c: Record<string, number> = { todas: hojas.length }
    for (const h of hojas) {
      c[h.estado] = (c[h.estado] || 0) + 1
    }
    return c
  }, [hojas])

  const filtered = useMemo(() => {
    let result = hojas
    // Exclude borradores from admin view
    if (tab === 'todas') {
      result = result.filter(h => h.estado !== 'borrador')
    } else if (tab === 'aprobado') {
      // "Por Depositar": solo aprobados que requieren anticipo
      result = result.filter(h => h.estado === 'aprobado' && h.requiereAnticipo)
    } else {
      result = result.filter(h => h.estado === tab)
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(h =>
        h.numero.toLowerCase().includes(term) ||
        h.motivo.toLowerCase().includes(term) ||
        h.proyecto?.codigo?.toLowerCase().includes(term) ||
        h.proyecto?.nombre?.toLowerCase().includes(term) ||
        h.centroCosto?.nombre?.toLowerCase().includes(term) ||
        h.empleado?.name?.toLowerCase().includes(term) ||
        h.empleado?.email?.toLowerCase().includes(term)
      )
    }
    return result
  }, [hojas, tab, searchTerm])

  const renderActions = (hoja: HojaDeGastos) => {
    const isLoading = actionLoading === hoja.id

    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    }

    switch (hoja.estado) {
      case 'enviado':
        return (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              onClick={() => handleAprobar(hoja)}
            >
              <Check className="h-3 w-3 mr-1" /> Aprobar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => { setRechazoTarget(hoja); setComentarioRechazo('') }}
            >
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        )
      case 'aprobado':
        return hoja.requiereAnticipo ? (
          <div onClick={e => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={() => {
                setDepositoTarget(hoja)
                setMontoDeposito(String(hoja.montoAnticipo || ''))
              }}
            >
              <Banknote className="h-3 w-3 mr-1" /> Depositar
            </Button>
          </div>
        ) : null
      case 'rendido':
        return (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-teal-300 text-teal-700 hover:bg-teal-50"
              onClick={() => handleValidar(hoja)}
            >
              <FileCheck className="h-3 w-3 mr-1" /> Validar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => { setRechazoTarget(hoja); setComentarioRechazo('') }}
            >
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        )
      case 'validado':
        return (
          <div onClick={e => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => handleCerrar(hoja)}
            >
              <Lock className="h-3 w-3 mr-1" /> Cerrar
            </Button>
          </div>
        )
      default:
        return null
    }
  }

  // Mobile card for each hoja
  const renderMobileCard = (hoja: HojaDeGastos) => (
    <div
      key={hoja.id}
      className="border-b last:border-b-0 px-4 py-3 hover:bg-muted/50 cursor-pointer"
      onClick={() => router.push(`/gastos/mis-requerimientos/${hoja.id}?from=administracion`)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-sm font-medium">{hoja.numero}</span>
            <Badge className={`text-[10px] ${estadoColor[hoja.estado] || ''}`}>
              {hoja.estado}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {hoja.empleado?.name || hoja.empleado?.email}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-mono text-sm">
            {hoja.montoGastado > 0 ? formatCurrency(hoja.montoGastado) : hoja.requiereAnticipo ? formatCurrency(hoja.montoAnticipo) : '-'}
          </div>
          <div className="text-[10px] text-muted-foreground">{formatDate(hoja.createdAt)}</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground truncate mb-2">
        {getAsignadoA(hoja)} — {hoja.motivo}
      </div>
      {renderActions(hoja)}
    </div>
  )

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-rose-600" />
            Gestión de Gastos
          </h1>
          <p className="text-sm text-muted-foreground">
            Administra todos los requerimientos de dinero
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => exportarRendicionesAExcel(hojas as any[])}
            disabled={hojas.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Exportar
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-rose-600 hover:bg-rose-700"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            Importar
          </Button>
        </div>
      </div>

      {/* Tab pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TABS.map(t => {
          const count = t.key === 'todas'
            ? hojas.filter(h => h.estado !== 'borrador').length
            : (counts[t.key] || 0)
          if (t.key !== 'todas' && count === 0) return null
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
              <span className={`text-[10px] ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar número, empleado, proyecto..."
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

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {hojas.length === 0 ? 'No hay requerimientos registrados.' : 'No se encontraron resultados.'}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Proyecto / CC</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Solicitado</TableHead>
                      <TableHead className="text-right">Gastado</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(hoja => (
                      <TableRow
                        key={hoja.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/gastos/mis-requerimientos/${hoja.id}?from=administracion`)}
                      >
                        <TableCell className="font-mono text-sm font-medium">{hoja.numero}</TableCell>
                        <TableCell className="text-sm max-w-[130px] truncate">
                          {hoja.empleado?.name || hoja.empleado?.email || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                          {getAsignadoA(hoja)}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-sm">{hoja.motivo}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${estadoColor[hoja.estado] || ''}`}>
                            {hoja.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {hoja.requiereAnticipo ? formatCurrency(hoja.montoAnticipo) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(hoja.montoGastado)}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm ${hoja.saldo < 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(hoja.saldo)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(hoja.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {renderActions(hoja)}
                            <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden">
                {filtered.map(renderMobileCard)}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Deposito dialog */}
      <Dialog open={!!depositoTarget} onOpenChange={(open) => { if (!open) setDepositoTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-purple-600" />
              Registrar Depósito
            </DialogTitle>
            <DialogDescription>
              Registre el monto depositado para {depositoTarget?.numero}.
              Anticipo solicitado: {depositoTarget ? formatCurrency(depositoTarget.montoAnticipo) : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Monto depositado (PEN) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={montoDeposito}
                onChange={(e) => setMontoDeposito(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {depositoTarget && (
              <div>
                <Label>Constancia de depósito</Label>
                <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    id="constancia-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file && depositoTarget) handleUploadConstancia(depositoTarget.id, file)
                      e.target.value = ''
                    }}
                  />
                  <label htmlFor="constancia-upload" className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    {uploadingFile ? (
                      <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</span>
                    ) : (
                      <span className="flex items-center justify-center gap-2"><Upload className="h-4 w-4" /> Subir constancia (PDF, JPG, PNG)</span>
                    )}
                  </label>
                </div>
                {depositoAdjuntos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {depositoAdjuntos.map(adj => (
                      <div key={adj.id} className="flex items-center justify-between text-xs bg-green-50 border border-green-200 rounded px-2 py-1">
                        <a href={adj.urlArchivo} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline truncate">{adj.nombreArchivo}</a>
                        <button onClick={() => handleDeleteConstancia(adj.id)} className="text-red-500 hover:text-red-700 ml-2"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositoTarget(null)}>Cancelar</Button>
            <Button
              onClick={handleDepositar}
              disabled={!!actionLoading || !montoDeposito}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rechazo dialog */}
      <Dialog open={!!rechazoTarget} onOpenChange={(open) => { if (!open) setRechazoTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Rechazar Requerimiento
            </DialogTitle>
            <DialogDescription>
              Rechazar {rechazoTarget?.numero}. El empleado podrá corregir y reenviar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Motivo del rechazo <span className="text-red-500">*</span></Label>
              <Textarea
                value={comentarioRechazo}
                onChange={(e) => setComentarioRechazo(e.target.value)}
                placeholder="Indique el motivo del rechazo..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazoTarget(null)}>Cancelar</Button>
            <Button
              onClick={handleRechazar}
              disabled={!!actionLoading || !comentarioRechazo.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Excel modal */}
      <RendicionImportExcelModal
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        proyectos={proyectos}
        centrosCosto={centrosCosto}
        empleados={empleados}
        onImported={loadData}
      />
    </div>
  )
}
