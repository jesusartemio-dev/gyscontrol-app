'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Edit3,
  Calendar,
  DollarSign,
  User,
  Building2,
  FileText,
  AlertCircle,
  Loader2,
  MessageSquare,
  Percent,
  ExternalLink,
  Flag,
  FolderKanban
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { OportunidadForm } from '@/components/crm'
import ActividadForm from '@/components/crm/ActividadForm'
import ActividadList from '@/components/crm/ActividadList'
import CrmEtapasStepper from '@/components/crm/CrmEtapasStepper'
import { getOportunidadById, CrmOportunidad, CRM_PRIORIDADES } from '@/lib/services/crm'
import { getClientes } from '@/lib/services/cliente'
import { getUsuarios } from '@/lib/services/usuario'
import { getCotizacionById } from '@/lib/services/cotizacion'
import { getProyectoById } from '@/lib/services/proyecto'
import CrearCotizacionDesdeOportunidadModal from '@/components/crm/CrearCotizacionDesdeOportunidadModal'
import CrearProyectoDesdeCotizacionModal from '@/components/proyectos/CrearProyectoDesdeCotizacionModal'
import type { Proyecto, Cotizacion } from '@/types'

interface Cliente {
  id: string
  nombre: string
  ruc?: string
  sector?: string
}

interface Usuario {
  id: string
  name: string
  email: string
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const getPrioridadColor = (prioridad: string) => {
  switch (prioridad) {
    case CRM_PRIORIDADES.CRITICA:
      return 'bg-red-100 text-red-700 border-red-200'
    case CRM_PRIORIDADES.ALTA:
      return 'bg-orange-100 text-orange-700 border-orange-200'
    case CRM_PRIORIDADES.MEDIA:
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function OportunidadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()

  const [oportunidad, setOportunidad] = useState<CrmOportunidad | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showActividadForm, setShowActividadForm] = useState(false)
  const [showCotizacionModal, setShowCotizacionModal] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cotizacionFull, setCotizacionFull] = useState<Cotizacion | null>(null)
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)

  const id = params.id as string

  const loadOportunidad = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getOportunidadById(id)
      setOportunidad(data)

      if (data.cotizacionId) {
        try {
          const cotizacionData = await getCotizacionById(data.cotizacionId)
          setCotizacionFull(cotizacionData)
        } catch (relatedErr) {
          console.error('Error al cargar cotización:', relatedErr)
        }
      } else {
        setCotizacionFull(null)
      }

      if (data.proyectoId) {
        try {
          const proyectoData = await getProyectoById(data.proyectoId)
          setProyecto(proyectoData || null)
        } catch (relatedErr) {
          console.error('Error al cargar proyecto:', relatedErr)
          setProyecto(null)
        }
      } else {
        setProyecto(null)
      }
    } catch (err) {
      console.error('Error al cargar oportunidad:', err)
      setError('No se pudo cargar la oportunidad')
      toast({
        title: "Error",
        description: "No se pudo cargar la información de la oportunidad",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAuxiliaryData = async () => {
    try {
      const [clientesData, usuariosData] = await Promise.all([
        getClientes(),
        getUsuarios()
      ])
      setClientes(clientesData)
      setUsuarios(usuariosData)
    } catch (error) {
      console.error('Error al cargar datos auxiliares:', error)
    }
  }

  useEffect(() => {
    if (id) {
      loadOportunidad()
      loadAuxiliaryData()
    }
  }, [id])

  const handleEditSuccess = (updatedOportunidad: CrmOportunidad) => {
    setOportunidad(updatedOportunidad)
    setShowEditForm(false)
    toast({
      title: "Oportunidad actualizada",
      description: "Los cambios se han guardado correctamente.",
    })
  }

  const handleActividadSuccess = () => {
    setShowActividadForm(false)
    loadOportunidad()
    toast({
      title: "Actividad registrada",
      description: "La actividad se ha registrado correctamente.",
    })
  }

  const handleCotizacionSuccess = () => {
    setShowCotizacionModal(false)
    loadOportunidad()
    toast({
      title: "Cotización creada",
      description: "La cotización se ha creado y enlazado a la oportunidad.",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Cargando oportunidad...</p>
        </div>
      </div>
    )
  }

  if (error || !oportunidad) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h3 className="font-semibold">Error al cargar oportunidad</h3>
          <p className="text-sm text-muted-foreground">{error || 'Oportunidad no encontrada'}</p>
          <Button size="sm" onClick={() => router.push('/crm/oportunidades')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Oportunidades
          </Button>
        </div>
      </div>
    )
  }

  const diasSinContacto = oportunidad.fechaUltimoContacto
    ? Math.floor((new Date().getTime() - new Date(oportunidad.fechaUltimoContacto).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="p-4 space-y-4">
      {/* Header compacto */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/crm/oportunidades')} className="h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold truncate">{oportunidad.nombre}</h1>
          <Badge variant="outline" className={`text-xs shrink-0 ${getPrioridadColor(oportunidad.prioridad)}`}>
            <Flag className="h-3 w-3 mr-1" />
            {oportunidad.prioridad}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => setShowEditForm(true)} className="h-7 w-7 p-0 ml-1">
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-1">
          <CrmEtapasStepper
            oportunidad={oportunidad}
            onUpdated={setOportunidad}
          />
        </div>

        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{oportunidad.cliente?.nombre || 'Sin cliente'}</span>
          </span>
          <span className="text-muted-foreground hidden sm:inline">|</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            {oportunidad.comercial?.name || 'Sin comercial'}
          </span>
          <span className="text-muted-foreground hidden sm:inline">|</span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-green-600" />
            <span className="font-semibold text-green-600">
              {oportunidad.valorEstimado ? formatCurrency(oportunidad.valorEstimado) : '-'}
            </span>
          </span>
          <span className="text-muted-foreground hidden sm:inline">|</span>
          <span className="flex items-center gap-1">
            <Percent className="h-3.5 w-3.5 text-blue-600" />
            <span className="font-semibold text-blue-600">{oportunidad.probabilidad}%</span>
          </span>
          <span className="text-muted-foreground hidden sm:inline">|</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{oportunidad._count?.actividades || 0}</span> act.
          </span>
          {diasSinContacto !== null && diasSinContacto > 7 && (
            <>
              <span className="text-muted-foreground hidden sm:inline">|</span>
              <span className="flex items-center gap-1 text-orange-600">
                <AlertCircle className="h-3.5 w-3.5" />
                {diasSinContacto}d sin contacto
              </span>
            </>
          )}
          {oportunidad.fechaCierreEstimada && (
            <>
              <span className="text-muted-foreground hidden sm:inline">|</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Cierre: {formatDate(oportunidad.fechaCierreEstimada)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="space-y-4">
        {/* Cotización asociada */}
        {oportunidad.cotizacion ? (
          <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50/50">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-900">{oportunidad.cotizacion.codigo}</span>
                <Badge variant={
                  oportunidad.cotizacion.estado === 'aprobada' ? 'default' :
                  oportunidad.cotizacion.estado === 'enviada' ? 'secondary' : 'outline'
                } className="text-xs">
                  {oportunidad.cotizacion.estado}
                </Badge>
                <span className="text-sm text-blue-700">
                  {oportunidad.cotizacion.totalCliente ? formatCurrency(oportunidad.cotizacion.totalCliente) : ''}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
              onClick={() => router.push(`/comercial/cotizaciones/${oportunidad.cotizacion!.id}`)}
            >
              Ver cotización
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-lg border border-dashed">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sin cotización asociada</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowCotizacionModal(true)}>
              Crear cotización
            </Button>
          </div>
        )}

        {/* Proyecto asociado */}
        {proyecto ? (
          <div className="flex items-center justify-between p-3 rounded-lg border border-purple-200 bg-purple-50/50">
            <div className="flex items-center gap-3">
              <FolderKanban className="h-5 w-5 text-purple-600" />
              <div className="flex items-center gap-2">
                <span className="font-semibold text-purple-900">{proyecto.codigo}</span>
                <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                  {proyecto.estado}
                </Badge>
                <span className="text-sm text-purple-700">{proyecto.nombre}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-purple-700 hover:text-purple-900 hover:bg-purple-100"
              onClick={() => router.push(`/proyectos/${proyecto.id}`)}
            >
              Ver proyecto
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        ) : oportunidad.cotizacion?.estado === 'aprobada' && cotizacionFull ? (
          <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-purple-300">
            <div className="flex items-center gap-3">
              <FolderKanban className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Cotización aprobada - Listo para crear proyecto</span>
            </div>
            <CrearProyectoDesdeCotizacionModal
              cotizacion={cotizacionFull}
              buttonVariant="default"
              buttonSize="sm"
              buttonClassName="bg-purple-600 hover:bg-purple-700"
            />
          </div>
        ) : null}

        {/* Descripción + Info adicional */}
        {(oportunidad.descripcion || oportunidad.notas || oportunidad.competencia) && (
          <div className="text-sm space-y-2">
            {oportunidad.descripcion && (
              <p className="text-muted-foreground">{oportunidad.descripcion}</p>
            )}
            {(oportunidad.competencia || oportunidad.notas) && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                {oportunidad.competencia && <span>Competidores: {oportunidad.competencia}</span>}
                {oportunidad.notas && <span>Notas: {oportunidad.notas}</span>}
              </div>
            )}
          </div>
        )}

        {/* Actividades */}
        <ActividadList
          oportunidadId={id}
          onNuevaActividad={() => setShowActividadForm(true)}
        />
      </div>

      {/* Modales */}
      <OportunidadForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        oportunidad={oportunidad}
        onSuccess={handleEditSuccess}
        clientes={clientes}
        usuarios={usuarios}
      />

      <Dialog open={showActividadForm} onOpenChange={setShowActividadForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Actividad</DialogTitle>
          </DialogHeader>
          <ActividadForm
            oportunidadId={id}
            onSuccess={handleActividadSuccess}
            onCancel={() => setShowActividadForm(false)}
          />
        </DialogContent>
      </Dialog>

      {oportunidad && showCotizacionModal && (
        <CrearCotizacionDesdeOportunidadModal
          oportunidad={oportunidad}
          onSuccess={handleCotizacionSuccess}
          onClose={() => setShowCotizacionModal(false)}
        />
      )}
    </div>
  )
}
