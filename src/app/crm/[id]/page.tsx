'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Calendar,
  DollarSign,
  User,
  Building2,
  TrendingUp,
  Target,
  Clock,
  FileText,
  Users,
  AlertCircle,
  Loader2,
  MessageSquare,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { OportunidadForm } from '@/components/crm'
import ActividadForm from '@/components/crm/ActividadForm'
import ActividadList from '@/components/crm/ActividadList'
import CrmEtapasToolbar from '@/components/crm/CrmEtapasToolbar'
import { getOportunidadById, CrmOportunidad, CRM_ESTADOS_OPORTUNIDAD, CRM_PRIORIDADES } from '@/lib/services/crm'
import { getClientes } from '@/lib/services/cliente'
import { getUsuarios } from '@/lib/services/usuario'
import type { CrmActividad } from '@/lib/services/crm/actividades'
import CrearCotizacionDesdeOportunidadModal from '@/components/crm/CrearCotizacionDesdeOportunidadModal'

// ✅ Tipos para datos reales
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

// ✅ Formateadores de utilidad
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
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
  const [showHistorialModal, setShowHistorialModal] = useState(false)
  const [showCotizacionModal, setShowCotizacionModal] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])

  const id = params.id as string

  // ✅ Cargar datos de la oportunidad
  const loadOportunidad = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await getOportunidadById(id)
      setOportunidad(data)
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

  // ✅ Cargar datos auxiliares
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

  // ✅ Efecto para cargar datos
  useEffect(() => {
    if (id) {
      loadOportunidad()
      loadAuxiliaryData()
    }
  }, [id])

  // ✅ Manejar edición exitosa
  const handleEditSuccess = (updatedOportunidad: CrmOportunidad) => {
    setOportunidad(updatedOportunidad)
    setShowEditForm(false)
    toast({
      title: "Oportunidad actualizada",
      description: "Los cambios se han guardado correctamente.",
    })
  }

  // ✅ Manejar nueva actividad
  const handleNuevaActividad = () => {
    setShowActividadForm(true)
  }

  // ✅ Manejar ver historial
  const handleVerHistorial = () => {
    setShowHistorialModal(true)
  }

  // ✅ Manejar crear cotización
  const handleCrearCotizacion = () => {
    setShowCotizacionModal(true)
  }

  // ✅ Manejar cotización creada exitosamente
  const handleCotizacionSuccess = (cotizacionId: string) => {
    setShowCotizacionModal(false)
    // Recargar la oportunidad para actualizar el estado
    loadOportunidad()
    toast({
      title: "Cotización creada",
      description: "La cotización se ha creado y enlazado a la oportunidad.",
    })
    // La redirección se maneja en el modal
  }

  // ✅ Manejar actividad creada exitosamente
  const handleActividadSuccess = (nuevaActividad: CrmActividad) => {
    setShowActividadForm(false)
    // Recargar la oportunidad para actualizar el contador de actividades
    loadOportunidad()
    toast({
      title: "Actividad registrada",
      description: "La actividad se ha registrado correctamente.",
    })
  }

  // ✅ Obtener variante de badge según estado
  const getEstadoVariant = (estado: string) => {
    switch (estado) {
      case CRM_ESTADOS_OPORTUNIDAD.CERRADA_GANADA:
        return 'default'
      case CRM_ESTADOS_OPORTUNIDAD.CERRADA_PERDIDA:
        return 'destructive'
      case CRM_ESTADOS_OPORTUNIDAD.NEGOCIACION:
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // ✅ Obtener variante de badge según prioridad
  const getPrioridadVariant = (prioridad: string) => {
    switch (prioridad) {
      case CRM_PRIORIDADES.CRITICA:
        return 'destructive'
      case CRM_PRIORIDADES.ALTA:
        return 'default'
      case CRM_PRIORIDADES.MEDIA:
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // ✅ Loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando oportunidad...</p>
          </div>
        </div>
      </div>
    )
  }

  // ✅ Error state
  if (error || !oportunidad) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-semibold">Error al cargar oportunidad</h3>
            <p className="text-muted-foreground">{error || 'Oportunidad no encontrada'}</p>
            <Button onClick={() => router.push('/crm')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al CRM
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header con navegación */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/crm')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{oportunidad.nombre}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">
                Oportunidad comercial
              </p>
              {oportunidad.cotizacion && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100"
                    onClick={() => router.push(`/comercial/cotizaciones/${oportunidad.cotizacion?.id}`)}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Cotización: {oportunidad.cotizacion.codigo}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowEditForm(true)}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline">
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </motion.div>

      {/* Información principal */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Información básica */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Información de la Oportunidad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {oportunidad.cliente?.nombre || 'Sin cliente asignado'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Comercial</label>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {oportunidad.comercial?.name || 'Sin comercial asignado'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor Estimado</label>
                  <p className="text-lg font-bold text-green-600 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {oportunidad.valorEstimado ? formatCurrency(oportunidad.valorEstimado) : 'No especificado'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Probabilidad</label>
                  <p className="text-lg font-bold text-blue-600">
                    {oportunidad.probabilidad}%
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                <p className="text-sm mt-1">
                  {oportunidad.descripcion || 'Sin descripción'}
                </p>
              </div>

              {oportunidad.fechaCierreEstimada && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fecha Estimada de Cierre</label>
                  <p className="text-sm font-medium flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(oportunidad.fechaCierreEstimada)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información adicional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información Adicional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado</label>
                  <div className="mt-1">
                    <Badge variant={getEstadoVariant(oportunidad.estado)}>
                      {oportunidad.estado}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Prioridad</label>
                  <div className="mt-1">
                    <Badge variant={getPrioridadVariant(oportunidad.prioridad)}>
                      {oportunidad.prioridad}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fuente</label>
                  <p className="text-sm font-medium mt-1">
                    {oportunidad.fuente || 'No especificada'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Último Contacto</label>
                  <p className="text-sm font-medium mt-1 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {oportunidad.fechaUltimoContacto ? formatDate(oportunidad.fechaUltimoContacto) : 'Sin registro'}
                  </p>
                </div>
              </div>

              {oportunidad.responsable && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Responsable</label>
                  <p className="text-sm font-medium flex items-center gap-2 mt-1">
                    <User className="h-4 w-4" />
                    {oportunidad.responsable.name}
                    <span className="text-muted-foreground">({oportunidad.responsable.email})</span>
                  </p>
                </div>
              )}

              {oportunidad.competencia && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Competidores</label>
                  <p className="text-sm mt-1">
                    {oportunidad.competencia}
                  </p>
                </div>
              )}

              {oportunidad.notas && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notas Internas</label>
                  <p className="text-sm mt-1">
                    {oportunidad.notas}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cotización Asociada */}
          {oportunidad.cotizacion && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Cotización Asociada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Código</label>
                    <p className="text-lg font-bold text-blue-600">
                      {oportunidad.cotizacion.codigo}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Estado</label>
                    <div className="mt-1">
                      <Badge variant={
                        oportunidad.cotizacion.estado === 'aprobada' ? 'default' :
                        oportunidad.cotizacion.estado === 'enviada' ? 'secondary' :
                        oportunidad.cotizacion.estado === 'borrador' ? 'outline' : 'destructive'
                      }>
                        {oportunidad.cotizacion.estado}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Cliente</label>
                    <p className="text-lg font-bold text-green-600">
                      {oportunidad.cotizacion.totalCliente ? formatCurrency(oportunidad.cotizacion.totalCliente) : 'N/A'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha de Envío</label>
                    <p className="text-sm font-medium">
                      {oportunidad.cotizacion.fechaEnvio ? formatDate(oportunidad.cotizacion.fechaEnvio) : 'No enviada'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => router.push(`/comercial/cotizaciones/${oportunidad.cotizacion!.id}`)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Cotización Completa
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {/* Etapas CRM */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Gestión CRM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CrmEtapasToolbar
                oportunidad={oportunidad}
                onUpdated={setOportunidad}
              />
            </CardContent>
          </Card>

          {/* Estadísticas rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Estadísticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {oportunidad.probabilidad}%
                </div>
                <p className="text-sm text-muted-foreground">Probabilidad de Éxito</p>
              </div>

              <Separator />

              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {oportunidad._count?.actividades || 0}
                </div>
                <p className="text-sm text-muted-foreground">Actividades Registradas</p>
              </div>
            </CardContent>
          </Card>

          {/* Acciones rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setShowEditForm(true)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Editar Oportunidad
              </Button>

              {oportunidad.cotizacion ? (
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => router.push(`/comercial/cotizaciones/${oportunidad.cotizacion!.id}`)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Cotización ({oportunidad.cotizacion.codigo})
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant="default"
                  onClick={handleCrearCotizacion}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Crear Cotización
                </Button>
              )}

              <Button
                className="w-full"
                variant="outline"
                onClick={handleNuevaActividad}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Agregar Actividad
              </Button>

              <Button
                className="w-full"
                variant="outline"
                onClick={handleVerHistorial}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Ver Análisis
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Actividades */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <ActividadList
          oportunidadId={id}
          onNuevaActividad={handleNuevaActividad}
        />
      </motion.div>

      {/* Formulario de edición modal */}
      <OportunidadForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        oportunidad={oportunidad}
        onSuccess={handleEditSuccess}
        clientes={clientes}
        usuarios={usuarios}
      />

      {/* Formulario de actividad modal */}
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

      {/* Modal de análisis de actividades */}
      <Dialog open={showHistorialModal} onOpenChange={setShowHistorialModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Análisis de {oportunidad?.nombre}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Estadísticas principales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Actividades
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold text-blue-600">
                    {oportunidad?._count?.actividades || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium">Días Activos</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold text-green-600">
                    {oportunidad?.createdAt ?
                      Math.floor((new Date().getTime() - new Date(oportunidad.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                      : 0
                    }
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium">Último Contacto</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm font-bold text-purple-600">
                    {oportunidad?.fechaUltimoContacto ?
                      formatDate(oportunidad.fechaUltimoContacto)
                      : 'Sin registro'
                    }
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium">Días sin Actividad</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold text-orange-600">
                    {oportunidad?.fechaUltimoContacto ?
                      Math.floor((new Date().getTime() - new Date(oportunidad.fechaUltimoContacto).getTime()) / (1000 * 60 * 60 * 24))
                      : 'N/A'
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Información del progreso */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Estado de la Oportunidad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Probabilidad de Éxito</span>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {oportunidad?.probabilidad || 0}%
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estado Actual</span>
                    <Badge variant={getEstadoVariant(oportunidad?.estado || '')}>
                      {oportunidad?.estado || 'Sin estado'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Valor Estimado</span>
                    <span className="font-bold text-green-600">
                      {oportunidad?.valorEstimado ? formatCurrency(oportunidad.valorEstimado) : 'No especificado'}
                    </span>
                  </div>

                  {oportunidad?.fechaCierreEstimada && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Fecha Estimada de Cierre</span>
                      <span className="text-sm font-medium">
                        {formatDate(oportunidad.fechaCierreEstimada)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Rendimiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Actividades por Día</span>
                    <span className="font-bold text-blue-600">
                      {oportunidad?.createdAt && oportunidad._count?.actividades ?
                        (oportunidad._count.actividades / Math.max(1, Math.floor((new Date().getTime() - new Date(oportunidad.createdAt).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(1)
                        : '0'
                      }
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Frecuencia</span>
                    <span className="text-sm font-medium">
                      {oportunidad?._count?.actividades ?
                        (oportunidad._count.actividades > 5 ? 'Alta' : oportunidad._count.actividades > 2 ? 'Media' : 'Baja')
                        : 'Sin datos'
                      }
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Prioridad</span>
                    <Badge variant={getPrioridadVariant(oportunidad?.prioridad || '')}>
                      {oportunidad?.prioridad || 'No definida'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recomendaciones inteligentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recomendaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(!oportunidad?._count?.actividades || oportunidad._count.actividades === 0) && (
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">!</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">Registrar primera actividad</p>
                        <p className="text-xs text-blue-700">Comienza el seguimiento registrando una llamada o email inicial</p>
                      </div>
                    </div>
                  )}

                  {oportunidad?.fechaUltimoContacto &&
                   (new Date().getTime() - new Date(oportunidad.fechaUltimoContacto).getTime()) > (7 * 24 * 60 * 60 * 1000) && (
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-orange-600">!</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-orange-900">Hace tiempo sin contacto</p>
                        <p className="text-xs text-orange-700">Considera registrar un seguimiento para mantener el engagement</p>
                      </div>
                    </div>
                  )}

                  {oportunidad?._count?.actividades && oportunidad._count.actividades > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-green-600">✓</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-900">Buen seguimiento</p>
                        <p className="text-xs text-green-700">Continúa registrando actividades para mantener el momentum</p>
                      </div>
                    </div>
                  )}

                  {oportunidad?.probabilidad && oportunidad.probabilidad >= 70 && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-green-600">🎯</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-900">Alta probabilidad de cierre</p>
                        <p className="text-xs text-green-700">Enfócate en cerrar la negociación en las próximas semanas</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de crear cotización */}
      {oportunidad && showCotizacionModal && (
        <CrearCotizacionDesdeOportunidadModal
          oportunidad={oportunidad}
          onSuccess={handleCotizacionSuccess}
          onClose={() => setShowCotizacionModal(false)}
        />
      )}
    </motion.div>
  )
}