'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ShieldCheck,
  ArrowLeft,
  Loader2,
  FileText,
  Users,
  BarChart3,
  Plus,
  Eye,
  CheckCircle,
  Copy,
  AlertTriangle,
  Clock,
  Sparkles,
  Download,
  Pencil,
  Save,
  X,
  RefreshCw,
  TableIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import { useProyectoContext } from '../ProyectoContext'
import { generarDocx } from '@/lib/ssoma/exportDocx'

// Types
interface SsomaDocumento {
  id: string
  tipo: string
  parSubtipo: string | null
  estado: string
  codigoDocumento: string
  revision: string
  titulo: string
  contenidoTexto: string | null
  driveFileId: string | null
  driveUrl: string | null
  nombreArchivo: string | null
  generadoPorId: string | null
  fechaAprobacion: string | null
  fechaVigencia: string | null
  observaciones: string | null
  agenteUsageId: string | null
  createdAt: string
}

interface SsomaPersonal {
  id: string
  userId: string
  cargo: string
  estado: string
  firmaDifusion: boolean
  fechaFirma: string | null
  tokenDifusion: string | null
  certAlturaVence: string | null
  certElectricoVence: string | null
  certCalienteVence: string | null
  aptitudMedicaVence: string | null
  user: { id: string; name: string; email: string }
}

interface SsomaExpediente {
  id: string
  proyectoId: string
  codigoCod: string
  descripcionTrabajos: string
  hayTrabajoElectrico: boolean
  nivelElectrico: string | null
  hayTrabajoAltura: boolean
  hayEspacioConfinado: boolean
  hayTrabajoCaliente: boolean
  estadoHabilitacion: string
  fechaInicioObra: string | null
  ingSeguridad: string | null
  gestorNombre: string | null
  ggNombre: string | null
  driveFolderId: string | null
  createdAt: string
  documentos: SsomaDocumento[]
  personal: SsomaPersonal[]
}

// Estado badge config
const estadoConfig: Record<string, { label: string; className: string }> = {
  borrador: { label: 'Borrador', className: 'bg-gray-100 text-gray-700' },
  en_revision: { label: 'En Revisión', className: 'bg-blue-100 text-blue-700' },
  aprobado_interno: { label: 'Aprobado Int.', className: 'bg-green-100 text-green-700' },
  enviado_cliente: { label: 'Enviado', className: 'bg-purple-100 text-purple-700' },
  aprobado_cliente: { label: 'Aprobado Cliente', className: 'bg-emerald-100 text-emerald-700' },
  rechazado: { label: 'Rechazado', className: 'bg-red-100 text-red-700' },
  vencido: { label: 'Vencido', className: 'bg-orange-100 text-orange-700' },
}

const habEstadoConfig: Record<string, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-gray-100 text-gray-700' },
  habilitado: { label: 'Habilitado', className: 'bg-green-100 text-green-700' },
  vencido: { label: 'Vencido', className: 'bg-orange-100 text-orange-700' },
  suspendido: { label: 'Suspendido', className: 'bg-red-100 text-red-700' },
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function isExpiringSoon(dateStr: string | null): boolean {
  if (!dateStr) return false
  const diff = new Date(dateStr).getTime() - Date.now()
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr).getTime() < Date.now()
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ====== MAIN COMPONENT ======
interface PageProps {
  params: Promise<{ id: string }>
}

export default function SsomaPage({ params: _params }: PageProps) {
  const { proyecto } = useProyectoContext()
  const [expediente, setExpediente] = useState<SsomaExpediente | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (proyecto?.id) loadExpediente()
  }, [proyecto?.id])

  const loadExpediente = async () => {
    if (!proyecto?.id) return
    try {
      setLoading(true)
      const res = await fetch(`/api/ssoma/expediente?proyectoId=${proyecto.id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data) {
        setExpediente(data)
        setNotFound(false)
      } else {
        setNotFound(true)
      }
    } catch {
      toast.error('Error al cargar expediente SSOMA')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href={`/proyectos/${proyecto?.id}`}
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3 mr-1" />
          Proyecto
        </Link>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-red-600" />
          <h1 className="text-lg font-semibold">SSOMA</h1>
          {expediente && (
            <Badge className={habEstadoConfig[expediente.estadoHabilitacion]?.className || 'bg-gray-100'}>
              {habEstadoConfig[expediente.estadoHabilitacion]?.label || expediente.estadoHabilitacion}
            </Badge>
          )}
        </div>
      </div>

      {notFound || !expediente ? (
        <CrearExpedienteForm
          proyecto={proyecto!}
          onCreated={() => { setNotFound(false); loadExpediente() }}
        />
      ) : (
        <ExpedienteView expediente={expediente} onRefresh={loadExpediente} />
      )}
    </div>
  )
}

// ====== ESTADO A: FORMULARIO DE CREACION ======
function CrearExpedienteForm({
  proyecto,
  onCreated,
}: {
  proyecto: any
  onCreated: () => void
}) {
  const [codigoCod, setCodigoCod] = useState(proyecto.codigo || '')
  const [descripcionTrabajos, setDescripcionTrabajos] = useState('')
  const [hayElectrico, setHayElectrico] = useState(false)
  const [nivelElectrico, setNivelElectrico] = useState('baja')
  const [hayAltura, setHayAltura] = useState(false)
  const [hayConfinado, setHayConfinado] = useState(false)
  const [hayCaliente, setHayCaliente] = useState(false)
  const [ingSeguridad, setIngSeguridad] = useState(proyecto.supervisor?.name || '')
  const [gestorNombre, setGestorNombre] = useState(proyecto.gestor?.name || '')
  const [ggNombre, setGgNombre] = useState('Ing. Carlos Sihuayro Ancco')
  const [fechaInicioObra, setFechaInicioObra] = useState('')
  const [generating, setGenerating] = useState(false)

  // Count docs that will be generated
  let docCount = 4 // PETS + IPERC + MATRIZ_EPP + PLAN_EMERGENCIA
  if (hayElectrico) docCount++
  if (hayAltura) docCount++
  if (hayConfinado) docCount++
  if (hayCaliente) docCount++

  const handleGenerate = async () => {
    if (!descripcionTrabajos.trim() || !codigoCod.trim()) {
      toast.error('Complete los campos obligatorios')
      return
    }
    if (!ingSeguridad.trim() || !gestorNombre.trim() || !ggNombre.trim()) {
      toast.error('Complete los datos de firmantes')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/ssoma/expediente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyectoId: proyecto.id,
          codigoCod,
          descripcionTrabajos,
          hayTrabajoElectrico: hayElectrico,
          nivelElectrico: hayElectrico ? nivelElectrico : null,
          hayTrabajoAltura: hayAltura,
          hayEspacioConfinado: hayConfinado,
          hayTrabajoCaliente: hayCaliente,
          ingSeguridad,
          gestorNombre,
          ggNombre,
          fechaInicioObra: fechaInicioObra || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al generar')
      }

      const result = await res.json()
      toast.success(`${result.documentos?.length || docCount} documentos generados`)
      if (result.errores?.length > 0) {
        toast.warning(`${result.errores.length} documentos fallaron`)
      }
      onCreated()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al generar documentos')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Generar expediente SSOMA con IA</p>
            <p className="text-xs text-amber-700 mt-1">
              Se generarán {docCount} documentos: PETS, IPERC, Matriz EPP, Plan de Emergencia
              {hayElectrico && ', PAR Eléctrico'}
              {hayAltura && ', PAR Altura'}
              {hayConfinado && ', PAR Espacio Confinado'}
              {hayCaliente && ', PAR Trabajo en Caliente'}
            </p>
          </div>
        </div>
      </div>

      {/* Codigo + Descripcion */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Código de servicio <span className="text-red-500">*</span></Label>
          <Input
            value={codigoCod}
            onChange={(e) => setCodigoCod(e.target.value.toUpperCase())}
            placeholder="QRM15"
            className="max-w-xs"
            disabled={generating}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Descripción de trabajos <span className="text-red-500">*</span></Label>
          <Textarea
            value={descripcionTrabajos}
            onChange={(e) => setDescripcionTrabajos(e.target.value)}
            placeholder="Ej: Instalación de sistema de instrumentación en tanques. Incluye tendido de tuberías conduit, cableado eléctrico..."
            rows={4}
            disabled={generating}
          />
        </div>
      </div>

      {/* Actividades de alto riesgo */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Actividades de alto riesgo</Label>
        <div className="space-y-3 pl-1">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="electrico"
                checked={hayElectrico}
                onCheckedChange={(v) => setHayElectrico(!!v)}
                disabled={generating}
              />
              <label htmlFor="electrico" className="text-sm">Trabajos eléctricos</label>
            </div>
            {hayElectrico && (
              <div className="ml-6">
                <Select value={nivelElectrico} onValueChange={setNivelElectrico} disabled={generating}>
                  <SelectTrigger className="w-64 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja tensión {'<'}1kV</SelectItem>
                    <SelectItem value="media_alta">Media/Alta tensión {'>'}1kV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="altura"
              checked={hayAltura}
              onCheckedChange={(v) => setHayAltura(!!v)}
              disabled={generating}
            />
            <label htmlFor="altura" className="text-sm">Trabajo en altura ({'>'}1.80m)</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="confinado"
              checked={hayConfinado}
              onCheckedChange={(v) => setHayConfinado(!!v)}
              disabled={generating}
            />
            <label htmlFor="confinado" className="text-sm">Espacio confinado</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="caliente"
              checked={hayCaliente}
              onCheckedChange={(v) => setHayCaliente(!!v)}
              disabled={generating}
            />
            <label htmlFor="caliente" className="text-sm">Trabajo en caliente (soldadura, esmerilado, oxicorte)</label>
          </div>
        </div>
      </div>

      {/* Firmantes */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Firmantes</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ing. de Seguridad <span className="text-red-500">*</span></Label>
            <Input value={ingSeguridad} onChange={(e) => setIngSeguridad(e.target.value)} disabled={generating} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Gestor de Proyecto <span className="text-red-500">*</span></Label>
            <Input value={gestorNombre} onChange={(e) => setGestorNombre(e.target.value)} disabled={generating} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Gerente General <span className="text-red-500">*</span></Label>
            <Input value={ggNombre} onChange={(e) => setGgNombre(e.target.value)} disabled={generating} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Fecha inicio de obra</Label>
            <Input type="date" value={fechaInicioObra} onChange={(e) => setFechaInicioObra(e.target.value)} disabled={generating} />
          </div>
        </div>
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={generating || !descripcionTrabajos.trim() || !codigoCod.trim()}
        className="bg-red-600 hover:bg-red-700"
        size="lg"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generando {docCount} documentos con IA... (~60s)
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generar documentos SSOMA
          </>
        )}
      </Button>
    </div>
  )
}

// ====== ESTADO B: VISTA DEL EXPEDIENTE ======
function ExpedienteView({
  expediente,
  onRefresh,
}: {
  expediente: SsomaExpediente
  onRefresh: () => void
}) {
  const { proyecto } = useProyectoContext()
  const [activeTab, setActiveTab] = useState<'documentos' | 'personal' | 'estado'>('documentos')

  const tabs = [
    { id: 'documentos' as const, label: 'Documentos', icon: FileText, count: expediente.documentos.length },
    { id: 'personal' as const, label: 'Personal', icon: Users, count: expediente.personal.length },
    { id: 'estado' as const, label: 'Estado General', icon: BarChart3 },
  ]

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.count !== undefined && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs ml-1">{tab.count}</Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'documentos' && (
        <TabDocumentos documentos={expediente.documentos} expediente={expediente} onRefresh={onRefresh} />
      )}
      {activeTab === 'personal' && (
        <TabPersonal expediente={expediente} onRefresh={onRefresh} />
      )}
      {activeTab === 'estado' && (
        <TabEstado expediente={expediente} />
      )}
    </div>
  )
}

const getFormatoBadge = (tipo: string) => {
  if (tipo === 'IPERC') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-300 mr-1">
      XLS
    </span>
  )
  if (tipo === 'PLAN_EMERGENCIA') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 mr-1">
      PDF
    </span>
  )
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-300 mr-1">
      DOC
    </span>
  )
}

// ====== TAB 1: DOCUMENTOS ======
function TabDocumentos({
  documentos,
  expediente,
  onRefresh,
}: {
  documentos: SsomaDocumento[]
  expediente: SsomaExpediente
  onRefresh: () => void
}) {
  const [viewDoc, setViewDoc] = useState<SsomaDocumento | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleUpdateEstado = async (docId: string, nuevoEstado: string) => {
    setUpdatingId(docId)
    try {
      const res = await fetch(`/api/ssoma/documento/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (!res.ok) throw new Error()
      toast.success('Estado actualizado')
      onRefresh()
    } catch {
      toast.error('Error al actualizar estado')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-xs font-medium">Código</TableHead>
              <TableHead className="text-xs font-medium">Documento</TableHead>
              <TableHead className="text-xs font-medium w-[120px]">Estado</TableHead>
              <TableHead className="text-xs font-medium w-[80px] text-right">Chars</TableHead>
              <TableHead className="w-[140px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentos.map((doc) => {
              const est = estadoConfig[doc.estado] || estadoConfig.borrador
              return (
                <TableRow key={doc.id} className="group">
                  <TableCell className="py-2">
                    <span className="font-mono text-xs">{doc.codigoDocumento}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div>
                      {getFormatoBadge(doc.tipo)}
                      <span className="text-sm">{doc.titulo}</span>
                      {doc.tipo === 'PAR' && doc.parSubtipo && (
                        <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">
                          {doc.parSubtipo.replace('_', ' ')}
                        </Badge>
                      )}
                      {doc.contenidoTexto && (
                        <span className="text-[11px] text-muted-foreground line-clamp-2 block mt-0.5 leading-tight">
                          {doc.contenidoTexto.split('\n').filter(l => l.trim()).slice(0, 2).join(' — ')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge className={`text-xs ${est.className}`}>{est.label}</Badge>
                  </TableCell>
                  <TableCell className="py-2 text-right text-xs text-muted-foreground font-mono">
                    {doc.contenidoTexto?.length?.toLocaleString() || 0}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setViewDoc(doc)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      {(doc.estado === 'borrador' || doc.estado === 'en_revision') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-green-700 hover:text-green-800 hover:bg-green-50"
                          onClick={() => handleUpdateEstado(doc.id, 'aprobado_interno')}
                          disabled={updatingId === doc.id}
                        >
                          {updatingId === doc.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Aprobar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* View/Edit document modal */}
      {viewDoc && (
        <DocumentoModal
          doc={viewDoc}
          expediente={expediente}
          onClose={() => setViewDoc(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  )
}

// ====== DOCUMENT MODAL ======
function DocumentoModal({
  doc,
  expediente,
  onClose,
  onRefresh,
}: {
  doc: SsomaDocumento
  expediente: SsomaExpediente
  onClose: () => void
  onRefresh: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(doc.contenidoTexto || '')
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [showRegenerarConfirm, setShowRegenerarConfirm] = useState(false)
  const [regenProgress, setRegenProgress] = useState(0)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/ssoma/documento/${doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenidoTexto: editContent }),
      })
      if (!res.ok) throw new Error()
      toast.success('Documento guardado')
      setEditing(false)
      onRefresh()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async () => {
    try {
      const blob = await generarDocx(
        doc.titulo,
        doc.codigoDocumento,
        doc.contenidoTexto ?? '',
        {
          ingSeguridad: expediente.ingSeguridad ?? '',
          gestorNombre: expediente.gestorNombre ?? '',
          ggNombre: expediente.ggNombre ?? '',
          fecha: new Date().toLocaleDateString('es-PE'),
        }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.codigoDocumento}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al generar el documento')
    }
  }

  // Progreso simulado durante regeneración
  useEffect(() => {
    if (!regenerating) { setRegenProgress(0); return }
    const duracionEstimada = doc.tipo === 'IPERC' ? 60000 : 25000
    const intervalo = 500
    const incremento = (intervalo / duracionEstimada) * 90 // llega hasta ~90%
    const timer = setInterval(() => {
      setRegenProgress(prev => prev >= 90 ? 90 : prev + incremento)
    }, intervalo)
    return () => clearInterval(timer)
  }, [regenerating, doc.tipo])

  const handleRegenerar = async () => {
    setShowRegenerarConfirm(false)
    setRegenerating(true)
    setRegenProgress(0)
    try {
      const res = await fetch(`/api/ssoma/documento/${doc.id}/regenerar`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al regenerar')
      }
      setRegenProgress(100)
      toast.success('Documento regenerado con IA')
      onRefresh()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al regenerar')
    } finally {
      setRegenerating(false)
    }
  }

  const est = estadoConfig[doc.estado] || estadoConfig.borrador

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {doc.codigoDocumento} — {doc.titulo}
            <span className="text-xs text-gray-400 font-mono">
              {doc.tipo === 'IPERC' ? '📊 Excel' : '📄 Word'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={est.className}>{est.label}</Badge>
          {doc.tipo === 'PAR' && doc.parSubtipo && (
            <Badge variant="outline">{doc.parSubtipo.replace('_', ' ')}</Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            Rev. {doc.revision} | {(editing ? editContent : doc.contenidoTexto)?.length?.toLocaleString() || 0} chars
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                Guardar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditing(false); setEditContent(doc.contenidoTexto || '') }} disabled={saving}>
                <X className="h-3 w-3 mr-1" />
                Cancelar
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3 mr-1" />
              Editar
            </Button>
          )}
          {doc.tipo === 'IPERC' ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                const esJson = doc.contenidoTexto?.trim().startsWith('{') || doc.contenidoTexto?.trim().startsWith('[')
                if (!esJson) {
                  toast.error('Este IPERC fue generado con el formato anterior. Haz clic en "Regenerar IA" primero y luego descarga el Excel.')
                  return
                }
                window.open(`/api/ssoma/documento/${doc.id}/excel`, '_blank')
              }}
            >
              <TableIcon className="h-3 w-3 mr-1" />
              Descargar .xlsx
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleDownload}>
              <Download className="h-3 w-3 mr-1" />
              Descargar .docx
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
            onClick={() => setShowRegenerarConfirm(true)}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            {regenerating ? `Regenerando... ${Math.round(regenProgress)}%` : 'Regenerar IA'}
          </Button>
        </div>

        {/* Progress bar */}
        {regenerating && (
          <div className="space-y-1">
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${regenProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {regenProgress < 20 ? 'Analizando equipos y servicios del proyecto...' :
               regenProgress < 50 ? 'Generando filas de peligros y controles con IA...' :
               regenProgress < 80 ? 'Evaluando riesgos y controles residuales...' :
               regenProgress < 100 ? 'Finalizando documento...' : 'Listo'}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto border rounded-lg bg-white">
          {editing ? (
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[50vh] font-mono text-sm border-0 focus-visible:ring-0 resize-none"
              disabled={saving}
            />
          ) : (
            <div className="p-4 prose prose-sm max-w-none">
              {doc.contenidoTexto ? (
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h2 className="text-base font-bold mt-4 mb-1">{children}</h2>,
                    h2: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-1">{children}</h3>,
                    h3: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    p: ({ children }) => <p className="text-sm mb-2">{children}</p>,
                    hr: () => <hr className="my-3 border-gray-200" />,
                    ul: ({ children }) => <ul className="list-disc pl-5 text-sm mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 text-sm mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-0.5">{children}</li>,
                  }}
                >
                  {doc.contenidoTexto}
                </ReactMarkdown>
              ) : (
                <span className="text-muted-foreground text-sm">Sin contenido</span>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={showRegenerarConfirm} onOpenChange={setShowRegenerarConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar documento</AlertDialogTitle>
            <AlertDialogDescription>
              Se reemplazará el contenido actual de <strong>{doc.codigoDocumento}</strong> con una nueva versión generada por IA. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenerar}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Regenerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

// ====== TAB 2: PERSONAL ======
function TabPersonal({
  expediente,
  onRefresh,
}: {
  expediente: SsomaExpediente
  onRefresh: () => void
}) {
  const { proyecto } = useProyectoContext()
  const [showAdd, setShowAdd] = useState(false)
  const [usuarios, setUsuarios] = useState<Array<{ id: string; name: string; email: string; rol: string }>>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [cargo, setCargo] = useState('')
  const [adding, setAdding] = useState(false)

  const loadUsuarios = async () => {
    if (!proyecto?.id) return
    try {
      const res = await fetch(`/api/proyecto/${proyecto.id}/personal`)
      if (res.ok) {
        const data = await res.json()
        const personal = data.data?.personalDinamico || []
        setUsuarios(personal.map((p: any) => ({ id: p.user.id, name: p.user.name, email: p.user.email, rol: p.rol })))
      }
    } catch { /* ignore */ }
  }

  const handleAdd = async () => {
    if (!selectedUserId || !cargo) return
    setAdding(true)
    try {
      const res = await fetch('/api/ssoma/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expedienteId: expediente.id,
          userId: selectedUserId,
          cargo,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error')
      }
      toast.success('Trabajador agregado')
      setShowAdd(false)
      setSelectedUserId('')
      setCargo('')
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al agregar')
    } finally {
      setAdding(false)
    }
  }

  const copyFirmaLink = (token: string) => {
    const url = `${window.location.origin}/ssoma/firma/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado al portapapeles')
  }

  const certVencimiento = (dateStr: string | null, label: string) => {
    if (!dateStr) return null
    const exp = isExpired(dateStr)
    const soon = isExpiringSoon(dateStr)
    return (
      <span className={`text-[10px] ${exp ? 'text-red-600 font-medium' : soon ? 'text-amber-600' : 'text-muted-foreground'}`}>
        {label}: {formatDate(dateStr)}
        {exp && ' (VENCIDO)'}
      </span>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{expediente.personal.length} trabajadores</span>
        <Button
          size="sm"
          className="h-8"
          onClick={() => { setShowAdd(true); loadUsuarios() }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Agregar trabajador
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-xs font-medium">Nombre</TableHead>
              <TableHead className="text-xs font-medium">Cargo</TableHead>
              <TableHead className="text-xs font-medium w-[100px]">Estado</TableHead>
              <TableHead className="text-xs font-medium w-[80px]">Firma</TableHead>
              <TableHead className="text-xs font-medium">Certificaciones</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expediente.personal.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                  Sin personal registrado
                </TableCell>
              </TableRow>
            ) : (
              expediente.personal.map((p) => {
                const habEst = habEstadoConfig[p.estado] || habEstadoConfig.pendiente
                return (
                  <TableRow key={p.id}>
                    <TableCell className="py-2">
                      <div>
                        <span className="text-sm font-medium">{p.user.name}</span>
                        <span className="text-xs text-muted-foreground block">{p.user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-sm">{p.cargo}</TableCell>
                    <TableCell className="py-2">
                      <Badge className={`text-xs ${habEst.className}`}>{habEst.label}</Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      {p.firmaDifusion ? (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          <CheckCircle className="h-3 w-3 mr-0.5" />
                          OK
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                          <Clock className="h-3 w-3 mr-0.5" />
                          Pend.
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col gap-0.5">
                        {certVencimiento(p.certAlturaVence, 'Altura')}
                        {certVencimiento(p.certElectricoVence, 'Eléctrico')}
                        {certVencimiento(p.certCalienteVence, 'Caliente')}
                        {certVencimiento(p.aptitudMedicaVence, 'Médica')}
                        {!p.certAlturaVence && !p.certElectricoVence && !p.certCalienteVence && !p.aptitudMedicaVence && (
                          <span className="text-[10px] text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      {!p.firmaDifusion && p.tokenDifusion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => copyFirmaLink(p.tokenDifusion!)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Link
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar trabajador al expediente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Trabajador</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.rol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Cargo en el proyecto</Label>
              <Input
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ej: Técnico Electrónico"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={adding || !selectedUserId || !cargo}>
              {adding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====== TAB 3: ESTADO GENERAL ======
function TabEstado({ expediente }: { expediente: SsomaExpediente }) {
  const docsAprobados = expediente.documentos.filter(d =>
    d.estado === 'aprobado_interno' || d.estado === 'aprobado_cliente' || d.estado === 'enviado_cliente'
  ).length
  const totalDocs = expediente.documentos.length
  const firmados = expediente.personal.filter(p => p.firmaDifusion).length
  const totalPersonal = expediente.personal.length

  const actividadesPresentes = [
    expediente.hayTrabajoElectrico && `Eléctrico (${expediente.nivelElectrico === 'media_alta' ? 'MT/AT' : 'BT'})`,
    expediente.hayTrabajoAltura && 'Altura',
    expediente.hayEspacioConfinado && 'Espacio confinado',
    expediente.hayTrabajoCaliente && 'Trabajo en caliente',
  ].filter(Boolean)

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Resumen visual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{docsAprobados}/{totalDocs}</div>
          <div className="text-xs text-muted-foreground">Docs aprobados</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{firmados}/{totalPersonal}</div>
          <div className="text-xs text-muted-foreground">Firmas difusión</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <Badge className={`text-sm ${habEstadoConfig[expediente.estadoHabilitacion]?.className || 'bg-gray-100'}`}>
            {habEstadoConfig[expediente.estadoHabilitacion]?.label || expediente.estadoHabilitacion}
          </Badge>
          <div className="text-xs text-muted-foreground mt-1">Habilitación</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-sm font-medium text-gray-900">
            {expediente.fechaInicioObra ? formatDate(expediente.fechaInicioObra) : 'No definida'}
          </div>
          <div className="text-xs text-muted-foreground">Inicio de obra</div>
        </div>
      </div>

      {/* Detalles */}
      <div className="border rounded-lg divide-y">
        <div className="p-3">
          <span className="text-xs font-medium text-muted-foreground">Código</span>
          <span className="text-sm font-mono ml-2">{expediente.codigoCod}</span>
        </div>
        <div className="p-3">
          <span className="text-xs font-medium text-muted-foreground">Descripción de trabajos</span>
          <p className="text-sm mt-1">{expediente.descripcionTrabajos}</p>
        </div>
        <div className="p-3">
          <span className="text-xs font-medium text-muted-foreground">Actividades de alto riesgo</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {actividadesPresentes.length > 0 ? actividadesPresentes.map((a, i) => (
              <Badge key={i} variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {a}
              </Badge>
            )) : (
              <span className="text-sm text-muted-foreground">Ninguna</span>
            )}
          </div>
        </div>
        <div className="p-3 grid grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground block">Ing. Seguridad</span>
            {expediente.ingSeguridad || '-'}
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Gestor</span>
            {expediente.gestorNombre || '-'}
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Gerente General</span>
            {expediente.ggNombre || '-'}
          </div>
        </div>
        <div className="p-3">
          <span className="text-xs font-medium text-muted-foreground">Creado</span>
          <span className="text-sm ml-2">{formatDate(expediente.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}
