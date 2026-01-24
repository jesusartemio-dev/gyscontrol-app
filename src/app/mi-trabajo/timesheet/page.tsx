'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, TrendingUp, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import { TimesheetSemanal } from '@/components/horas-hombre/TimesheetSemanal'
import { RegistroHorasWizard } from '@/components/horas-hombre/RegistroHorasWizard'

export default function TimesheetPage() {
  const [semanaActual, setSemanaActual] = useState(new Date())
  const [showWizard, setShowWizard] = useState(false)
  const [resumenSemana, setResumenSemana] = useState<any>(null)
  const [proyectosTrabajados, setProyectosTrabajados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Calcular semana actual (lunes a domingo)
  const inicioSemana = startOfWeek(semanaActual, { weekStartsOn: 1 })
  const finSemana = endOfWeek(semanaActual, { weekStartsOn: 1 })
  const semanaISO = format(semanaActual, 'yyyy-\'W\'ww')

  // Cargar datos de la semana
  useEffect(() => {
    const cargarDatosSemana = async () => {
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
    }

    cargarDatosSemana()
  }, [semanaISO])

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
    // Recargar datos del timesheet
    const cargarDatosSemana = async () => {
      try {
        const response = await fetch(`/api/horas-hombre/timesheet-semanal?semana=${semanaISO}`)
        if (response.ok) {
          const data = await response.json()
          setResumenSemana(data.data.resumenSemana)
          setProyectosTrabajados(data.data.proyectosTrabajados)
        }
      } catch (error) {
        console.error('Error recargando datos:', error)
      }
    }
    cargarDatosSemana()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mi Timesheet</h1>
          <p className="text-gray-600 mt-1">
            Registra y visualiza tus horas trabajadas semanalmente
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Horas
        </Button>
      </div>

      {/* Navegacion de semanas */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navegarSemana('anterior')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-center">
              <h2 className="text-xl font-semibold">
                Semana {format(inicioSemana, 'dd')} - {format(finSemana, 'dd \'de\' MMMM', { locale: es })}
              </h2>
              <p className="text-sm text-gray-600">
                {format(inicioSemana, 'yyyy')} - Semana {semanaISO.split('-W')[1]}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navegarSemana('siguiente')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de la semana */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{(resumenSemana || datosDefault).totalHoras}h</p>
                <p className="text-sm text-gray-600">Total Horas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{(resumenSemana || datosDefault).diasTrabajados}</p>
                <p className="text-sm text-gray-600">Dias Trabajados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{(resumenSemana || datosDefault).promedioDiario}h</p>
                <p className="text-sm text-gray-600">Promedio Diario</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className={`h-8 w-8 ${((resumenSemana || datosDefault).vsSemanaAnterior) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <div>
                <p className={`text-2xl font-bold ${((resumenSemana || datosDefault).vsSemanaAnterior) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {((resumenSemana || datosDefault).vsSemanaAnterior) >= 0 ? '+' : ''}{((resumenSemana || datosDefault).vsSemanaAnterior)}%
                </p>
                <p className="text-sm text-gray-600">Vs Semana Anterior</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendario semanal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendario Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimesheetSemanal
            semana={inicioSemana}
            onHorasRegistradas={handleRegistroExitoso}
          />
        </CardContent>
      </Card>

      {/* Proyectos donde trabajo */}
      <Card>
        <CardHeader>
          <CardTitle>Proyectos donde trabaje</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando proyectos...</p>
            </div>
          ) : proyectosTrabajados.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay registros de horas para esta semana</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proyectosTrabajados.map((proyecto, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{proyecto.nombre}</p>
                    <p className="text-sm text-gray-600">{proyecto.cliente || 'Proyecto activo'}</p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {proyecto.horas}h
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wizard de registro de horas */}
      <RegistroHorasWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onSuccess={handleRegistroExitoso}
      />
    </div>
  )
}
