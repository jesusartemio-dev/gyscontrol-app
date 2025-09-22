'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Target
} from 'lucide-react'
import { EdtList } from '../EdtList'
import { EdtForm } from '../EdtForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { getCategoriasServicio } from '@/lib/services/categoriaServicio'
import { getUsers } from '@/lib/services/user'
import type { ProyectoEdtConRelaciones, CategoriaServicio, User } from '@/types/modelos'

// ✅ Tipos locales
interface ProyectoFase {
  id: string
  nombre: string
  descripcion?: string
  orden: number
  fechaInicioPlan?: string
  fechaFinPlan?: string
  fechaInicioReal?: string
  fechaFinReal?: string
  estado: 'planificado' | 'en_progreso' | 'completado' | 'pausado' | 'cancelado'
  porcentajeAvance: number
  createdAt: string
  updatedAt: string
  edts: ProyectoEdtConRelaciones[]
  metricas: {
    totalEdts: number
    edtsCompletados: number
    progresoFase: number
    horasPlanTotal: number
    horasRealesTotal: number
  }
}

interface EdtsPorFaseProps {
  fases: ProyectoFase[]
  proyectoId: string
  onRefresh: () => void
}

type ModalActivo = 'crear_edt' | 'editar_edt' | null

export function EdtsPorFase({ fases, proyectoId, onRefresh }: EdtsPorFaseProps) {
  const [faseSeleccionada, setFaseSeleccionada] = useState<string>('')
  const [modalActivo, setModalActivo] = useState<ModalActivo>(null)
  const [edtSeleccionado, setEdtSeleccionado] = useState<ProyectoEdtConRelaciones | null>(null)
  const [loading, setLoading] = useState(false)
  const [categoriasServicios, setCategoriasServicios] = useState<CategoriaServicio[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])

  // ✅ Cargar datos adicionales
  const cargarDatosAdicionales = async () => {
    try {
      const [categoriasData, usuariosData] = await Promise.all([
        getCategoriasServicio(),
        getUsers()
      ])
      setCategoriasServicios(categoriasData || [])
      setUsuarios(usuariosData || [])
    } catch (error) {
      console.error('Error al cargar datos adicionales:', error)
    }
  }

  // ✅ Efectos
  useEffect(() => {
    cargarDatosAdicionales()
  }, [])

  // ✅ Obtener EDTs de la fase seleccionada
  const edtsDeFaseSeleccionada = faseSeleccionada
    ? fases.find(f => f.id === faseSeleccionada)?.edts || []
    : []

  // ✅ Handlers
  const handleFaseChange = (faseId: string) => {
    setFaseSeleccionada(faseId)
  }

  const handleCrearEdt = () => {
    if (!faseSeleccionada) {
      toast({
        title: 'Selecciona una fase',
        description: 'Debes seleccionar una fase antes de crear un EDT',
        variant: 'destructive'
      })
      return
    }
    setEdtSeleccionado(null)
    setModalActivo('crear_edt')
  }

  const handleEditarEdt = (edt: ProyectoEdtConRelaciones) => {
    setEdtSeleccionado(edt)
    setModalActivo('editar_edt')
  }

  const handleEliminarEdt = async (edtId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este EDT?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/proyecto-edt/${edtId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'EDT eliminado',
          description: 'El EDT ha sido eliminado correctamente'
        })
        onRefresh()
      } else {
        throw new Error('Error al eliminar EDT')
      }
    } catch (error) {
      console.error('Error al eliminar EDT:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el EDT',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitEdt = async (data: any) => {
    try {
      const url = edtSeleccionado
        ? `/api/proyecto-edt/${edtSeleccionado.id}`
        : '/api/proyecto-edt'

      const method = edtSeleccionado ? 'PUT' : 'POST'

      // Agregar la fase seleccionada si es creación
      const dataToSend = {
        ...data,
        proyectoFaseId: faseSeleccionada
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: edtSeleccionado ? 'EDT actualizado' : 'EDT creado',
          description: `El EDT ha sido ${edtSeleccionado ? 'actualizado' : 'creado'} correctamente`
        })
        setModalActivo(null)
        setEdtSeleccionado(null)
        onRefresh()
      } else {
        throw new Error(result.error || `Error al ${edtSeleccionado ? 'actualizar' : 'crear'} EDT`)
      }
    } catch (error) {
      console.error(`Error al ${edtSeleccionado ? 'actualizar' : 'crear'} EDT:`, error)
      throw error
    }
  }

  // ✅ Función para obtener color del estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completado': return 'bg-green-100 text-green-800 border-green-200'
      case 'en_progreso': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'planificado': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'pausado': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelado': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (fases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay fases disponibles</h3>
          <p className="text-muted-foreground text-center">
            Crea fases primero para poder asignar EDTs a ellas
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ✅ Selector de fase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            EDTs por Fase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={faseSeleccionada} onValueChange={handleFaseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una fase para ver sus EDTs" />
                </SelectTrigger>
                <SelectContent>
                  {fases.map((fase) => (
                    <SelectItem key={fase.id} value={fase.id}>
                      Fase {fase.orden}: {fase.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCrearEdt}
              disabled={!faseSeleccionada}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo EDT
            </Button>
          </div>

          {/* ✅ Información de la fase seleccionada */}
          {faseSeleccionada && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              {(() => {
                const fase = fases.find(f => f.id === faseSeleccionada)!
                return (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {fase.metricas.totalEdts}
                      </div>
                      <div className="text-xs text-muted-foreground">EDTs Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {fase.metricas.edtsCompletados}
                      </div>
                      <div className="text-xs text-muted-foreground">Completados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {fase.metricas.horasPlanTotal}
                      </div>
                      <div className="text-xs text-muted-foreground">Horas Plan</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {fase.metricas.horasRealesTotal}
                      </div>
                      <div className="text-xs text-muted-foreground">Horas Reales</div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ Lista de EDTs de la fase seleccionada */}
      {faseSeleccionada && (
        <Card>
          <CardHeader>
            <CardTitle>
              EDTs de la Fase: {fases.find(f => f.id === faseSeleccionada)?.nombre}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {edtsDeFaseSeleccionada.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay EDTs en esta fase</h3>
                <p className="text-muted-foreground mb-4">
                  Crea EDTs para organizar las tareas de esta fase
                </p>
                <Button onClick={handleCrearEdt}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer EDT
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {edtsDeFaseSeleccionada.map((edt) => (
                  <div
                    key={edt.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{edt.nombre}</h4>
                        <Badge
                          variant="outline"
                          className={getEstadoColor(edt.estado)}
                        >
                          {edt.estado.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {edt.categoriaServicio?.nombre}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Horas: {edt.horasPlan}h plan / {edt.horasReales}h real</span>
                        <span>Avance: {edt.porcentajeAvance}%</span>
                      </div>
                      <Progress value={edt.porcentajeAvance} className="h-2 mt-2" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditarEdt(edt)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEliminarEdt(edt.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ✅ Modal para crear/editar EDT */}
      <Dialog open={modalActivo === 'crear_edt'} onOpenChange={() => setModalActivo(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo EDT</DialogTitle>
          </DialogHeader>
          <EdtForm
            proyectoId={proyectoId}
            categoriasServicios={categoriasServicios}
            usuarios={usuarios}
            onSubmit={handleSubmitEdt}
            onCancel={() => setModalActivo(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modalActivo === 'editar_edt'} onOpenChange={() => {
        setModalActivo(null)
        setEdtSeleccionado(null)
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar EDT</DialogTitle>
          </DialogHeader>
          {edtSeleccionado && (
            <EdtForm
              proyectoId={proyectoId}
              edt={edtSeleccionado}
              categoriasServicios={categoriasServicios}
              usuarios={usuarios}
              onSubmit={handleSubmitEdt}
              onCancel={() => {
                setModalActivo(null)
                setEdtSeleccionado(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}