'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Briefcase,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '@/components/ui/use-toast'

interface Registro {
  id: string
  fechaTrabajo: string
  horasTrabajadas: number
  descripcion: string | null
  nombreServicio: string
  proyecto: { id: string; codigo: string; nombre: string }
  proyectoEdt: { nombre: string } | null
  proyectoTarea: { nombre: string } | null
}

interface ProyectoResumen {
  codigo: string
  nombre: string
  horas: number
}

interface Aprobacion {
  id: string
  semana: string
  estado: string
  totalHoras: number
  fechaEnvio: string | null
  fechaResolucion: string | null
  motivoRechazo: string | null
  usuario: { id: string; name: string; email: string }
  aprobadoPor: string | null
  diasTrabajados: number
  proyectos: ProyectoResumen[]
  registros: Registro[]
}

function parseSemanaLabel(semana: string): string {
  const [year, weekStr] = semana.split('-W')
  return `Semana ${parseInt(weekStr)}, ${year}`
}

export default function AprobarHorasPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState('enviado')
  const [aprobaciones, setAprobaciones] = useState<Aprobacion[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Reject dialog
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [processing, setProcessing] = useState(false)

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/horas-hombre/timesheet-aprobacion/pendientes?estado=${tab}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error cargando datos')
      }
      const data = await res.json()
      setAprobaciones(data.aprobaciones || [])
    } catch (error: any) {
      toast({ title: error.message || 'Error al cargar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [tab, toast])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAprobar = async (id: string) => {
    try {
      setProcessing(true)
      const res = await fetch(`/api/horas-hombre/timesheet-aprobacion/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'aprobar' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: data.message || 'Semana aprobada' })
      cargarDatos()
    } catch (error: any) {
      toast({ title: error.message || 'Error al aprobar', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const handleRechazar = async () => {
    if (!rejectId) return
    if (motivoRechazo.trim().length < 10) {
      toast({ title: 'El motivo debe tener al menos 10 caracteres', variant: 'destructive' })
      return
    }
    try {
      setProcessing(true)
      const res = await fetch(`/api/horas-hombre/timesheet-aprobacion/${rejectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'rechazar', motivoRechazo: motivoRechazo.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: data.message || 'Semana rechazada' })
      setRejectId(null)
      setMotivoRechazo('')
      cargarDatos()
    } catch (error: any) {
      toast({ title: error.message || 'Error al rechazar', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'enviado':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pendiente</Badge>
      case 'aprobado':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Aprobado</Badge>
      case 'rechazado':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rechazado</Badge>
      default:
        return <Badge variant="outline">Borrador</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-blue-600" />
          Aprobación de Horas de Oficina
        </h1>
        <p className="text-sm text-gray-500">
          Revisa y aprueba los timesheets semanales de los empleados
        </p>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timesheets Semanales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="enviado" className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Pendientes
              </TabsTrigger>
              <TabsTrigger value="aprobado" className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Aprobados
              </TabsTrigger>
              <TabsTrigger value="rechazado" className="flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                Rechazados
              </TabsTrigger>
              <TabsTrigger value="todos">
                Todos
              </TabsTrigger>
            </TabsList>

            <TabsContent value={tab}>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : aprobaciones.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {tab === 'enviado' ? 'No hay timesheets pendientes de aprobación' :
                     tab === 'aprobado' ? 'No hay timesheets aprobados' :
                     tab === 'rechazado' ? 'No hay timesheets rechazados' :
                     'No hay timesheets registrados'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aprobaciones.map(a => {
                    const expanded = expandedIds.has(a.id)
                    return (
                      <Card key={a.id} className="border">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleExpand(a.id)}
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <User className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate">{a.usuario.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4 shrink-0" />
                              <span>{parseSemanaLabel(a.semana)}</span>
                            </div>
                            <Badge variant="secondary" className="shrink-0">
                              {a.totalHoras}h
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Briefcase className="h-3.5 w-3.5" />
                              <span>{a.proyectos.length} proyecto{a.proyectos.length !== 1 ? 's' : ''}</span>
                            </div>
                            {estadoBadge(a.estado)}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {a.estado === 'enviado' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-700 border-green-300 hover:bg-green-50"
                                  onClick={(e) => { e.stopPropagation(); handleAprobar(a.id) }}
                                  disabled={processing}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Aprobar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-700 border-red-300 hover:bg-red-50"
                                  onClick={(e) => { e.stopPropagation(); setRejectId(a.id); setMotivoRechazo('') }}
                                  disabled={processing}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Rechazar
                                </Button>
                              </>
                            )}
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>

                        {expanded && (
                          <div className="border-t px-4 pb-4">
                            {/* Project summary */}
                            <div className="flex flex-wrap gap-2 py-3">
                              {a.proyectos.map((p, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full text-sm">
                                  <span className="font-medium">{p.codigo}</span>
                                  <span className="text-muted-foreground">-</span>
                                  <span className="text-muted-foreground truncate max-w-[150px]">{p.nombre}</span>
                                  <Badge variant="secondary" className="text-xs ml-1">{p.horas}h</Badge>
                                </div>
                              ))}
                            </div>

                            {/* Info row */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground pb-3">
                              <span>{a.diasTrabajados} días trabajados</span>
                              <span>{a.registros.length} registros</span>
                              {a.fechaEnvio && (
                                <span>Enviado: {format(new Date(a.fechaEnvio), 'dd/MM/yyyy HH:mm')}</span>
                              )}
                              {a.aprobadoPor && (
                                <span>Por: {a.aprobadoPor}</span>
                              )}
                              {a.motivoRechazo && (
                                <span className="text-red-600">Motivo: {a.motivoRechazo}</span>
                              )}
                            </div>

                            {/* Detail table */}
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Proyecto</TableHead>
                                    <TableHead>EDT</TableHead>
                                    <TableHead>Tarea</TableHead>
                                    <TableHead className="text-right">Horas</TableHead>
                                    <TableHead>Descripción</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {a.registros.map(r => (
                                    <TableRow key={r.id}>
                                      <TableCell className="text-sm whitespace-nowrap">
                                        {format(new Date(r.fechaTrabajo), 'dd MMM', { locale: es })}
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        <span className="font-medium">{r.proyecto.codigo}</span>
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {r.proyectoEdt?.nombre || '-'}
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {r.proyectoTarea?.nombre || '-'}
                                      </TableCell>
                                      <TableCell className="text-sm text-right font-medium">
                                        {r.horasTrabajadas}h
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                                        {r.descripcion || '-'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => { if (!open) { setRejectId(null); setMotivoRechazo('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Timesheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Indica el motivo del rechazo para que el empleado pueda corregir y reenviar.
            </p>
            <Textarea
              placeholder="Motivo del rechazo (mínimo 10 caracteres)..."
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {motivoRechazo.trim().length}/10 caracteres mínimo
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRejectId(null); setMotivoRechazo('') }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRechazar}
              disabled={processing || motivoRechazo.trim().length < 10}
            >
              {processing ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
