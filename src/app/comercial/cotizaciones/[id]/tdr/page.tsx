'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileSearch,
  ClipboardList,
  Package,
  Wrench,
  AlertTriangle,
  HelpCircle,
  Shield,
  XCircle,
  Calendar,
  DollarSign,
  MapPin,
  Building2,
  Clock,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

import { useCotizacionContext } from '../cotizacion-context'

// ── Types ──

interface Requerimiento {
  descripcion: string
  cantidad?: number
  especificacion?: string
  criticidad?: 'alta' | 'media' | 'baja'
}

interface EquipoIdentificado {
  nombre: string
  cantidad?: number
  especificacion?: string
  estimadoUsd?: number
}

interface ServicioIdentificado {
  nombre: string
  descripcion?: string
  horasEstimadas?: number
}

interface Ambiguedad {
  aspecto: string
  descripcion: string
  impacto?: string
}

interface ConsultaCliente {
  categoria?: string
  pregunta: string
  prioridad?: 'alta' | 'media' | 'baja'
  respondida?: boolean
}

interface Supuesto {
  supuesto: string
  impactoSiIncorrecto?: string
}

interface Exclusion {
  descripcion: string
}

interface FaseCronograma {
  fase: string
  duracion?: string
  observaciones?: string
}

interface PresupuestoEstimado {
  equipos?: number
  servicios?: number
  gastos?: number
  total?: number
}

interface TdrAnalisis {
  id: string
  cotizacionId: string
  resumenTdr: string
  requerimientos: Requerimiento[] | null
  equiposIdentificados: EquipoIdentificado[] | null
  serviciosIdentificados: ServicioIdentificado[] | null
  ambiguedades: Ambiguedad[] | null
  consultasCliente: ConsultaCliente[] | null
  supuestos: Supuesto[] | null
  exclusiones: Exclusion[] | null
  nombreArchivo?: string | null
  clienteDetectado?: string | null
  proyectoDetectado?: string | null
  ubicacionDetectada?: string | null
  alcanceDetectado?: string | null
  cronogramaEstimado: FaseCronograma[] | null
  presupuestoEstimado: PresupuestoEstimado | null
  createdAt: string
  updatedAt: string
}

// ── Helpers ──

function criticidadColor(c?: string) {
  if (c === 'alta') return 'bg-red-100 text-red-700'
  if (c === 'media') return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-600'
}

function prioridadColor(p?: string) {
  if (p === 'alta') return 'bg-red-100 text-red-700'
  if (p === 'media') return 'bg-amber-100 text-amber-700'
  return 'bg-blue-100 text-blue-600'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function formatUsd(n?: number) {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Main Component ──

export default function TdrAnalisisPage() {
  const { cotizacion } = useCotizacionContext()
  const [analisis, setAnalisis] = useState<TdrAnalisis | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalisis = useCallback(async () => {
    if (!cotizacion?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/cotizacion/${cotizacion.id}/tdr-analisis`)
      if (res.ok) {
        const data = await res.json()
        setAnalisis(data.analisis || null)
      }
    } catch {
      toast.error('Error al cargar análisis TDR')
    } finally {
      setLoading(false)
    }
  }, [cotizacion?.id])

  useEffect(() => { fetchAnalisis() }, [fetchAnalisis])

  const toggleConsultaRespondida = async (index: number) => {
    if (!analisis?.consultasCliente) return
    const updated = [...analisis.consultasCliente] as ConsultaCliente[]
    updated[index] = { ...updated[index], respondida: !updated[index].respondida }
    try {
      const res = await fetch(`/api/cotizacion/${cotizacion!.id}/tdr-analisis`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultasCliente: updated }),
      })
      if (res.ok) {
        setAnalisis(prev => prev ? { ...prev, consultasCliente: updated } : null)
      }
    } catch {
      toast.error('Error al actualizar consulta')
    }
  }

  if (!cotizacion) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-5 w-5 animate-spin text-gray-400 mr-2" />
        <span className="text-sm text-gray-500">Cargando análisis TDR...</span>
      </div>
    )
  }

  if (!analisis) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b">
          <FileSearch className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold">Análisis TDR</h2>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <FileSearch className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base font-medium text-gray-700 mb-2">Sin análisis TDR</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Aún no se ha analizado un TDR para esta cotización. Usa el chat del asistente IA
              para subir un PDF de TDR y el análisis se guardará automáticamente aquí.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const reqs = analisis.requerimientos || []
  const equipos = analisis.equiposIdentificados || []
  const servicios = analisis.serviciosIdentificados || []
  const ambiguedades = analisis.ambiguedades || []
  const consultas = analisis.consultasCliente || []
  const supuestos = analisis.supuestos || []
  const exclusiones = analisis.exclusiones || []
  const cronograma = analisis.cronogramaEstimado || []
  const presupuesto = analisis.presupuestoEstimado

  const consultasRespondidas = consultas.filter(c => c.respondida).length
  const consultasPendientes = consultas.length - consultasRespondidas

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-3">
          <FileSearch className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold">Análisis TDR</h2>
          {analisis.nombreArchivo && (
            <Badge variant="outline" className="text-[10px]">{analisis.nombreArchivo}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          {formatDate(analisis.updatedAt)}
          <Button variant="ghost" size="sm" onClick={fetchAnalisis} className="h-6 px-2">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Meta info row */}
      <div className="flex flex-wrap gap-3">
        {analisis.clienteDetectado && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-xs">
            <Building2 className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-500">Cliente:</span>
            <span className="font-medium">{analisis.clienteDetectado}</span>
          </div>
        )}
        {analisis.proyectoDetectado && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-xs">
            <ClipboardList className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-500">Proyecto:</span>
            <span className="font-medium">{analisis.proyectoDetectado}</span>
          </div>
        )}
        {analisis.ubicacionDetectada && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-xs">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-500">Ubicación:</span>
            <span className="font-medium">{analisis.ubicacionDetectada}</span>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: 'Requerimientos', value: reqs.length, icon: ClipboardList, color: 'text-blue-600' },
          { label: 'Equipos', value: equipos.length, icon: Package, color: 'text-green-600' },
          { label: 'Servicios', value: servicios.length, icon: Wrench, color: 'text-emerald-600' },
          { label: 'Ambigüedades', value: ambiguedades.length, icon: AlertTriangle, color: 'text-amber-600' },
          { label: 'Consultas', value: consultas.length, icon: HelpCircle, color: 'text-purple-600' },
          { label: 'Supuestos', value: supuestos.length, icon: Shield, color: 'text-orange-600' },
          { label: 'Exclusiones', value: exclusiones.length, icon: XCircle, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg">
            <s.icon className={`h-4 w-4 ${s.color}`} />
            <div>
              <div className="text-lg font-semibold leading-tight">{s.value}</div>
              <div className="text-[10px] text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen */}
      {analisis.resumenTdr && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-indigo-500" />
              Resumen del TDR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {analisis.resumenTdr}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alcance */}
      {analisis.alcanceDetectado && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-500" />
              Alcance Detectado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
              {analisis.alcanceDetectado}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid: Requerimientos + Equipos + Servicios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Requerimientos */}
        {reqs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-blue-500" />
                Requerimientos ({reqs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium text-gray-500">#</th>
                      <th className="px-3 py-1.5 text-left font-medium text-gray-500">Descripción</th>
                      <th className="px-3 py-1.5 text-left font-medium text-gray-500">Cant.</th>
                      <th className="px-3 py-1.5 text-left font-medium text-gray-500">Criticidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reqs.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-1.5">
                          <div>{r.descripcion}</div>
                          {r.especificacion && (
                            <div className="text-[10px] text-gray-400 mt-0.5">{r.especificacion}</div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center">{r.cantidad ?? '—'}</td>
                        <td className="px-3 py-1.5">
                          <Badge className={`text-[9px] ${criticidadColor(r.criticidad)}`}>
                            {r.criticidad || 'N/A'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Equipos Identificados */}
        {equipos.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-green-500" />
                Equipos Identificados ({equipos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium text-gray-500">Equipo</th>
                      <th className="px-3 py-1.5 text-left font-medium text-gray-500">Cant.</th>
                      <th className="px-3 py-1.5 text-left font-medium text-gray-500">Especificación</th>
                      <th className="px-3 py-1.5 text-right font-medium text-gray-500">Est. USD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {equipos.map((eq, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-medium">{eq.nombre}</td>
                        <td className="px-3 py-1.5 text-center">{eq.cantidad ?? '—'}</td>
                        <td className="px-3 py-1.5 text-gray-500">{eq.especificacion || '—'}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-green-700">
                          {formatUsd(eq.estimadoUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Servicios Identificados */}
        {servicios.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="h-4 w-4 text-emerald-500" />
                Servicios Identificados ({servicios.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium text-gray-500">Servicio</th>
                      <th className="px-3 py-1.5 text-left font-medium text-gray-500">Descripción</th>
                      <th className="px-3 py-1.5 text-right font-medium text-gray-500">Horas Est.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {servicios.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-medium">{s.nombre}</td>
                        <td className="px-3 py-1.5 text-gray-500">{s.descripcion || '—'}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{s.horasEstimadas ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ambigüedades */}
        {ambiguedades.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Ambigüedades ({ambiguedades.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ambiguedades.map((a, i) => (
                <div key={i} className="border-l-2 border-amber-300 pl-3 py-1">
                  <div className="text-xs font-medium">{a.aspecto}</div>
                  <div className="text-[11px] text-gray-600">{a.descripcion}</div>
                  {a.impacto && (
                    <div className="text-[10px] text-amber-600 mt-0.5">Impacto: {a.impacto}</div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Consultas al Cliente — full width */}
      {consultas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              Consultas al Cliente ({consultas.length})
              {consultasPendientes > 0 && (
                <Badge className="text-[9px] bg-amber-100 text-amber-700">{consultasPendientes} pendientes</Badge>
              )}
              {consultasRespondidas > 0 && (
                <Badge className="text-[9px] bg-green-100 text-green-700">{consultasRespondidas} respondidas</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-1.5 text-center font-medium text-gray-500 w-8">✓</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-500">Categoría</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-500">Pregunta</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-500">Prioridad</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {consultas.map((c, i) => (
                    <tr key={i} className={`hover:bg-gray-50 ${c.respondida ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          onClick={() => toggleConsultaRespondida(i)}
                          className="hover:scale-110 transition-transform"
                          title={c.respondida ? 'Marcar como pendiente' : 'Marcar como respondida'}
                        >
                          {c.respondida
                            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                            : <HelpCircle className="h-4 w-4 text-gray-300 hover:text-purple-400" />
                          }
                        </button>
                      </td>
                      <td className="px-3 py-1.5">
                        <Badge variant="outline" className="text-[9px]">{c.categoria || 'General'}</Badge>
                      </td>
                      <td className={`px-3 py-1.5 ${c.respondida ? 'line-through' : ''}`}>{c.pregunta}</td>
                      <td className="px-3 py-1.5">
                        <Badge className={`text-[9px] ${prioridadColor(c.prioridad)}`}>
                          {c.prioridad || 'media'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom row: Supuestos + Exclusiones + Cronograma + Presupuesto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Supuestos */}
        {supuestos.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-500" />
                Supuestos ({supuestos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {supuestos.map((s, i) => (
                <div key={i} className="border-l-2 border-orange-300 pl-3 py-1">
                  <div className="text-xs">{s.supuesto}</div>
                  {s.impactoSiIncorrecto && (
                    <div className="text-[10px] text-orange-600 mt-0.5">
                      Si incorrecto: {s.impactoSiIncorrecto}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Exclusiones */}
        {exclusiones.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Exclusiones ({exclusiones.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {exclusiones.map((e, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5">
                    <XCircle className="h-3 w-3 text-red-300 mt-0.5 shrink-0" />
                    {e.descripcion}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Cronograma Estimado */}
        {cronograma.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                Cronograma Estimado ({cronograma.length} fases)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-500">Fase</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-500">Duración</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-500">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cronograma.map((f, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 font-medium">{f.fase}</td>
                      <td className="px-3 py-1.5">{f.duracion || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-500">{f.observaciones || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Presupuesto Estimado */}
        {presupuesto && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Presupuesto Estimado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {presupuesto.equipos != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 flex items-center gap-1.5"><Package className="h-3 w-3" /> Equipos</span>
                    <span className="font-mono font-medium">{formatUsd(presupuesto.equipos)}</span>
                  </div>
                )}
                {presupuesto.servicios != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 flex items-center gap-1.5"><Wrench className="h-3 w-3" /> Servicios</span>
                    <span className="font-mono font-medium">{formatUsd(presupuesto.servicios)}</span>
                  </div>
                )}
                {presupuesto.gastos != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Gastos</span>
                    <span className="font-mono font-medium">{formatUsd(presupuesto.gastos)}</span>
                  </div>
                )}
                {presupuesto.total != null && (
                  <>
                    <div className="border-t pt-2 flex justify-between text-xs font-semibold">
                      <span>Total Estimado</span>
                      <span className="font-mono text-green-700">{formatUsd(presupuesto.total)}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
