'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  CheckCircle, XCircle, Lock, Loader2, ShieldCheck, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getHojasDeGastos,
  aprobarHoja,
  cerrarHoja,
  rechazarHoja,
} from '@/lib/services/hojaDeGastos'
import type { HojaDeGastos } from '@/types'

const ALLOWED_ROLES = ['admin', 'gerente', 'gestor', 'coordinador']

type TabKey = 'por-aprobar' | 'por-cerrar'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

const formatDate = (date: string | null | undefined) =>
  date ? new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

function getAsignadoA(hoja: HojaDeGastos): string {
  if (hoja.proyecto) return `${hoja.proyecto.codigo} - ${hoja.proyecto.nombre}`
  if (hoja.centroCosto) return hoja.centroCosto.nombre
  return '-'
}

export default function SupervisionGastosPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const role = session?.user?.role

  const [tab, setTab] = useState<TabKey>('por-aprobar')
  const [enviados, setEnviados] = useState<HojaDeGastos[]>([])
  const [validados, setValidados] = useState<HojaDeGastos[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Rechazo dialog
  const [rechazoTarget, setRechazoTarget] = useState<HojaDeGastos | null>(null)
  const [comentarioRechazo, setComentarioRechazo] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [env, val] = await Promise.all([
        getHojasDeGastos({ estado: 'enviado' }),
        getHojasDeGastos({ estado: 'validado' }),
      ])
      setEnviados(env)
      setValidados(val)
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

  const currentList = tab === 'por-aprobar' ? enviados : validados

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-muted-foreground">No tiene permisos para acceder a esta sección.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-red-500" />
          Aprobar Requerimientos
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestión de aprobaciones y cierres de requerimientos de dinero
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-sm px-3 py-1 bg-blue-50 text-blue-700 border-blue-200">
          {enviados.length} por aprobar
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1 bg-green-50 text-green-700 border-green-200">
          {validados.length} por cerrar
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab('por-aprobar')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'por-aprobar'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Por Aprobar ({enviados.length})
        </button>
        <button
          onClick={() => setTab('por-cerrar')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'por-cerrar'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Por Cerrar ({validados.length})
        </button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : currentList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {tab === 'por-aprobar'
                ? 'No hay requerimientos pendientes de aprobación.'
                : 'No hay requerimientos pendientes de cierre.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Proyecto / CC</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">
                    {tab === 'por-aprobar' ? 'Monto Anticipo' : 'Monto Gastado'}
                  </TableHead>
                  <TableHead>
                    {tab === 'por-aprobar' ? 'Fecha Envío' : 'Fecha Validación'}
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentList.map(hoja => (
                  <TableRow
                    key={hoja.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/gastos/mis-requerimientos/${hoja.id}?from=supervision`)}
                  >
                    <TableCell className="font-mono text-sm font-medium">{hoja.numero}</TableCell>
                    <TableCell className="text-sm">{hoja.empleado?.name || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {getAsignadoA(hoja)}
                    </TableCell>
                    <TableCell className="text-sm max-w-[180px] truncate">{hoja.motivo}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {tab === 'por-aprobar'
                        ? (hoja.requiereAnticipo ? formatCurrency(hoja.montoAnticipo) : '-')
                        : formatCurrency(hoja.montoGastado)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {tab === 'por-aprobar'
                        ? formatDate(hoja.fechaEnvio || hoja.updatedAt)
                        : formatDate(hoja.fechaValidacion || hoja.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {tab === 'por-aprobar' ? (
                          <>
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                              disabled={actionLoading === hoja.id}
                              onClick={() => handleAprobar(hoja)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-xs"
                              disabled={actionLoading === hoja.id}
                              onClick={() => { setRechazoTarget(hoja); setComentarioRechazo('') }}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Rechazar
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-green-700 hover:bg-green-800"
                            disabled={actionLoading === hoja.id}
                            onClick={() => handleCerrar(hoja)}
                          >
                            <Lock className="h-3 w-3 mr-1" />
                            Cerrar
                          </Button>
                        )}
                        {actionLoading === hoja.id && <Loader2 className="h-3 w-3 animate-spin" />}
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Rechazar Dialog */}
      <Dialog open={!!rechazoTarget} onOpenChange={(open) => { if (!open) setRechazoTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Rechazar Requerimiento
            </DialogTitle>
            <DialogDescription>
              Indique el motivo del rechazo para {rechazoTarget?.numero}. El empleado podrá corregir y reenviar.
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
            <Button variant="outline" onClick={() => setRechazoTarget(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleRechazar}
              disabled={!!actionLoading || !comentarioRechazo.trim()}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
