'use client'

/**
 * ⚠️ DEPRECATED - RegistroHorasForm
 *
 * Este componente ha sido reemplazado por RegistroHorasWizard.
 * El sistema ahora usa un flujo estructurado de 5 pasos:
 * Proyecto → EDT → Nivel → Elemento → Completar Registro
 *
 * NO ELIMINAR: Mantener para referencias de migración
 *
 * RegistroHorasForm - Formulario inteligente de registro de horas (LEGACY)
 *
 * Formulario flexible que permitía registrar horas en cualquier nivel:
 * - EDT, Zona, Actividad, Tarea
 * - Con jerarquía inteligente
 * - Búsqueda y selección de elementos
 *
 * ✅ REEMPLAZADO POR: RegistroHorasWizard
 * 📅 FECHA DE DEPRECACIÓN: 2025-11-06
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Clock,
  Search,
  Calendar,
  FolderOpen,
  MapPin,
  Wrench,
  CheckSquare,
  Loader2,
  Plus
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface RegistroHorasFormProps {
  onSuccess: () => void
  tareaPreseleccionada?: {
    id: string
    nombre: string
    nivel: 'tarea' | 'actividad' | 'zona' | 'edt'
  }
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface ElementoCronograma {
  id: string
  nombre: string
  tipo: 'edt' | 'zona' | 'actividad' | 'tarea'
  proyectoNombre: string
  responsableNombre?: string
  horasPlan: number
  horasReales: number
}

export function RegistroHorasForm({
  onSuccess,
  tareaPreseleccionada,
  open,
  onOpenChange
}: RegistroHorasFormProps) {
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [horas, setHoras] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [elementoSeleccionado, setElementoSeleccionado] = useState<ElementoCronograma | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<ElementoCronograma[]>([])
  const [loading, setLoading] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const { toast } = useToast()

  // Si hay tarea preseleccionada, cargarla
  useEffect(() => {
    if (tareaPreseleccionada) {
      buscarElementoPorId(tareaPreseleccionada.id, tareaPreseleccionada.nivel)
    }
  }, [tareaPreseleccionada])

  const buscarElementos = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setResultadosBusqueda([])
      return
    }

    try {
      setBuscando(true)
      const response = await fetch(`/api/horas-hombre/buscar-elementos?q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('Error en búsqueda')

      const data = await response.json()
      setResultadosBusqueda(data.elementos || [])
    } catch (error) {
      console.error('Error buscando elementos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron buscar elementos',
        variant: 'destructive'
      })
    } finally {
      setBuscando(false)
    }
  }

  const buscarElementoPorId = async (id: string, tipo: string) => {
    try {
      const response = await fetch(`/api/horas-hombre/elemento/${tipo}/${id}`)
      if (!response.ok) throw new Error('Error cargando elemento')

      const data = await response.json()
      setElementoSeleccionado(data.elemento)
    } catch (error) {
      console.error('Error cargando elemento:', error)
    }
  }

  const handleBusquedaChange = (value: string) => {
    setBusqueda(value)
    // Debounce búsqueda
    const timeoutId = setTimeout(() => {
      buscarElementos(value)
    }, 300)
    return () => clearTimeout(timeoutId)
  }

  const seleccionarElemento = (elemento: ElementoCronograma) => {
    setElementoSeleccionado(elemento)
    setBusqueda('')
    setResultadosBusqueda([])
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

      const response = await fetch('/api/horas-hombre/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nivel: elementoSeleccionado.tipo,
          id: elementoSeleccionado.id,
          fecha,
          horas: parseFloat(horas),
          descripcion
        })
      })

      if (!response.ok) throw new Error('Error registrando horas')

      toast({
        title: 'Horas registradas',
        description: `Se registraron ${horas}h en ${elementoSeleccionado.nombre}`
      })

      // Limpiar formulario
      setFecha(format(new Date(), 'yyyy-MM-dd'))
      setHoras('')
      setDescripcion('')
      setElementoSeleccionado(null)
      setBusqueda('')
      setResultadosBusqueda([])

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

  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case 'edt': return FolderOpen
      case 'zona': return MapPin
      case 'actividad': return Wrench
      case 'tarea': return CheckSquare
      default: return FolderOpen
    }
  }

  const getColorTipo = (tipo: string) => {
    switch (tipo) {
      case 'edt': return 'text-purple-600'
      case 'zona': return 'text-blue-600'
      case 'actividad': return 'text-green-600'
      case 'tarea': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const content = (
    <div className="space-y-6">
      {/* Fecha */}
      <div>
        <Label htmlFor="fecha">Fecha *</Label>
        <Input
          id="fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Búsqueda de elemento */}
      <div>
        <Label htmlFor="elemento">Elemento del cronograma *</Label>
        <div className="relative mt-1">
          <Input
            id="elemento"
            placeholder="Buscar EDT, Zona, Actividad o Tarea..."
            value={busqueda}
            onChange={(e) => handleBusquedaChange(e.target.value)}
            className="pr-10"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

          {/* Resultados de búsqueda */}
          {resultadosBusqueda.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {resultadosBusqueda.map((elemento) => {
                const IconoTipo = getIconoTipo(elemento.tipo)
                return (
                  <div
                    key={`${elemento.tipo}-${elemento.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => seleccionarElemento(elemento)}
                  >
                    <IconoTipo className={`h-4 w-4 ${getColorTipo(elemento.tipo)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{elemento.nombre}</span>
                        <Badge variant="outline" className="text-xs">
                          {elemento.tipo.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {elemento.proyectoNombre}
                      </div>
                      {elemento.responsableNombre && (
                        <div className="text-xs text-gray-500">
                          👤 {elemento.responsableNombre}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>{elemento.horasReales}h / {elemento.horasPlan}h</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {buscando && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">Buscando...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Elemento seleccionado */}
      {elementoSeleccionado && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {React.createElement(getIconoTipo(elementoSeleccionado.tipo), {
                className: `h-5 w-5 ${getColorTipo(elementoSeleccionado.tipo)}`
              })}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{elementoSeleccionado.nombre}</span>
                  <Badge variant="outline">
                    {elementoSeleccionado.tipo.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  📁 {elementoSeleccionado.proyectoNombre}
                </div>
                {elementoSeleccionado.responsableNombre && (
                  <div className="text-sm text-gray-600">
                    👤 {elementoSeleccionado.responsableNombre}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {elementoSeleccionado.horasReales}h / {elementoSeleccionado.horasPlan}h
                </div>
                <div className="text-xs text-gray-600">Horas registradas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Horas y descripción */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Botones */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => onOpenChange?.(false)}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          onClick={registrarHoras}
          disabled={loading || !elementoSeleccionado || !horas || !descripcion || !fecha}
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
              Registrar Horas
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
          Registrar Horas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}

/**
 * 🚨 COMPONENTE DEPRECADO
 *
 * Este componente ha sido reemplazado por RegistroHorasWizard.
 *
 * ✅ MIGRACIÓN COMPLETADA:
 * - src/app/horas-hombre/registro/page.tsx ✅
 * - src/app/horas-hombre/timesheet/page.tsx ✅
 * - src/components/proyectos/cronograma/ProyectoCronogramaTreeView.tsx ✅
 *
 * 📋 NUEVO FLUJO ESTRUCTURADO:
 * 1. Seleccionar Proyecto
 * 2. Seleccionar EDT
 * 3. Seleccionar Nivel (Actividad/Tarea)
 * 4. Seleccionar Elemento Específico
 * 5. Completar Registro
 *
 * 💡 VENTAJAS DEL NUEVO SISTEMA:
 * - Garantiza registro bajo estructura EDT válida
 * - Flujo paso a paso con validaciones
 * - Mejor experiencia de usuario
 * - Consistencia en el proceso
 *
 * 🔄 CÓMO ACTUALIZAR IMPORTS:
 * ANTES: import { RegistroHorasForm } from '@/components/horas-hombre/RegistroHorasForm'
 * AHORA:  import { RegistroHorasWizard } from '@/components/horas-hombre/RegistroHorasWizard'
 */