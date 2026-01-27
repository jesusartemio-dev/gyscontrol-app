'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Package, Wrench, Receipt, Calendar, FileText, AlertCircle,
  ChevronRight, Clock, DollarSign, Eye, Download, CheckCircle,
  ArrowRight, ArrowLeft, Settings, BarChart3, Users, Plus,
  ExternalLink
} from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import Link from 'next/link'

// Mock data for demonstration
const mockCotizacion = {
  id: 'COT-2024-001',
  nombre: 'Proyecto Industrial XYZ',
  cliente: 'Empresa ABC S.A.C.',
  estado: 'borrador',
  equipos: 12,
  servicios: 8,
  gastos: 5,
  subtotal: 50000,
  igv: 9000,
  total: 59000,
  fechaCreacion: '2024-01-15',
  fechaVigencia: '2024-02-15'
}

// ============================================
// OPCIÓN 1: HUB + SUB-PÁGINAS (RECOMENDADO)
// ============================================
function Option1HubDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>Comercial</span>
            <ChevronRight className="h-4 w-4" />
            <span>Cotizaciones</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{mockCotizacion.id}</span>
          </div>
          <h1 className="text-2xl font-bold">{mockCotizacion.nombre}</h1>
          <p className="text-muted-foreground">{mockCotizacion.cliente}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Vista Previa
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Button size="sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Aprobar
          </Button>
        </div>
      </div>

      {/* Main Layout: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Navigation Cards (2 columns) */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Equipos Card */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Package className="h-8 w-8 text-blue-500" />
                <Badge variant="secondary">{mockCotizacion.equipos} items</Badge>
              </div>
              <CardTitle className="text-lg group-hover:text-blue-600">Equipos</CardTitle>
              <CardDescription>Gestionar equipos cotizados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total: $15,000</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600" />
              </div>
            </CardContent>
          </Card>

          {/* Servicios Card */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Wrench className="h-8 w-8 text-green-500" />
                <Badge variant="secondary">{mockCotizacion.servicios} items</Badge>
              </div>
              <CardTitle className="text-lg group-hover:text-green-600">Servicios</CardTitle>
              <CardDescription>Gestionar servicios cotizados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total: $25,000</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-green-600" />
              </div>
            </CardContent>
          </Card>

          {/* Gastos Card */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Receipt className="h-8 w-8 text-orange-500" />
                <Badge variant="secondary">{mockCotizacion.gastos} items</Badge>
              </div>
              <CardTitle className="text-lg group-hover:text-orange-600">Gastos</CardTitle>
              <CardDescription>Gestionar gastos adicionales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total: $10,000</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-orange-600" />
              </div>
            </CardContent>
          </Card>

          {/* Cronograma Card */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Calendar className="h-8 w-8 text-purple-500" />
                <Badge variant="outline">5 fases</Badge>
              </div>
              <CardTitle className="text-lg group-hover:text-purple-600">Cronograma</CardTitle>
              <CardDescription>EDT, Gantt y dependencias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">142 días</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-600" />
              </div>
            </CardContent>
          </Card>

          {/* Condiciones Card */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <FileText className="h-8 w-8 text-cyan-500" />
                <Badge variant="outline">8 items</Badge>
              </div>
              <CardTitle className="text-lg group-hover:text-cyan-600">Condiciones</CardTitle>
              <CardDescription>Términos y condiciones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ver detalles</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-cyan-600" />
              </div>
            </CardContent>
          </Card>

          {/* Exclusiones Card */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <Badge variant="outline">3 items</Badge>
              </div>
              <CardTitle className="text-lg group-hover:text-red-600">Exclusiones</CardTitle>
              <CardDescription>Alcances no incluidos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ver detalles</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Sticky Sidebar */}
        <div className="space-y-4">
          {/* Financial Summary */}
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Resumen Financiero
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Equipos</span>
                <span>$15,000.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Servicios</span>
                <span>$25,000.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gastos</span>
                <span>$10,000.00</span>
              </div>
              <hr />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>$50,000.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IGV (18%)</span>
                <span>$9,000.00</span>
              </div>
              <hr />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-green-600">$59,000.00</span>
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado actual</span>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Borrador
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vigencia</span>
                <span className="text-sm">30 días</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Creación</span>
                <span className="text-sm">15/01/2024</span>
              </div>
              <hr />
              <div className="space-y-2">
                <Button className="w-full" size="sm">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprobar Cotización
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  Crear Proyecto
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ============================================
// OPCIÓN 2: TABS CON URL SYNC
// ============================================
function Option2TabsWithURL() {
  const [activeTab, setActiveTab] = useState('equipos')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>Comercial</span>
            <ChevronRight className="h-4 w-4" />
            <span>Cotizaciones</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{mockCotizacion.id}</span>
          </div>
          <h1 className="text-2xl font-bold">{mockCotizacion.nombre}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button size="sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Aprobar
          </Button>
        </div>
      </div>

      {/* Main Layout with Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content with Tabs */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              {/* Sticky Tabs Navigation */}
              <div className="sticky top-0 z-10 bg-white border-b">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full justify-start rounded-none h-12 px-4">
                    <TabsTrigger value="equipos" className="gap-2">
                      <Package className="h-4 w-4" />
                      Equipos
                      <Badge variant="secondary" className="ml-1">{mockCotizacion.equipos}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="servicios" className="gap-2">
                      <Wrench className="h-4 w-4" />
                      Servicios
                      <Badge variant="secondary" className="ml-1">{mockCotizacion.servicios}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="gastos" className="gap-2">
                      <Receipt className="h-4 w-4" />
                      Gastos
                      <Badge variant="secondary" className="ml-1">{mockCotizacion.gastos}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="cronograma" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      Cronograma
                    </TabsTrigger>
                    <TabsTrigger value="condiciones" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Condiciones
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab Content */}
                  <div className="p-4">
                    <TabsContent value="equipos" className="m-0">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold">Lista de Equipos</h3>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Equipo
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground border-2 border-dashed rounded-lg p-8 text-center">
                          [Contenido de equipos - Accordions, tablas, etc.]
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="servicios" className="m-0">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold">Lista de Servicios</h3>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Servicio
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground border-2 border-dashed rounded-lg p-8 text-center">
                          [Contenido de servicios - Accordions, tablas, etc.]
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="gastos" className="m-0">
                      <div className="text-sm text-muted-foreground border-2 border-dashed rounded-lg p-8 text-center">
                        [Contenido de gastos]
                      </div>
                    </TabsContent>
                    <TabsContent value="cronograma" className="m-0">
                      <div className="text-sm text-muted-foreground border-2 border-dashed rounded-lg p-8 text-center">
                        [Gantt Chart, EDT, etc.]
                      </div>
                    </TabsContent>
                    <TabsContent value="condiciones" className="m-0">
                      <div className="text-sm text-muted-foreground border-2 border-dashed rounded-lg p-8 text-center">
                        [Condiciones y exclusiones]
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* URL Indicator */}
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
            <span>URL actual:</span>
            <code className="bg-muted px-2 py-1 rounded">
              /comercial/cotizaciones/{mockCotizacion.id}?tab={activeTab}
            </code>
            <span className="text-green-600">✓ Compartible</span>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-green-600">$59,000.00</span>
              </div>
              <hr />
              <Badge variant="outline" className="w-full justify-center bg-yellow-50 text-yellow-700">
                Borrador
              </Badge>
              <Button className="w-full" size="sm">Aprobar</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ============================================
// OPCIÓN 3: WIZARD + DASHBOARD
// ============================================
function Option3WizardDashboard() {
  const [wizardStep, setWizardStep] = useState(1)
  const [mode, setMode] = useState<'wizard' | 'dashboard'>('wizard')

  const steps = [
    { id: 1, name: 'Datos Básicos', icon: Settings },
    { id: 2, name: 'Equipos', icon: Package },
    { id: 3, name: 'Servicios', icon: Wrench },
    { id: 4, name: 'Gastos', icon: Receipt },
    { id: 5, name: 'Cronograma', icon: Calendar },
    { id: 6, name: 'Revisión', icon: Eye },
  ]

  if (mode === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{mockCotizacion.nombre}</h1>
            <p className="text-muted-foreground">Modo Edición - Dashboard</p>
          </div>
          <Button variant="outline" onClick={() => setMode('wizard')}>
            Ver modo Wizard
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {steps.slice(0, -1).map((step) => (
            <Card key={step.id} className="hover:shadow-md cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <step.icon className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium">{step.name}</p>
                  <p className="text-xs text-muted-foreground">Editar sección</p>
                </div>
                <ChevronRight className="h-4 w-4 ml-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setMode('dashboard')}>
          Ver modo Dashboard
        </Button>
      </div>

      {/* Wizard Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">Nueva Cotización</h1>
        <p className="text-muted-foreground">Sigue los pasos para crear tu cotización</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 cursor-pointer transition-colors ${
                  wizardStep === step.id
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : wizardStep > step.id
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-300 text-gray-400'
                }`}
                onClick={() => setWizardStep(step.id)}
              >
                {wizardStep > step.id ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 h-1 mx-1 ${
                    wizardStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Name */}
      <div className="text-center">
        <Badge variant="outline" className="px-4 py-1">
          Paso {wizardStep} de {steps.length}: {steps[wizardStep - 1].name}
        </Badge>
      </div>

      {/* Step Content */}
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
            {(() => {
              const StepIcon = steps[wizardStep - 1].icon
              return <StepIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            })()}
            <p>Contenido del paso: <strong>{steps[wizardStep - 1].name}</strong></p>
            <p className="text-sm mt-2">Formularios, listas, selectores, etc.</p>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between max-w-2xl mx-auto">
        <Button
          variant="outline"
          onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
          disabled={wizardStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        {wizardStep === steps.length ? (
          <Button className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Finalizar Cotización
          </Button>
        ) : (
          <Button onClick={() => setWizardStep(Math.min(steps.length, wizardStep + 1))}>
            Siguiente
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================
// MAIN PAGE: Comparison View
// ============================================
export default function CotizacionLayoutsDemo() {
  const [selectedOption, setSelectedOption] = useState('option1')

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Comparación de Layouts - Cotizaciones</h1>
        <p className="text-muted-foreground">
          Selecciona una opción para ver cómo se vería la página de detalle de cotización
        </p>
      </div>

      {/* Option Selector */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border p-1 bg-muted/50">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedOption === 'option1'
                ? 'bg-white shadow text-blue-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setSelectedOption('option1')}
          >
            Opción 1: Hub + Sub-páginas
            <Badge className="ml-2 bg-green-100 text-green-700">Recomendado</Badge>
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedOption === 'option2'
                ? 'bg-white shadow text-blue-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setSelectedOption('option2')}
          >
            Opción 2: Tabs con URL Sync
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedOption === 'option3'
                ? 'bg-white shadow text-blue-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setSelectedOption('option3')}
          >
            Opción 3: Wizard + Dashboard
          </button>
        </div>
      </div>

      {/* Option Description */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-4">
          {selectedOption === 'option1' && (
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-700">Hub + Sub-páginas (Recomendado)</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Dashboard central con cards que navegan a páginas dedicadas. Similar a la estructura actual de Proyectos.
                  Cada sección tiene su propia URL, lazy loading, y código separado.
                </p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-green-600">✓ URLs compartibles</span>
                  <span className="text-green-600">✓ Carga rápida</span>
                  <span className="text-green-600">✓ Código mantenible</span>
                  <span className="text-green-600">✓ Back/Forward nativo</span>
                </div>
              </div>
            </div>
          )}
          {selectedOption === 'option2' && (
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-700">Tabs con URL Sync</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Mantiene la estructura de tabs pero sincroniza con la URL usando query params.
                  Permite compartir enlaces directos a cada tab y usar back/forward del navegador.
                </p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-green-600">✓ URLs compartibles</span>
                  <span className="text-green-600">✓ Cambio rápido de tabs</span>
                  <span className="text-yellow-600">~ Más estado en memoria</span>
                  <span className="text-yellow-600">~ Carga inicial más pesada</span>
                </div>
              </div>
            </div>
          )}
          {selectedOption === 'option3' && (
            <div className="flex items-start gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-700">Wizard para Creación + Dashboard para Edición</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Flujo guiado paso a paso para crear nuevas cotizaciones. Una vez creada,
                  cambia a modo dashboard para edición libre de secciones.
                </p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-green-600">✓ Ideal para nuevos usuarios</span>
                  <span className="text-green-600">✓ Flujo claro de creación</span>
                  <span className="text-yellow-600">~ Dos modos diferentes</span>
                  <span className="text-yellow-600">~ Más código a mantener</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demo Area */}
      <Card className="border-2 border-dashed">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-sm font-normal flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Vista Previa: {
              selectedOption === 'option1' ? 'Hub + Sub-páginas' :
              selectedOption === 'option2' ? 'Tabs con URL Sync' :
              'Wizard + Dashboard'
            }
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 bg-gray-50/50">
          {selectedOption === 'option1' && <Option1HubDashboard />}
          {selectedOption === 'option2' && <Option2TabsWithURL />}
          {selectedOption === 'option3' && <Option3WizardDashboard />}
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Comparación Rápida</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Criterio</th>
                <th className="text-center py-2">Opción 1</th>
                <th className="text-center py-2">Opción 2</th>
                <th className="text-center py-2">Opción 3</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Carga inicial</td>
                <td className="text-center">🟢 Rápida</td>
                <td className="text-center">🟡 Media</td>
                <td className="text-center">🟢 Rápida</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">URLs compartibles</td>
                <td className="text-center">🟢 Sí</td>
                <td className="text-center">🟢 Sí</td>
                <td className="text-center">🟡 Parcial</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Cambio entre secciones</td>
                <td className="text-center">🟡 Nueva página</td>
                <td className="text-center">🟢 Instantáneo</td>
                <td className="text-center">🟡 Mixto</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Mantenibilidad</td>
                <td className="text-center">🟢 Alta</td>
                <td className="text-center">🟡 Media</td>
                <td className="text-center">🟡 Media</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Experiencia móvil</td>
                <td className="text-center">🟢 Buena</td>
                <td className="text-center">🟡 Regular</td>
                <td className="text-center">🟢 Buena</td>
              </tr>
              <tr>
                <td className="py-2">Flujo de creación</td>
                <td className="text-center">🟡 Libre</td>
                <td className="text-center">🟡 Libre</td>
                <td className="text-center">🟢 Guiado</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
