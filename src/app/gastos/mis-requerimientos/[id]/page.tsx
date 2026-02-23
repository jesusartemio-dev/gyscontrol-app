'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Loader2,
  Send,
  CheckCircle,
  Banknote,
  FileCheck,
  XCircle,
  Lock,
  CreditCard,
  User,
  Calendar,
  MessageSquare,
  Upload,
  X,
  History,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getHojaDeGastosById,
  enviarHoja,
  aprobarHoja,
  depositarHoja,
  rendirHoja,
  validarHoja,
  cerrarHoja,
  rechazarHoja,
} from '@/lib/services/hojaDeGastos'
import { getGastoLineas } from '@/lib/services/gastoLinea'
import EstadoStepper from '@/components/finanzas/EstadoStepper'
import ResumenFinanciero from '@/components/finanzas/ResumenFinanciero'
import GastoLineaTable from '@/components/rendiciones/GastoLineaTable'
import HojaEventosTimeline from '@/components/finanzas/HojaEventosTimeline'
import { uploadHojaAdjunto, deleteHojaAdjunto } from '@/lib/services/hojaDeGastosAdjunto'
import type { HojaDeGastos, GastoLinea, CategoriaGasto, HojaDeGastosAdjunto } from '@/types'

const formatDate = (date: string | null | undefined) =>
  date ? new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

export default function RequerimientoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const [hoja, setHoja] = useState<HojaDeGastos | null>(null)
  const [lineas, setLineas] = useState<GastoLinea[]>([])
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Rechazar dialog
  const [showRechazo, setShowRechazo] = useState(false)
  const [comentarioRechazo, setComentarioRechazo] = useState('')

  // Depositar dialog
  const [showDeposito, setShowDeposito] = useState(false)
  const [montoDeposito, setMontoDeposito] = useState('')
  const [depositoAdjuntos, setDepositoAdjuntos] = useState<HojaDeGastosAdjunto[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)

  const role = session?.user?.role

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      const [hojaData, lineasData, catRes] = await Promise.all([
        getHojaDeGastosById(id),
        getGastoLineas(id),
        fetch('/api/categoria-gasto').then(r => r.ok ? r.json() : []),
      ])
      if (!hojaData) {
        toast.error('Requerimiento no encontrado')
        router.push('/gastos/mis-requerimientos')
        return
      }
      setHoja(hojaData)
      setLineas(lineasData)
      setCategorias(catRes)
    } catch {
      toast.error('Error al cargar requerimiento')
    } finally {
      setLoading(false)
    }
  }

  const executeAction = async (action: () => Promise<HojaDeGastos>, successMsg: string) => {
    try {
      setActionLoading(true)
      const updated = await action()
      setHoja(updated)
      toast.success(successMsg)
      // Reload lineas in case saldo changed
      const newLineas = await getGastoLineas(id)
      setLineas(newLineas)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error en la operación')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEnviar = () => executeAction(() => enviarHoja(id), 'Requerimiento enviado')
  const handleAprobar = () => executeAction(() => aprobarHoja(id), 'Requerimiento aprobado')
  const handleRendir = () => executeAction(() => rendirHoja(id), 'Rendición enviada')
  const handleValidar = () => executeAction(() => validarHoja(id), 'Rendición validada')
  const handleCerrar = () => executeAction(() => cerrarHoja(id), 'Requerimiento cerrado')

  const handleDepositar = async () => {
    const monto = parseFloat(montoDeposito)
    if (!monto || monto <= 0) {
      toast.error('Ingrese un monto válido')
      return
    }
    await executeAction(() => depositarHoja(id, monto), 'Depósito registrado')
    setShowDeposito(false)
    setMontoDeposito('')
    setDepositoAdjuntos([])
  }

  const handleUploadConstancia = async (file: File) => {
    try {
      setUploadingFile(true)
      const adjunto = await uploadHojaAdjunto(id, file)
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

  const handleRechazar = async () => {
    if (!comentarioRechazo.trim()) {
      toast.error('Ingrese un comentario de rechazo')
      return
    }
    await executeAction(() => rechazarHoja(id, comentarioRechazo.trim()), 'Requerimiento rechazado')
    setShowRechazo(false)
    setComentarioRechazo('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!hoja) return null

  const isEditable = ['borrador', 'rechazado', 'aprobado', 'depositado'].includes(hoja.estado)
  const canEnviar = ['borrador', 'rechazado'].includes(hoja.estado)
  const canAprobar = hoja.estado === 'enviado' && ['admin', 'gerente', 'gestor', 'coordinador', 'administracion'].includes(role || '')
  const canDepositar = hoja.estado === 'aprobado' && hoja.requiereAnticipo && ['admin', 'gerente', 'administracion'].includes(role || '')
  const canRendir = (hoja.estado === 'aprobado' && !hoja.requiereAnticipo) || hoja.estado === 'depositado'
  const canValidarLineas = hoja.estado === 'rendido' && ['admin', 'gerente', 'administracion'].includes(role || '')
  const allLineasConforme = lineas.length > 0 && lineas.every(l => l.conformidad === 'conforme')
  const canValidar = canValidarLineas && allLineasConforme
  const canCerrar = hoja.estado === 'validado' && ['admin', 'gerente', 'coordinador', 'administracion'].includes(role || '')
  const canRechazar = ['enviado', 'rendido', 'validado'].includes(hoja.estado) && ['admin', 'gerente', 'gestor', 'coordinador', 'administracion'].includes(role || '')

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.push('/gastos/mis-requerimientos')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-mono font-semibold">{hoja.numero}</span>
        <Badge className="capitalize ml-auto text-xs" variant="outline">
          {hoja.proyecto
            ? `${hoja.proyecto.codigo} - ${hoja.proyecto.nombre}`
            : hoja.centroCosto?.nombre || 'Sin asignación'}
        </Badge>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="p-3">
          <EstadoStepper
            estado={hoja.estado}
            requiereAnticipo={hoja.requiereAnticipo}
            rechazadoEn={hoja.rechazadoEn}
          />
        </CardContent>
      </Card>

      {/* Rechazo alert */}
      {hoja.estado === 'rechazado' && hoja.comentarioRechazo && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3 flex items-start gap-2">
            <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Rechazado en etapa: {hoja.rechazadoEn}</p>
              <p className="text-sm text-red-700">{hoja.comentarioRechazo}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen financiero */}
      <ResumenFinanciero
        montoAnticipo={hoja.montoAnticipo}
        montoDepositado={hoja.montoDepositado}
        montoGastado={hoja.montoGastado}
        saldo={hoja.saldo}
        requiereAnticipo={hoja.requiereAnticipo}
      />

      {/* Constancias de depósito */}
      {hoja.adjuntos && hoja.adjuntos.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">Constancias de Depósito</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-1">
            {hoja.adjuntos.map(adj => (
              <div key={adj.id} className="flex items-center justify-between text-sm bg-green-50 border border-green-200 rounded px-3 py-1.5">
                <a href={adj.urlArchivo} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline truncate">{adj.nombreArchivo}</a>
                <span className="text-xs text-muted-foreground ml-2">{new Date(adj.createdAt).toLocaleDateString('es-PE')}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Asignado a:</span>
              <span className="font-medium">
                {hoja.proyecto
                  ? `${hoja.proyecto.codigo} - ${hoja.proyecto.nombre}`
                  : hoja.centroCosto?.nombre || '-'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Categoría:</span>
              <span className="capitalize">{hoja.categoriaCosto || 'gastos'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Motivo:</span>
              <span className="font-medium">{hoja.motivo}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Empleado:</span>
              <span>{hoja.empleado?.name || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Creado:</span>
              <span>{formatDate(hoja.createdAt)}</span>
            </div>
            {hoja.aprobador && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Aprobador:</span>
                <span>{hoja.aprobador.name}</span>
              </div>
            )}
          </div>
          {hoja.observaciones && (
            <p className="text-sm text-muted-foreground border-t pt-2 mt-2">{hoja.observaciones}</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {(canEnviar || canAprobar || canDepositar || canRendir || canValidarLineas || canCerrar || canRechazar) && (
        <Card>
          <CardContent className="p-3 flex flex-wrap gap-2">
            {canEnviar && (
              <Button size="sm" onClick={handleEnviar} disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700">
                <Send className="h-3.5 w-3.5 mr-1" />
                Enviar para aprobación
              </Button>
            )}
            {canAprobar && (
              <Button size="sm" onClick={handleAprobar} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Aprobar
              </Button>
            )}
            {canDepositar && (
              <Button size="sm" onClick={() => { setMontoDeposito(String(hoja.montoAnticipo || '')); setShowDeposito(true) }} disabled={actionLoading} className="bg-purple-600 hover:bg-purple-700">
                <Banknote className="h-3.5 w-3.5 mr-1" />
                Registrar depósito
              </Button>
            )}
            {canRendir && (
              <Button size="sm" onClick={handleRendir} disabled={actionLoading || lineas.length === 0} className="bg-orange-600 hover:bg-orange-700">
                <FileCheck className="h-3.5 w-3.5 mr-1" />
                Rendir gastos
              </Button>
            )}
            {canValidarLineas && (
              <div className="flex items-center gap-1.5">
                <Button size="sm" onClick={handleValidar} disabled={actionLoading || !allLineasConforme} className="bg-teal-600 hover:bg-teal-700" title={!allLineasConforme ? 'Todas las líneas deben estar conformes para validar' : undefined}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Validar rendición
                </Button>
                {!allLineasConforme && (
                  <span className="text-xs text-amber-600">
                    {lineas.filter(l => l.conformidad !== 'conforme').length} línea{lineas.filter(l => l.conformidad !== 'conforme').length !== 1 ? 's' : ''} pendiente{lineas.filter(l => l.conformidad !== 'conforme').length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
            {canCerrar && (
              <Button size="sm" onClick={handleCerrar} disabled={actionLoading} className="bg-green-700 hover:bg-green-800">
                <Lock className="h-3.5 w-3.5 mr-1" />
                Cerrar
              </Button>
            )}
            {canRechazar && (
              <Button size="sm" variant="destructive" onClick={() => setShowRechazo(true)} disabled={actionLoading}>
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Rechazar
              </Button>
            )}
            {actionLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardContent>
        </Card>
      )}

      {/* Líneas de gasto */}
      <Card>
        <CardContent className="p-4">
          <GastoLineaTable
            hojaDeGastosId={hoja.id}
            lineas={lineas}
            categorias={categorias}
            editable={isEditable}
            onChanged={loadData}
            showConformidad={canValidarLineas}
          />
        </CardContent>
      </Card>

      {/* Historial del Requerimiento */}
      {(hoja as any).eventos && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Historial del Requerimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <HojaEventosTimeline eventos={(hoja as any).eventos} />
          </CardContent>
        </Card>
      )}

      {/* Rechazar Dialog */}
      <Dialog open={showRechazo} onOpenChange={setShowRechazo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Rechazar Requerimiento
            </DialogTitle>
            <DialogDescription>
              Indique el motivo del rechazo. El empleado podrá corregir y reenviar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Label>Motivo del rechazo <span className="text-red-500">*</span></Label>
            <Textarea
              value={comentarioRechazo}
              onChange={(e) => setComentarioRechazo(e.target.value)}
              placeholder="Explique el motivo del rechazo..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRechazo(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRechazar} disabled={actionLoading || !comentarioRechazo.trim()}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Depositar Dialog */}
      <Dialog open={showDeposito} onOpenChange={setShowDeposito}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-purple-600" />
              Registrar Depósito
            </DialogTitle>
            <DialogDescription>
              Registre el monto depositado al empleado.
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
            <div>
              <Label>Constancia de depósito</Label>
              <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  id="constancia-upload-detail"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUploadConstancia(file)
                    e.target.value = ''
                  }}
                />
                <label htmlFor="constancia-upload-detail" className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeposito(false)}>Cancelar</Button>
            <Button onClick={handleDepositar} disabled={actionLoading || !montoDeposito} className="bg-purple-600 hover:bg-purple-700">
              {actionLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
