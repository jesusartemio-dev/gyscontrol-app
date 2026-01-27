'use client'

/**
 * RegistroHorasWizard - Formulario de registro de horas estructurado
 * 
 * Flujo de 5 pasos:
 * 1. Seleccionar Proyecto
 * 2. Seleccionar EDT
 * 3. Seleccionar Nivel
 * 4. Seleccionar Elemento
 * 5. Completar Registro
 * 
 * Garantiza que siempre se registre bajo un EDT con estructura jerárquica
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import {
  Clock,
  Calendar,
  FolderOpen,
  Wrench,
  CheckSquare,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Target,
  Building,
  List
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface RegistroHorasWizardProps {
  onSuccess: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  fechaInicial?: string
}

interface Proyecto {
  id: string
  nombre: string
  codigo: string
  estado: string
  responsableNombre: string
  fechaInicio?: string
  fechaFin?: string
}

interface Edt {
  id: string
  nombre: string
  categoriaNombre: string
  responsableNombre: string
  horasPlan: number
  horasReales: number
  estado: string
  progreso: number
}

interface Elemento {
  id: string
  nombre: string
  tipo: 'actividad' | 'tarea'
  responsableNombre: string
  horasPlan: number
  horasReales: number
  estado: string
  progreso: number
  descripcion?: string
}

interface Paso {
  id: number
  titulo: string
  descripcion: string
  icono: React.ComponentType<any>
  validacion: (datos: any) => boolean
}

export function RegistroHorasWizard({
  onSuccess,
  open,
  onOpenChange,
  fechaInicial
}: RegistroHorasWizardProps) {
  console.log('🧙 WIZARD: Props recibidas:', { open, fechaInicial })
  
  const [pasoActual, setPasoActual] = useState(1)
  const [fecha, setFecha] = useState(fechaInicial || format(new Date(), 'yyyy-MM-dd'))
  const [horas, setHoras] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  // Datos seleccionados
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<Proyecto | null>(null)
  const [edtSeleccionado, setEdtSeleccionado] = useState<Edt | null>(null)
  const [nivelSeleccionado, setNivelSeleccionado] = useState<'actividad' | 'tarea' | ''>('')
  const [elementoSeleccionado, setElementoSeleccionado] = useState<Elemento | null>(null)
  
  // Nuevos estados para jerarquía mejorada
  const [actividadSeleccionada, setActividadSeleccionada] = useState<any>(null)
  const [tareasDeActividad, setTareasDeActividad] = useState<Elemento[]>([])
  
  // Estados para creación de nueva tarea
  const [creandoTarea, setCreandoTarea] = useState(false)
  const [nombreNuevaTarea, setNombreNuevaTarea] = useState('')
  const [descripcionNuevaTarea, setDescripcionNuevaTarea] = useState('')
  const [fechaInicioTarea, setFechaInicioTarea] = useState('')
  const [fechaFinTarea, setFechaFinTarea] = useState('')

  // Datos disponibles
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [edts, setEdts] = useState<Edt[]>([])
  const [actividades, setActividades] = useState<any[]>([])
  const [tareasDirectas, setTareasDirectas] = useState<Elemento[]>([])
  const [elementos, setElementos] = useState<Elemento[]>([])

  const { toast } = useToast()

  // Configuración de pasos
  const pasos: Paso[] = [
    {
      id: 1,
      titulo: 'Seleccionar Proyecto',
      descripcion: 'Elige el proyecto donde registras las horas',
      icono: Building,
      validacion: (datos) => !!datos.proyectoSeleccionado
    },
    {
      id: 2,
      titulo: 'Seleccionar EDT',
      descripcion: 'Selecciona la estructura de descomposición del trabajo',
      icono: FolderOpen,
      validacion: (datos) => !!datos.edtSeleccionado
    },
    {
      id: 3,
      titulo: 'Seleccionar Nivel',
      descripcion: 'Elige si registras en Actividad o Tarea',
      icono: List,
      validacion: (datos) => !!datos.nivelSeleccionado
    },
    {
      id: 4,
      titulo: 'Seleccionar Elemento',
      descripcion: 'Selecciona el elemento específico donde registras',
      icono: Target,
      validacion: (datos) => !!datos.elementoSeleccionado
    },
    {
      id: 5,
      titulo: 'Completar Registro',
      descripcion: 'Ingresa las horas y descripción del trabajo',
      icono: CheckSquare,
      validacion: (datos) => !!datos.horas && !!datos.descripcion && !!datos.fecha
    }
  ]

  const progreso = (pasoActual / pasos.length) * 100

  // Cargar proyectos al montar el componente
  useEffect(() => {
    console.log('🔍 REACT: useEffect ejecutado', { open })
    cargarProyectos()
  }, [])

  // Actualizar fecha cuando cambie fechaInicial
  useEffect(() => {
    console.log('🔄 REACT: useEffect de fecha ejecutado, fechaInicial:', fechaInicial)
    if (fechaInicial) {
      console.log('🔄 REACT: Actualizando fecha inicial:', fechaInicial)
      setFecha(fechaInicial)
    } else {
      console.log('🔄 REACT: fechaInicial está vacío, no actualizar')
    }
  }, [fechaInicial])

  // Limpiar datos cuando se abre/cierra
  useEffect(() => {
    if (!open) {
      limpiarFormulario()
    }
  }, [open])

  const cargarProyectos = async () => {
    try {
      console.log('🔍 REACT: Inicio de carga de proyectos')
      console.log('🔍 REACT: Componente montado, iniciando fetch...')
      
      setLoadingData(true)
      console.log('🔍 REACT: Loading data activado')

      const url = '/api/proyectos'
      console.log('🔍 REACT: URL de la API:', url)

      const response = await fetch(url)
      console.log('🔍 REACT: Response received', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        console.error('❌ REACT: Response no ok', {
          status: response.status,
          statusText: response.statusText
        })
        throw new Error(`Error cargando proyectos: ${response.status} ${response.statusText}`)
      }

      console.log('🔍 REACT: Intentando parsear JSON...')
      const data = await response.json()
      console.log('🔍 REACT: JSON parseado exitosamente', {
        data: data,
        hasData: !!data.data,
        dataLength: data.data?.length || 0,
        dataArray: Array.isArray(data.data),
        success: data.success
      })

      // Mapear datos de la API /api/proyectos al formato esperado
      const proyectos = (data.data || []).map((proyecto: any) => ({
        id: proyecto.id,
        nombre: proyecto.nombre,
        codigo: proyecto.codigo,
        estado: proyecto.estado,
        responsableNombre: proyecto.comercial?.name || proyecto.gestor?.name || 'Sin responsable',
        fechaInicio: proyecto.fechaInicio,
        fechaFin: proyecto.fechaFin
      }))
      console.log('🔍 REACT: Configurando proyectos en estado', {
        proyectosCount: proyectos.length,
        proyectosData: proyectos
      })

      setProyectos(proyectos)
      console.log('✅ REACT: Proyectos configurados en estado')

      console.log('📊 REACT: Estado final de proyectos:', proyectos)

    } catch (error) {
      console.error('❌ REACT: Error en cargarProyectos', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los proyectos',
        variant: 'destructive'
      })
    } finally {
      setLoadingData(false)
      console.log('🔍 REACT: Loading data desactivado')
    }
  }

  const cargarEdts = async (proyectoId: string) => {
    try {
      setLoadingData(true)
      console.log('🔍 REACT: Cargando EDTs para proyecto:', proyectoId)
      
      // Usar la API de EDTs sin autenticación
      const response = await fetch(`/api/edts-proyecto-simple?proyectoId=${proyectoId}`)
      console.log('🔍 REACT: Respuesta EDTs:', { ok: response.ok, status: response.status })
      
      if (!response.ok) {
        throw new Error(`Error cargando EDTs: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('🔍 REACT: Datos EDTs recibidos:', { success: data.success, edtsLength: data.edts?.length || 0 })
      
      if (data.success && data.edts) {
        setEdts(data.edts)
        setElementos([]) // Limpiar elementos del EDT anterior
        console.log('✅ REACT: EDTs configurados:', data.edts.length)
      } else {
        console.error('❌ REACT: Error en respuesta EDTs:', data)
        throw new Error(data.error || 'Error en respuesta de API')
      }
    } catch (error) {
      console.error('❌ REACT: Error cargando EDTs:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los EDTs del proyecto',
        variant: 'destructive'
      })
    } finally {
      setLoadingData(false)
    }
  }

  const cargarElementos = async (edtId: string) => {
    try {
      setLoadingData(true)
      
      if (nivelSeleccionado === 'actividad') {
        // Cargar actividades con sus tareas
        console.log('🏗️ WIZARD: Cargando actividades con tareas para EDT:', edtId)
        const response = await fetch(`/api/horas-hombre/actividades-edt/${edtId}`)
        if (!response.ok) throw new Error('Error cargando actividades')

        const data = await response.json()
        if (data.success && data.actividades) {
          setActividades(data.actividades)
          setTareasDeActividad([])
          setElementos([])
          setTareasDirectas([])
          console.log('✅ WIZARD: Actividades cargadas:', data.actividades.length)
        } else {
          throw new Error(data.error || 'Error en respuesta de API')
        }
      } else if (nivelSeleccionado === 'tarea') {
        // Cargar tareas directas del EDT
        console.log('🎯 WIZARD: Cargando tareas directas para EDT:', edtId)
        const response = await fetch(`/api/horas-hombre/tareas-directas-edt/${edtId}`)
        if (!response.ok) throw new Error('Error cargando tareas directas')

        const data = await response.json()
        if (data.success && data.tareas) {
          setTareasDirectas(data.tareas)
          setElementos(data.tareas)
          setActividades([])
          setTareasDeActividad([])
          console.log('✅ WIZARD: Tareas directas cargadas:', data.tareas.length)
        } else {
          throw new Error(data.error || 'Error en respuesta de API')
        }
      }
    } catch (error) {
      console.error('❌ WIZARD: Error cargando elementos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los elementos',
        variant: 'destructive'
      })
    } finally {
      setLoadingData(false)
    }
  }

  const cargarTareasDeActividad = async (actividadId: string) => {
    try {
      setLoadingData(true)
      const actividad = actividades.find(a => a.id === actividadId)
      if (actividad && actividad.tareas) {
        setTareasDeActividad(actividad.tareas)
        setElementos(actividad.tareas)
        setActividadSeleccionada(actividad)
        console.log('✅ WIZARD: Tareas de actividad cargadas:', actividad.tareas.length)
      }
    } catch (error) {
      console.error('❌ WIZARD: Error cargando tareas de actividad:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las tareas de la actividad',
        variant: 'destructive'
      })
    } finally {
      setLoadingData(false)
    }
  }

  const crearNuevaTarea = async () => {
    if (!nombreNuevaTarea || !descripcionNuevaTarea || !fechaInicioTarea || !fechaFinTarea || !edtSeleccionado || !proyectoSeleccionado) {
      toast({
        title: 'Campos requeridos',
        description: 'Complete todos los campos de la nueva tarea',
        variant: 'destructive'
      })
      return
    }

    try {
      setLoading(true)

      // Crear la nueva tarea
      const response = await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreNuevaTarea,
          descripcion: descripcionNuevaTarea,
          fechaInicio: fechaInicioTarea,
          fechaFin: fechaFinTarea,
          proyectoEdtId: edtSeleccionado.id,
          proyectoId: proyectoSeleccionado.id,
          horasEstimadas: 8, // Default
          estado: 'pendiente'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error('❌ WIZARD: Respuesta de error:', response.status, response.statusText, errorData)
        throw new Error(errorData?.error || `Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('✅ WIZARD: Nueva tarea creada:', data)

      // Establecer la nueva tarea como elemento seleccionado
      const nuevaTarea = {
        id: data.id,
        nombre: nombreNuevaTarea,
        tipo: 'tarea' as const,
        responsableNombre: 'Usuario actual',
        horasPlan: 8,
        horasReales: 0,
        estado: 'pendiente',
        progreso: 0,
        descripcion: descripcionNuevaTarea
      }

      setElementoSeleccionado(nuevaTarea)
      setCreandoTarea(false)
      toast({
        title: 'Tarea creada',
        description: `Nueva tarea "${nombreNuevaTarea}" creada exitosamente`
      })

    } catch (error) {
      console.error('❌ WIZARD: Error creando tarea completo:', error)
      let errorMessage = 'No se pudo crear la nueva tarea'
      
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const limpiarFormulario = () => {
    setPasoActual(1)
    setProyectoSeleccionado(null)
    setEdtSeleccionado(null)
    setNivelSeleccionado('')
    setElementoSeleccionado(null)
    setActividadSeleccionada(null)
    setEdts([])
    setActividades([])
    setTareasDirectas([])
    setElementos([])
    setTareasDeActividad([])
    setFecha(format(new Date(), 'yyyy-MM-dd'))
    setHoras('')
    setDescripcion('')
    setCreandoTarea(false)
    setNombreNuevaTarea('')
    setDescripcionNuevaTarea('')
    setFechaInicioTarea('')
    setFechaFinTarea('')
  }

  const datosActuales = {
    proyectoSeleccionado,
    edtSeleccionado,
    nivelSeleccionado,
    elementoSeleccionado,
    horas,
    descripcion,
    fecha
  }

  const puedeAvanzar = () => {
    return pasos[pasoActual - 1].validacion(datosActuales)
  }

  const puedeRetroceder = () => {
    return pasoActual > 1
  }

  const avanzarPaso = () => {
    if (puedeAvanzar() && pasoActual < pasos.length) {
      const nuevoPaso = pasoActual + 1
      
      // Cargar datos necesarios para el siguiente paso
      if (nuevoPaso === 2 && proyectoSeleccionado) {
        cargarEdts(proyectoSeleccionado.id)
      } else if (nuevoPaso === 4 && edtSeleccionado && nivelSeleccionado) {
        if (nivelSeleccionado === 'actividad') {
          cargarElementos(edtSeleccionado.id) // Solo cargar actividades para nivel actividad
        } else if (nivelSeleccionado === 'tarea') {
          // Para nivel tarea, preparar para crear nueva tarea
          console.log('🆕 WIZARD: Preparando para crear nueva tarea')
          setCreandoTarea(false) // Reset estado
          setElementoSeleccionado(null)
        }
      }
      
      setPasoActual(nuevoPaso)
    }
  }

  const retrocederPaso = () => {
    if (puedeRetroceder()) {
      setPasoActual(pasoActual - 1)
    }
  }

  const registrarHoras = async () => {
    if (!elementoSeleccionado || !horas || !descripcion || !fecha) {
      toast({
        title: 'Campos requeridos',
        description: 'Complete todos los campos obligatorios',
        variant: 'destructive'
      })
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/horas-hombre/registrar-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          horas: parseFloat(horas),
          descripcion,
          proyectoId: proyectoSeleccionado?.id,
          proyectoEdtId: edtSeleccionado?.id,
          proyectoTareaId: elementoSeleccionado.tipo === 'tarea' ? elementoSeleccionado.id : null,
          elementoTipo: elementoSeleccionado.tipo
        })
      })

      if (!response.ok) throw new Error('Error registrando horas')

      const data = await response.json()

      toast({
        title: 'Horas registradas',
        description: `Se registraron ${horas}h en ${elementoSeleccionado.nombre}`
      })

      limpiarFormulario()
      onSuccess()
      onOpenChange?.(false)
    } catch (error) {
      console.error('Error registrando horas:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron registrar las horas',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Log del estado de proyectos
  useEffect(() => {
    console.log('🎨 REACT: Estado de proyectos actualizado:', {
      proyectosLength: proyectos.length,
      proyectos: proyectos,
      proyectoSeleccionado: proyectoSeleccionado,
      loadingData,
      isProyectosArray: Array.isArray(proyectos)
    })
  }, [proyectos, proyectoSeleccionado, loadingData])

  const renderPaso1 = () => {
    console.log('🎨 REACT: Renderizando Paso 1 - Estado actual:', {
      pasoActual,
      loadingData,
      proyectosLength: proyectos.length,
      proyectos: proyectos,
      proyectoSeleccionado: proyectoSeleccionado
    })

    return (
      <div className="space-y-4">
        <Label>Selecciona un proyecto *</Label>
        {loadingData ? (
          <div className="flex items-center gap-2 p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Cargando proyectos...</span>
          </div>
        ) : (
          <Select
            value={proyectoSeleccionado?.id || ''}
            onValueChange={(value) => {
              console.log('🔄 REACT: Proyecto seleccionado', { value })
              const proyecto = proyectos.find(p => p.id === value)
              console.log('🔄 REACT: Proyecto encontrado', { proyecto })
              setProyectoSeleccionado(proyecto || null)
              setEdtSeleccionado(null) // Limpiar EDT seleccionado
              setEdts([]) // Limpiar lista de EDTs
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar proyecto..." />
            </SelectTrigger>
            <SelectContent>
              {proyectos.length === 0 ? (
                <SelectItem value="__empty__" disabled>
                  <div className="text-sm text-gray-500">
                    No hay proyectos disponibles
                  </div>
                </SelectItem>
              ) : (
                proyectos.map((proyecto, index) => {
                  console.log(`🎨 REACT: Renderizando SelectItem ${index + 1}`, { proyecto, index })
                  return (
                    <SelectItem key={proyecto.id} value={proyecto.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{proyecto.nombre}</span>
                        <span className="text-sm text-gray-600">
                          {proyecto.codigo} • {proyecto.responsableNombre}
                        </span>
                      </div>
                    </SelectItem>
                  )
                })
              )}
            </SelectContent>
          </Select>
        )}
        {proyectoSeleccionado && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium">{proyectoSeleccionado.nombre}</div>
                  <div className="text-sm text-gray-600">
                    {proyectoSeleccionado.codigo} • {proyectoSeleccionado.responsableNombre}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderPaso2 = () => (
    <div className="space-y-4">
      <Label>Selecciona un EDT *</Label>
      {!proyectoSeleccionado ? (
        <div className="text-sm text-gray-600 p-4 bg-gray-50 rounded">
          Selecciona primero un proyecto
        </div>
      ) : loadingData ? (
        <div className="flex items-center gap-2 p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Cargando EDTs...</span>
        </div>
      ) : (
        <Select
          value={edtSeleccionado?.id || ''}
          onValueChange={(value) => {
            const edt = edts.find(e => e.id === value)
            setEdtSeleccionado(edt || null)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar EDT..." />
          </SelectTrigger>
          <SelectContent>
            {edts.map((edt) => (
              <SelectItem key={edt.id} value={edt.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{edt.nombre}</span>
                  <span className="text-sm text-gray-600">
                    {edt.categoriaNombre} • {edt.responsableNombre} • {edt.horasReales}h/{edt.horasPlan}h
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {edtSeleccionado && (
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-purple-600" />
              <div>
                <div className="font-medium">{edtSeleccionado.nombre}</div>
                <div className="text-sm text-gray-600">
                  {edtSeleccionado.categoriaNombre} • {edtSeleccionado.responsableNombre}
                </div>
                <div className="text-sm text-gray-600">
                  {edtSeleccionado.horasReales}h registradas de {edtSeleccionado.horasPlan}h planificadas
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderPaso3 = () => (
    <div className="space-y-4">
      <Label>Selecciona el nivel donde registras *</Label>
      <RadioGroup
        value={nivelSeleccionado}
        onValueChange={(value: string) => {
          setNivelSeleccionado(value as 'actividad' | 'tarea')
          setElementoSeleccionado(null) // Limpiar elemento seleccionado
          setActividadSeleccionada(null) // Limpiar actividad seleccionada
          setElementos([]) // Limpiar lista de elementos
          setActividades([]) // Limpiar actividades
          setTareasDirectas([]) // Limpiar tareas directas
          setTareasDeActividad([]) // Limpiar tareas de actividad
          setCreandoTarea(false) // Reset crear tarea
          setNombreNuevaTarea('') // Limpiar campos de nueva tarea
          setDescripcionNuevaTarea('')
          setFechaInicioTarea('')
          setFechaFinTarea('')
        }}
      >
        <div className="flex items-center space-x-2 p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors">
          <RadioGroupItem value="actividad" id="actividad" className="mt-0">
            <div className="flex items-center gap-3">
              <Wrench className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">Actividad (Estructurado)</div>
                <div className="text-sm text-gray-600 mt-1">
                  Registro jerárquico: Actividad → Tarea específica
                </div>
                <div className="text-xs text-green-600 mt-1">
                  ✓ Respeta estructura del cronograma • ✓ Organización clara • ✓ Tareas relacionadas a actividad
                </div>
              </div>
            </div>
          </RadioGroupItem>
        </div>
        <div className="flex items-center space-x-2 p-4 border-2 border-orange-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors">
          <RadioGroupItem value="tarea" id="tarea" className="mt-0">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-orange-600" />
              <div>
                <div className="font-semibold text-orange-800">Tarea Directa (Ágil)</div>
                <div className="text-sm text-gray-600 mt-1">
                  Registro directo: EDT → Tarea específica (sin actividad)
                </div>
                <div className="text-xs text-orange-600 mt-1">
                  ✓ Proceso rápido • ✓ Trabajo independiente • ✓ Sin estructura de actividad
                </div>
              </div>
            </div>
          </RadioGroupItem>
        </div>
      </RadioGroup>
      
      {nivelSeleccionado && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <div className="font-medium">Nivel seleccionado</div>
                <div className="text-sm text-gray-600">
                  {nivelSeleccionado === 'actividad'
                    ? 'Siguiente: Seleccionar Actividad → Tarea específica'
                    : 'Siguiente: Seleccionar Tarea directa del EDT'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderPaso4 = () => {
    console.log('🏗️ WIZARD: Renderizando Paso 4 - Estado:', {
      nivelSeleccionado,
      actividades: actividades.length,
      tareasDirectas: tareasDirectas.length,
      tareasDeActividad: tareasDeActividad.length,
      elementoSeleccionado: elementoSeleccionado?.nombre
    })

    return (
      <div className="space-y-4">
        <Label>Selecciona el elemento específico *</Label>
        
        {!edtSeleccionado || !nivelSeleccionado ? (
          <div className="text-sm text-gray-600 p-4 bg-gray-50 rounded">
            Selecciona primero un EDT y un nivel
          </div>
        ) : nivelSeleccionado === 'actividad' ? (
          // LÓGICA PARA ACTIVIDAD: Mostrar actividades primero
          <div className="space-y-4">
            <div className="text-sm text-blue-600 font-medium">
              🎯 Paso 1: Selecciona la Actividad
            </div>
            {!actividadSeleccionada ? (
              loadingData ? (
                <div className="flex items-center gap-2 p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Cargando actividades...</span>
                </div>
              ) : (
                <Select
                  value={actividadSeleccionada?.id || ''}
                  onValueChange={(value) => {
                    console.log('🎯 WIZARD: Actividad seleccionada:', value)
                    cargarTareasDeActividad(value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar actividad..." />
                  </SelectTrigger>
                  <SelectContent>
                    {actividades.map((actividad) => (
                      <SelectItem key={actividad.id} value={actividad.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{actividad.nombre}</span>
                          <span className="text-sm text-gray-600">
                            {actividad.responsableNombre} • {actividad.tareas?.length || 0} tareas • {actividad.estado}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            ) : (
              // MOSTRAR TAREA DE LA ACTIVIDAD SELECCIONADA
              <div className="space-y-4">
                <div className="text-sm text-green-600 font-medium">
                  ✓ Actividad: {actividadSeleccionada.nombre}
                </div>
                {loadingData ? (
                  <div className="flex items-center gap-2 p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cargando tareas de la actividad...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>🎯 Paso 2: Selecciona la Tarea específica</Label>
                    <Select
                      value={elementoSeleccionado?.id || ''}
                      onValueChange={(value) => {
                        const elemento = tareasDeActividad.find(e => e.id === value)
                        console.log('🎯 WIZARD: Tarea de actividad seleccionada:', value, elemento)
                        setElementoSeleccionado(elemento || null)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tarea de la actividad..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tareasDeActividad.map((tarea) => (
                          <SelectItem key={tarea.id} value={tarea.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{tarea.nombre}</span>
                              <span className="text-sm text-gray-600">
                                {tarea.responsableNombre} • {tarea.horasReales}h/{tarea.horasPlan}h • {tarea.estado}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : nivelSeleccionado === 'tarea' ? (
          // LÓGICA PARA TAREA: Crear nueva tarea (ya que no tiene actividad)
          <div className="space-y-4">
            <div className="text-sm text-orange-600 font-medium">
              🆕 Crear nueva Tarea (ya que no tiene actividad)
            </div>
            {!creandoTarea && !elementoSeleccionado ? (
              <div className="text-center p-6 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50">
                <div className="text-orange-600 font-medium mb-2">
                  📋 Tarea no existe en el cronograma
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  Esta tarea no tiene una actividad asociada, por lo que debe crearse nueva
                </div>
                <Button
                  onClick={() => setCreandoTarea(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  ➕ Crear Nueva Tarea
                </Button>
              </div>
            ) : creandoTarea ? (
              // FORMULARIO DE CREACIÓN DE TAREA
              <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                <div className="text-sm font-medium text-blue-800 mb-3">
                  📝 Datos de la nueva tarea
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombreTarea">Nombre de la tarea *</Label>
                    <Input
                      id="nombreTarea"
                      value={nombreNuevaTarea}
                      onChange={(e) => setNombreNuevaTarea(e.target.value)}
                      placeholder="Ej: Revisión de código módulo PLC"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fechaInicioTarea">Fecha inicio *</Label>
                    <Input
                      id="fechaInicioTarea"
                      type="date"
                      value={fechaInicioTarea}
                      onChange={(e) => setFechaInicioTarea(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="descripcionTarea">Descripción *</Label>
                  <Textarea
                    id="descripcionTarea"
                    value={descripcionNuevaTarea}
                    onChange={(e) => setDescripcionNuevaTarea(e.target.value)}
                    placeholder="Describa detalladamente la tarea a realizar..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="fechaFinTarea">Fecha fin *</Label>
                  <Input
                    id="fechaFinTarea"
                    type="date"
                    value={fechaFinTarea}
                    onChange={(e) => setFechaFinTarea(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={crearNuevaTarea}
                    disabled={loading || !nombreNuevaTarea || !descripcionNuevaTarea || !fechaInicioTarea || !fechaFinTarea}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        ➕ Crear Tarea
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCreandoTarea(false)
                      setNombreNuevaTarea('')
                      setDescripcionNuevaTarea('')
                      setFechaInicioTarea('')
                      setFechaFinTarea('')
                    }}
                  >
                    ❌ Cancelar
                  </Button>
                </div>
              </div>
            ) : elementoSeleccionado ? (
              // TAREA CREADA - MOSTRAR CONFIRMACIÓN
              <div className="p-4 border rounded-lg bg-green-50">
                <div className="text-green-600 font-medium mb-2">
                  ✅ Tarea creada exitosamente
                </div>
                <div className="text-sm text-gray-600">
                  La tarea "<strong>{elementoSeleccionado.nombre}</strong>" ha sido creada y está lista para el registro de horas.
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        
        {elementoSeleccionado && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-green-600" />
                <div>
                  <div className="font-medium">{elementoSeleccionado.nombre}</div>
                  <div className="text-sm text-gray-600">
                    {elementoSeleccionado.responsableNombre} • {elementoSeleccionado.estado}
                  </div>
                  <div className="text-sm text-gray-600">
                    {elementoSeleccionado.horasReales}h registradas de {elementoSeleccionado.horasPlan}h planificadas
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {nivelSeleccionado === 'actividad' && actividadSeleccionada
                      ? `📂 EDT: ${edtSeleccionado?.nombre || 'N/A'} → 🎯 Actividad: ${actividadSeleccionada.nombre} → ✅ Tarea: ${elementoSeleccionado.nombre}`
                      : `📂 EDT: ${edtSeleccionado?.nombre || 'N/A'} → ✅ Tarea: ${elementoSeleccionado.nombre} (directa)`
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderPaso5 = () => {
    console.log('📅 REACT: Renderizando Paso 5 - Estado de fecha:', fecha)
    console.log('📅 REACT: fechaInicial prop:', fechaInicial)
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fecha">Fecha *</Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1"
            />
            <div className="text-xs text-gray-500 mt-1">
              Estado: {fecha} | Prop: {fechaInicial}
            </div>
          </div>
          <div>
            <Label htmlFor="horas">Horas *</Label>
            <Input
              id="horas"
              type="number"
              step="0.5"
              placeholder="8.0"
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="descripcion">Descripción del trabajo *</Label>
          <Textarea
            id="descripcion"
            placeholder="Describa detalladamente el trabajo realizado..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={4}
            className="mt-1"
          />
        </div>

        {/* Resumen de la selección con jerarquía mejorada */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-sm">📋 Resumen del registro - Jerarquía mejorada</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-sm">
            <div><strong>📁 Proyecto:</strong> {proyectoSeleccionado?.nombre}</div>
            <div><strong>📂 EDT:</strong> {edtSeleccionado?.nombre}</div>
            <div><strong>⚙️ Nivel:</strong> {nivelSeleccionado === 'actividad' ? 'Estructurado (Actividad → Tarea)' : 'Ágil (Tarea directa)'}</div>
            
            {/* Mostrar jerarquía según el nivel seleccionado */}
            {nivelSeleccionado === 'actividad' && actividadSeleccionada ? (
              <>
                <div><strong>🎯 Actividad:</strong> {actividadSeleccionada.nombre}</div>
                <div><strong>✅ Tarea:</strong> {elementoSeleccionado?.nombre} (de la actividad)</div>
                <div className="text-xs text-green-600 mt-2 p-2 bg-green-50 rounded">
                  <strong>Jerarquía completa:</strong><br />
                  📁 {proyectoSeleccionado?.nombre} → 📂 {edtSeleccionado?.nombre} → 🎯 {actividadSeleccionada.nombre} → ✅ {elementoSeleccionado?.nombre}
                </div>
              </>
            ) : nivelSeleccionado === 'tarea' ? (
              <>
                <div><strong>✅ Tarea:</strong> {elementoSeleccionado?.nombre} (directa del EDT)</div>
                <div className="text-xs text-orange-600 mt-2 p-2 bg-orange-50 rounded">
                  <strong>Jerarquía simplificada:</strong><br />
                  📁 {proyectoSeleccionado?.nombre} → 📂 {edtSeleccionado?.nombre} → ✅ {elementoSeleccionado?.nombre}
                </div>
              </>
            ) : null}
            
            <div><strong>👤 Responsable:</strong> {elementoSeleccionado?.responsableNombre}</div>
            <div><strong>⏰ Progreso:</strong> {elementoSeleccionado?.horasReales}h/{elementoSeleccionado?.horasPlan}h</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderPasoActual = () => {
    switch (pasoActual) {
      case 1: return renderPaso1()
      case 2: return renderPaso2()
      case 3: return renderPaso3()
      case 4: return renderPaso4()
      case 5: return renderPaso5()
      default: return null
    }
  }

  const content = (
    <div className="space-y-6">
      {/* Header con progreso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Paso {pasoActual} de {pasos.length}: {pasos[pasoActual - 1].titulo}
          </h3>
          <Badge variant="outline">
            {Math.round(progreso)}% completado
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          {pasos[pasoActual - 1].descripcion}
        </p>
        <Progress value={progreso} className="w-full" />
      </div>

      {/* Contenido del paso */}
      <div className="min-h-[300px]">
        {renderPasoActual()}
      </div>

      {/* Botones de navegación */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={retrocederPaso}
          disabled={!puedeRetroceder()}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        {pasoActual < pasos.length ? (
          <Button
            onClick={avanzarPaso}
            disabled={!puedeAvanzar() || loadingData}
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={registrarHoras}
            disabled={loading || !puedeAvanzar()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Registrar Horas
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )

  // Si se pasa open y onOpenChange, usar Dialog
  if (open !== undefined && onOpenChange) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Registro de Horas Estructurado
            </DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  // Si no, devolver el contenido directamente
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Registro de Horas Estructurado
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}