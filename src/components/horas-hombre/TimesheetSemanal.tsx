'use client'

/**
 * TimesheetSemanal - Vista semanal de timesheet
 *
 * Calendario interactivo semanal con:
 * - Vista semanal (LUN-DOM)
 * - Totales por día y semana
 * - Edición y eliminación de registros inline
 * - Integración con wizard de registro completo
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Save
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import { RegistroHorasWizard } from '@/components/horas-hombre/RegistroHorasWizard'

interface TimesheetSemanalProps {
  semana?: Date
  onHorasRegistradas?: () => void
  onSemanaChange?: (nuevaSemana: Date) => void
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
  origen: string | null
}

interface ResumenDia {
  fecha: Date
  fechaString: string
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
  onHorasRegistradas,
  onSemanaChange
}: TimesheetSemanalProps) {
  const [semanaActual, setSemanaActual] = useState(semana)
  const [resumenSemana, setResumenSemana] = useState<ResumenSemana | null>(null)
  const [diasSemana, setDiasSemana] = useState<ResumenDia[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null)
  const [fechaWizard, setFechaWizard] = useState<string>('')
  const { toast } = useToast()

  // Estado para edición inline
  const [editingRegistro, setEditingRegistro] = useState<RegistroHoras | null>(null)
  const [editHoras, setEditHoras] = useState('')
  const [editDescripcion, setEditDescripcion] = useState('')
  const [editFecha, setEditFecha] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Sync with parent's semana prop (compare by timestamp to avoid infinite loops)
  useEffect(() => {
    if (semana.getTime() !== semanaActual.getTime()) {
      setSemanaActual(semana)
    }
  }, [semana.getTime()])

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

      setResumenSemana(data.data.resumenSemana)
      setDiasSemana(data.data.diasSemana || [])
    } catch (error) {
      console.error('Error cargando timesheet:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el timesheet semanal',
        variant: 'destructive'
      })

      const defaultDias = Array.from({ length: 7 }, (_, i) => {
        const dia = addDays(startOfWeek(semanaActual, { weekStartsOn: 1 }), i)
        return {
          fecha: dia,
          fechaString: format(dia, 'yyyy-MM-dd'),
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
    onSemanaChange?.(nuevaSemana)
  }

  const abrirRegistroDia = (fechaString: string, fecha?: Date) => {
    setDiaSeleccionado(fecha || new Date(fechaString + 'T12:00:00'))
    setFechaWizard(fechaString)
    setShowWizard(true)
  }

  // Abrir modal de edición
  const abrirEdicion = (registro: RegistroHoras) => {
    const fechaStr = String(registro.fecha)
    const fechaString = fechaStr.length >= 10 ? fechaStr.substring(0, 10) : format(new Date(fechaStr), 'yyyy-MM-dd')
    setEditingRegistro(registro)
    setEditHoras(String(registro.horas))
    setEditDescripcion(registro.descripcion)
    setEditFecha(fechaString)
  }

  // Guardar edición
  const guardarEdicion = async () => {
    if (!editingRegistro) return
    try {
      setEditLoading(true)
      const response = await fetch('/api/horas-hombre/registrar-simple', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRegistro.id,
          fecha: editFecha,
          horas: parseFloat(editHoras),
          descripcion: editDescripcion
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al actualizar')
      }

      toast({ title: 'Registro actualizado', description: `${editHoras}h guardadas correctamente` })
      setEditingRegistro(null)
      loadTimesheetSemanal()
      onHorasRegistradas?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el registro',
        variant: 'destructive'
      })
    } finally {
      setEditLoading(false)
    }
  }

  // Eliminar registro
  const eliminarRegistro = async () => {
    if (!editingRegistro) return
    try {
      setDeleteLoading(true)
      const response = await fetch(`/api/registro-horas?id=${editingRegistro.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar')
      }

      toast({ title: 'Registro eliminado', description: 'El registro de horas fue eliminado' })
      setEditingRegistro(null)
      loadTimesheetSemanal()
      onHorasRegistradas?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el registro',
        variant: 'destructive'
      })
    } finally {
      setDeleteLoading(false)
    }
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

  const esRegistroEditable = (registro: RegistroHoras) => {
    return registro.origen !== 'campo' && !registro.aprobado
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
          <Button variant="outline" size="sm" onClick={() => { setSemanaActual(new Date()); onSemanaChange?.(new Date()) }}>
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
                    className={`text-xs rounded px-2 py-1 truncate group relative ${registro.origen === 'campo' ? 'bg-orange-100/80 border-l-2 border-orange-400' : 'bg-white/80'} ${esRegistroEditable(registro) ? 'hover:bg-blue-50 hover:ring-1 hover:ring-blue-300' : ''}`}
                    title={`${getTextoJerarquico(registro)}: ${registro.descripcion}${registro.origen === 'campo' ? ' (Campo)' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (esRegistroEditable(registro)) {
                        abrirEdicion(registro)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate flex-1" title={getTextoJerarquico(registro)}>
                        {registro.origen === 'campo' && <span className="text-orange-600 mr-0.5">C</span>}
                        {getTextoJerarquico(registro)}
                      </span>
                      <div className="flex items-center gap-1 ml-1">
                        <span className="font-medium">{registro.horas}h</span>
                        {registro.aprobado && (
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                            ✓
                          </Badge>
                        )}
                        {esRegistroEditable(registro) && (
                          <Pencil className="h-3 w-3 text-blue-500 hidden group-hover:block" />
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
          const fechaDia = addDays(startOfWeek(semanaActual, { weekStartsOn: 1 }), index)
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
                      className={`px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${registro.origen === 'campo' ? 'border-l-3 border-orange-400 bg-orange-50/50' : ''}`}
                      onClick={() => {
                        if (esRegistroEditable(registro)) {
                          abrirEdicion(registro)
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {registro.origen === 'campo' && (
                            <span className="text-xs font-semibold text-orange-600 mr-1.5">CAMPO</span>
                          )}
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
                        {esRegistroEditable(registro) && (
                          <Pencil className="h-3.5 w-3.5 text-blue-400" />
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

      {/* Wizard de registro de horas (crear nuevo) */}
      <RegistroHorasWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onSuccess={handleRegistroExitoso}
        fechaInicial={fechaWizard}
      />

      {/* Dialog de edición/eliminación de registro */}
      <Dialog open={!!editingRegistro} onOpenChange={(open) => { if (!open) setEditingRegistro(null) }}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Editar Registro
            </DialogTitle>
          </DialogHeader>

          {editingRegistro && (
            <div className="space-y-4">
              {/* Info del registro (no editable) */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                <div><strong>Proyecto:</strong> {editingRegistro.proyectoNombre}</div>
                <div><strong>EDT:</strong> {editingRegistro.edtNombre}</div>
                {editingRegistro.actividadNombre && (
                  <div><strong>Actividad:</strong> {editingRegistro.actividadNombre}</div>
                )}
                {editingRegistro.tareaNombre && (
                  <div><strong>Tarea:</strong> {editingRegistro.tareaNombre}</div>
                )}
              </div>

              {/* Campos editables */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-fecha" className="text-sm">Fecha</Label>
                  <Input
                    id="edit-fecha"
                    type="date"
                    value={editFecha}
                    onChange={(e) => setEditFecha(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-horas" className="text-sm">Horas</Label>
                  <Input
                    id="edit-horas"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={editHoras}
                    onChange={(e) => setEditHoras(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-descripcion" className="text-sm">Descripcion del trabajo</Label>
                <Textarea
                  id="edit-descripcion"
                  value={editDescripcion}
                  onChange={(e) => setEditDescripcion(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={eliminarRegistro}
              disabled={deleteLoading || editLoading}
            >
              {deleteLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingRegistro(null)}
                disabled={editLoading || deleteLoading}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={guardarEdicion}
                disabled={editLoading || deleteLoading || !editHoras || !editDescripcion || !editFecha}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
