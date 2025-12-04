'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RegistroHorasWizard } from '@/components/horas-hombre/RegistroHorasWizard'
import { Clock, Building, List, Target, CheckSquare, History } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function RegistroHorasPage() {
  const [showForm, setShowForm] = useState(true)
  const router = useRouter()

  const handleRegistroExitoso = () => {
    // Mostrar mensaje de éxito y opción de registrar más
    setShowForm(false)
    setTimeout(() => setShowForm(true), 2000)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registro de Horas</h1>
          <p className="text-gray-600 mt-1">
            Registra horas trabajadas en cualquier elemento del cronograma
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/horas-hombre/timesheet')}>
            <History className="h-4 w-4 mr-2" />
            Ver Timesheet
          </Button>
          <Button variant="outline" onClick={() => router.push('/horas-hombre/historial')}>
            <History className="h-4 w-4 mr-2" />
            Ver Historial
          </Button>
        </div>
      </div>

      {/* Información del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-lg font-semibold">Flujo Estructurado</p>
                <p className="text-sm text-gray-600">
                  Selección jerárquica: Proyecto → EDT → Elemento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <List className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-lg font-semibold">5 Pasos Guiados</p>
                <p className="text-sm text-gray-600">
                  Navegación paso a paso con validaciones
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-lg font-semibold">Registro Garantizado</p>
                <p className="text-sm text-gray-600">
                  Siempre bajo estructura EDT válida
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wizard de registro de horas */}
      {showForm ? (
        <RegistroHorasWizard
          onSuccess={handleRegistroExitoso}
        />
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ¡Horas registradas exitosamente!
            </h3>
            <p className="text-gray-600 mb-6">
              Las horas se han registrado bajo la estructura jerárquica EDT y el progreso se ha actualizado automáticamente.
            </p>
            <Button onClick={() => setShowForm(true)}>
              Registrar Más Horas
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instrucciones del flujo estructurado */}
      <Card>
        <CardHeader>
          <CardTitle>Flujo de Registro Estructurado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">1. Seleccionar Proyecto</h4>
              <p className="text-sm text-gray-600">
                Elige el proyecto donde registras las horas. Solo verás proyectos
                donde tienes permisos de trabajo.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">2. Seleccionar EDT</h4>
              <p className="text-sm text-gray-600">
                Selecciona la Estructura de Descomposición del Trabajo (EDT)
                que corresponde a tu actividad.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">3. Elegir Nivel</h4>
              <p className="text-sm text-gray-600">
                Decide si registras a nivel de Actividad o Tarea específica
                dentro del EDT seleccionado.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">4. Completar Registro</h4>
              <p className="text-sm text-gray-600">
                Ingresa fecha, horas trabajadas y descripción del trabajo.
                Confirma para registrar bajo la estructura jerárquica.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}