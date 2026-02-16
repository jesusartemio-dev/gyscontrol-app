'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, TrendingUp, ChevronLeft, ChevronRight, Plus, Send, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getISOWeek, getISOWeekYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { TimesheetSemanal } from '@/components/horas-hombre/TimesheetSemanal'
import { RegistroHorasWizard } from '@/components/horas-hombre/RegistroHorasWizard'

function getISOWeekString(date: Date): string {
  const week = getISOWeek(date)
  const year = getISOWeekYear(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export default function TimesheetPage() {
  const [semanaActual, setSemanaActual] = useState(new Date())
  const [showWizard, setShowWizard] = useState(false)
  const [resumenSemana, setResumenSemana] = useState<any>(null)
  const [proyectosTrabajados, setProyectosTrabajados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [estadoAprobacion, setEstadoAprobacion] = useState<any>(null)
  const [enviando, setEnviando] = useState(false)

  // Calcular semana actual (lunes a domingo)
  const inicioSemana = startOfWeek(semanaActual, { weekStartsOn: 1 })
  const finSemana = endOfWeek(semanaActual, { weekStartsOn: 1 })
  const semanaISO = format(semanaActual, 'yyyy-\'W\'ww')
  const semanaISOReal = getISOWeekString(semanaActual)

  // Cargar estado de aprobación
  const cargarEstadoAprobacion = useCallback(async () => {
    try {
      const res = await fetch(`/api/horas-hombre/timesheet-aprobacion/estado?semana=${semanaISOReal}`)
      if (res.ok) {
        const data = await res.json()
        setEstadoAprobacion(data)
      }
    } catch (error) {
      console.error('Error cargando estado de aprobación:', error)
    }
  }, [semanaISOReal])

  // Cargar datos de la semana
  const cargarDatosSemana = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/horas-hombre/timesheet-semanal?semana=${semanaISO}`)
      if (response.ok) {
        const data = await response.json()
        setResumenSemana(data.data.resumenSemana)
        setProyectosTrabajados(data.data.proyectosTrabajados)
      }
    } catch (error) {
      console.error('Error cargando datos de la semana:', error)
    } finally {
      setLoading(false)
    }
  }, [semanaISO])

  useEffect(() => {
    cargarDatosSemana()
    cargarEstadoAprobacion()
  }, [cargarDatosSemana, cargarEstadoAprobacion])

  // Datos por defecto mientras se cargan
  const datosDefault = {
    totalHoras: 0,
    diasTrabajados: 0,
    promedioDiario: 0,
    vsSemanaAnterior: 0
  }

  const navegarSemana = (direccion: 'anterior' | 'siguiente') => {
    if (direccion === 'anterior') {
      setSemanaActual(subWeeks(semanaActual, 1))
    } else {
      setSemanaActual(addWeeks(semanaActual, 1))
    }
  }

  const handleRegistroExitoso = () => {
    setShowWizard(false)
    cargarDatosSemana()
    cargarEstadoAprobacion()
  }

  const enviarParaAprobacion = async () => {
    try {
      setEnviando(true)
      const res = await fetch('/api/horas-hombre/timesheet-aprobacion/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semana: semanaISOReal }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Error al enviar')
        return
      }
      await cargarEstadoAprobacion()
    } catch (error) {
      console.error('Error enviando timesheet:', error)
      alert('Error al enviar la semana para aprobación')
    } finally {
      setEnviando(false)
    }
  }

  const semanaBloqueada = estadoAprobacion?.estado === 'enviado' || estadoAprobacion?.estado === 'aprobado'
  const totalHoras = (resumenSemana || datosDefault).totalHoras

  return (
    <div className="container mx-auto py-4 space-y-4">
      {/* Header compacto con navegación y stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mi Timesheet</h1>
            <p className="text-xs text-gray-500">{format(inicioSemana, 'yyyy')} - Semana {semanaISOReal.split('-W')[1]}</p>
          </div>
        </div>
        {!semanaBloqueada && (
          <Button onClick={() => setShowWizard(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Registrar
          </Button>
        )}
      </div>

      {/* Banner de estado de aprobación */}
      {estadoAprobacion && (
        <>
          {estadoAprobacion.estado === 'borrador' && totalHoras > 0 && (
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  Semana con <strong>{totalHoras}h</strong> registradas. Envía para aprobación cuando estés listo.
                </span>
              </div>
              <Button
                size="sm"
                onClick={enviarParaAprobacion}
                disabled={enviando}
              >
                <Send className="h-4 w-4 mr-1" />
                {enviando ? 'Enviando...' : 'Enviar para aprobación'}
              </Button>
            </div>
          )}

          {estadoAprobacion.estado === 'enviado' && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                <strong>Semana enviada</strong> — Pendiente de aprobación.
                {estadoAprobacion.fechaEnvio && (
                  <span className="text-yellow-600 ml-1">
                    Enviado el {format(new Date(estadoAprobacion.fechaEnvio), 'dd/MM/yyyy HH:mm')}
                  </span>
                )}
              </span>
            </div>
          )}

          {estadoAprobacion.estado === 'aprobado' && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">
                <strong>Semana aprobada</strong>
                {estadoAprobacion.aprobadoPor && (
                  <span className="text-green-600 ml-1">
                    por {estadoAprobacion.aprobadoPor}
                    {estadoAprobacion.fechaResolucion && ` el ${format(new Date(estadoAprobacion.fechaResolucion), 'dd/MM/yyyy')}`}
                  </span>
                )}
              </span>
            </div>
          )}

          {estadoAprobacion.estado === 'rechazado' && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <div className="text-sm text-red-800">
                  <strong>Semana rechazada</strong>
                  {estadoAprobacion.motivoRechazo && (
                    <span className="text-red-600 ml-1">— {estadoAprobacion.motivoRechazo}</span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
                onClick={enviarParaAprobacion}
                disabled={enviando}
              >
                <Send className="h-4 w-4 mr-1" />
                {enviando ? 'Reenviando...' : 'Reenviar'}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Navegación de semanas + Stats en una fila */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Navegador de semana */}
        <div className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1.5">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navegarSemana('anterior')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[180px]">
            <span className="font-semibold text-sm">
              {format(inicioSemana, 'dd')} - {format(finSemana, 'dd MMM', { locale: es })}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navegarSemana('siguiente')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600" onClick={() => setSemanaActual(new Date())}>
            Hoy
          </Button>
        </div>

        {/* Stats compactos en línea */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="font-bold text-blue-700">{(resumenSemana || datosDefault).totalHoras}h</span>
            <span className="text-xs text-blue-600">Total</span>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg">
            <Calendar className="h-4 w-4 text-green-600" />
            <span className="font-bold text-green-700">{(resumenSemana || datosDefault).diasTrabajados}</span>
            <span className="text-xs text-green-600">Días</span>
          </div>
          <div className="flex items-center gap-1.5 bg-purple-50 px-3 py-1.5 rounded-lg">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <span className="font-bold text-purple-700">{(resumenSemana || datosDefault).promedioDiario}h</span>
            <span className="text-xs text-purple-600">Diario</span>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${((resumenSemana || datosDefault).vsSemanaAnterior) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <TrendingUp className={`h-4 w-4 ${((resumenSemana || datosDefault).vsSemanaAnterior) >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            <span className={`font-bold ${((resumenSemana || datosDefault).vsSemanaAnterior) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {((resumenSemana || datosDefault).vsSemanaAnterior) >= 0 ? '+' : ''}{((resumenSemana || datosDefault).vsSemanaAnterior)}%
            </span>
            <span className={`text-xs ${((resumenSemana || datosDefault).vsSemanaAnterior) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Vs Semana Anterior</span>
          </div>
        </div>
      </div>

      {/* Calendario semanal */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 sm:p-4">
          <TimesheetSemanal
            semana={inicioSemana}
            onHorasRegistradas={handleRegistroExitoso}
          />
        </CardContent>
      </Card>

      {/* Proyectos donde trabajo - Compacto */}
      {proyectosTrabajados.length > 0 && (
        <div className="bg-white border rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Proyectos esta semana</h3>
          <div className="flex flex-wrap gap-2">
            {proyectosTrabajados.map((proyecto, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium text-gray-700">{proyecto.codigo || proyecto.nombre}</span>
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  {proyecto.horas}h
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wizard de registro de horas */}
      {!semanaBloqueada && (
        <RegistroHorasWizard
          open={showWizard}
          onOpenChange={setShowWizard}
          onSuccess={handleRegistroExitoso}
        />
      )}
    </div>
  )
}
