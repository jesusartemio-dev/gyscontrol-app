'use client'

/**
 * TimesheetSemanal - Vista semanal de timesheet como Odoo
 *
 * Calendario interactivo semanal con:
 * - Vista semanal (LUN-DOM)
 * - Drag & drop para registro de horas
 * - Totales por día y semana
 * - Integración con wizard de registro completo
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Plus,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import { RegistroHorasWizard } from '@/components/horas-hombre/RegistroHorasWizard'

interface TimesheetSemanalProps {
  semana?: Date
  onHorasRegistradas?: () => void
}

interface RegistroHoras {
  id: string
  fecha: Date
  horas: number
  descripcion: string
  proyectoNombre: string
  edtNombre: string
  actividadNombre: string | null
  tareaNombre: string | null
  tareaTipo: string
  aprobado: boolean
}

interface ResumenDia {
  fecha: Date
  fechaString: string // ✅ Fecha formateada sin problemas de timezone
  totalHoras: number
  registros: RegistroHoras[]
}

interface ResumenSemana {
  semana: Date
  totalHoras: number
  diasTrabajados: number
  promedioDiario: number
  vsSemanaAnterior: number
}

export function TimesheetSemanal({
  semana = new Date(),
  onHorasRegistradas
}: TimesheetSemanalProps) {
  const [semanaActual, setSemanaActual] = useState(semana)
  const [resumenSemana, setResumenSemana] = useState<ResumenSemana | null>(null)
  const [diasSemana, setDiasSemana] = useState<ResumenDia[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null)
  const [fechaWizard, setFechaWizard] = useState<string>('')
  const { toast } = useToast()

  // Cargar datos de la semana
  useEffect(() => {
    loadTimesheetSemanal()
  }, [semanaActual])

  const loadTimesheetSemanal = async () => {
    try {
      setLoading(true)

      const semanaISO = format(semanaActual, 'yyyy-\'W\'ww')
      const response = await fetch(`/api/horas-hombre/timesheet-semanal?semana=${semanaISO}`)

      if (!response.ok) {
        throw new Error('Error al cargar timesheet')
      }

      const data = await response.json()
      
      console.log('✅ Timesheet data received:', data)

      setResumenSemana(data.data.resumenSemana)
      setDiasSemana(data.data.diasSemana || [])
    } catch (error) {
      console.error('Error cargando timesheet:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el timesheet semanal',
        variant: 'destructive'
      })
      
      // Datos por defecto en caso de error
      const defaultDias = Array.from({ length: 7 }, (_, i) => {
        const dia = addDays(startOfWeek(semanaActual, { weekStartsOn: 1 }), i)
        return {
          fecha: dia,
          fechaString: format(dia, 'yyyy-MM-dd'), // ✅ Agregar fechaString
          totalHoras: 0,
          registros: []
        }
      })
      
      setDiasSemana(defaultDias)
      setResumenSemana({
        semana: semanaActual,
        totalHoras: 0,
        diasTrabajados: 0,
        promedioDiario: 0,
        vsSemanaAnterior: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const navegarSemana = (direccion: 'anterior' | 'siguiente') => {
    const nuevaSemana = direccion === 'anterior'
      ? subWeeks(semanaActual, 1)
      : addWeeks(semanaActual, 1)
    setSemanaActual(nuevaSemana)
  }

  // ✅ Usar fechaString directamente para evitar problemas de timezone
  const abrirRegistroDia = (fechaString: string, fecha?: Date) => {
    console.log('🎯 TIMESHEET: Abriendo registro para día:', fechaString)
    setDiaSeleccionado(fecha || new Date(fechaString + 'T12:00:00')) // Usar mediodía para evitar desfase
    setFechaWizard(fechaString)
    console.log('🎯 TIMESHEET: fechaWizard establecido a:', fechaString)
    setShowWizard(true)
    console.log('🎯 TIMESHEET: Modal abierto')
  }

  const editarRegistro = (registro: RegistroHoras) => {
    console.log('🎯 TIMESHEET: Editando registro:', registro)
    // ✅ Usar fecha con hora mediodía para evitar desfase de timezone
    const fechaRegistro = new Date(registro.fecha)
    const fechaString = format(fechaRegistro, 'yyyy-MM-dd')
    setDiaSeleccionado(fechaRegistro)
    setFechaWizard(fechaString)
    setShowWizard(true)
  }

  const handleRegistroExitoso = () => {
    setShowWizard(false)
    setDiaSeleccionado(null)
    setFechaWizard('')
    loadTimesheetSemanal()
    onHorasRegistradas?.()
    
    toast({
      title: 'Horas registradas',
      description: 'El registro se ha guardado correctamente'
    })
  }

  const getDiaSemana = (fecha: Date) => {
    const dias = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
    return dias[fecha.getDay()]
  }

  const getColorPorHoras = (horas: number) => {
    if (horas === 0) return 'bg-gray-100'
    if (horas < 4) return 'bg-red-100'
    if (horas < 8) return 'bg-yellow-100'
    return 'bg-green-100'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Cargando timesheet semanal...</span>
        </CardContent>
      </Card>
    )
  }

  // Función helper para construir texto jerárquico
  const getTextoJerarquico = (registro: RegistroHoras) => {
    const codigoProyecto = registro.proyectoNombre.split(' - ')[0] || registro.proyectoNombre
    let texto = codigoProyecto

    if (registro.edtNombre && registro.edtNombre !== 'Sin EDT') {
      texto += `-"${registro.edtNombre}"`
    }

    if (registro.actividadNombre) {
      texto += `-"${registro.actividadNombre}"`
    }

    if (registro.tareaNombre) {
      texto += `:${registro.tareaNombre}`
    }

    return texto
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendario Semanal
          </h3>
          <p className="text-sm text-gray-600">
            Semana {format(semanaActual, 'w', { locale: es })} de {format(semanaActual, 'yyyy', { locale: es })}
          </p>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="outline" size="sm" onClick={() => navegarSemana('anterior')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSemanaActual(new Date())}>
            Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={() => navegarSemana('siguiente')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ===== VISTA DESKTOP: Grid de 7 columnas ===== */}
      <div className="hidden md:block">
        {/* Headers de días */}
        <div className="grid grid-cols-7 gap-2 lg:gap-4">
          {Array.from({ length: 7 }, (_, i) => {
            const dia = addDays(startOfWeek(semanaActual, { weekStartsOn: 1 }), i)
            return (
              <div key={i} className="text-center p-2">
                <div className="font-medium text-gray-900">
                  {getDiaSemana(dia)}
                </div>
                <div className="text-sm text-gray-600">
                  {format(dia, 'd', { locale: es })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Celdas de días */}
        <div className="grid grid-cols-7 gap-2 lg:gap-4 mt-2">
          {diasSemana.map((dia, index) => (
            <div
              key={index}
              className={`min-h-[120px] border rounded-lg p-3 cursor-pointer transition-colors hover:shadow-md ${getColorPorHoras(dia.totalHoras)}`}
              onClick={() => abrirRegistroDia(dia.fechaString, dia.fecha)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold">{dia.totalHoras}h</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    abrirRegistroDia(dia.fechaString, dia.fecha)
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="space-y-1">
                {dia.registros.slice(0, 3).map((registro) => (
                  <div
                    key={registro.id}
                    className="text-xs bg-white/80 rounded px-2 py-1 truncate"
                    title={`${getTextoJerarquico(registro)}: ${registro.descripcion}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      editarRegistro(registro)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate flex-1" title={getTextoJerarquico(registro)}>
                        {getTextoJerarquico(registro)}
                      </span>
                      <div className="flex items-center gap-1 ml-1">
                        <span className="font-medium">{registro.horas}h</span>
                        {registro.aprobado && (
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                            ✓
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {dia.registros.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{dia.registros.length - 3} más...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== VISTA MÓVIL: Lista vertical ===== */}
      <div className="md:hidden space-y-2">
        {diasSemana.map((dia, index) => {
          const fechaDia = dia.fecha ? new Date(dia.fecha) : addDays(startOfWeek(semanaActual, { weekStartsOn: 1 }), index)
          const esHoy = format(fechaDia, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

          return (
            <div
              key={index}
              className={`border rounded-lg overflow-hidden ${esHoy ? 'ring-2 ring-blue-500' : ''}`}
            >
              {/* Header del día */}
              <div
                className={`flex items-center justify-between px-4 py-3 cursor-pointer ${getColorPorHoras(dia.totalHoras)}`}
                onClick={() => abrirRegistroDia(dia.fechaString, dia.fecha)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-[45px]">
                    <div className="text-xs font-medium text-gray-600 uppercase">
                      {getDiaSemana(fechaDia)}
                    </div>
                    <div className={`text-xl font-bold ${esHoy ? 'text-blue-600' : 'text-gray-900'}`}>
                      {format(fechaDia, 'd')}
                    </div>
                  </div>
                  <div className="h-10 w-px bg-gray-300" />
                  <div>
                    <span className="text-2xl font-bold text-gray-900">{dia.totalHoras}h</span>
                    {dia.registros.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({dia.registros.length} registro{dia.registros.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    abrirRegistroDia(dia.fechaString, dia.fecha)
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Registros del día */}
              {dia.registros.length > 0 && (
                <div className="bg-white divide-y divide-gray-100">
                  {dia.registros.map((registro) => (
                    <div
                      key={registro.id}
                      className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                      onClick={() => editarRegistro(registro)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {registro.proyectoNombre.split(' - ')[0]}
                          {registro.edtNombre && registro.edtNombre !== 'Sin EDT' && (
                            <span className="text-gray-500"> · {registro.edtNombre}</span>
                          )}
                        </div>
                        {(registro.actividadNombre || registro.tareaNombre) && (
                          <div className="text-xs text-gray-500 truncate">
                            {registro.actividadNombre}
                            {registro.tareaNombre && ` → ${registro.tareaNombre}`}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-sm font-bold text-gray-900">{registro.horas}h</span>
                        {registro.aprobado && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-green-50 text-green-700 border-green-200">
                            ✓
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Wizard de registro de horas */}
      <RegistroHorasWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onSuccess={handleRegistroExitoso}
        fechaInicial={fechaWizard}
      />
    </div>
  )
}