'use client'

/**
 * 🎯 ImportCronogramaModal - Modal de Importación Automática de Cronograma
 *
 * Modal inteligente que importa cronogramas de 6 niveles desde cotizaciones existentes,
 * automatizando el proceso manual de crear EDTs, actividades y tareas.
 *
 * Características principales:
 * - Mapeo automático: Categorías → EDTs, Servicios → Actividades, Ítems → Tareas
 * - Configuración opcional de zonas
 * - Cálculo automático de fechas con plantillas de respaldo
 * - Vista previa antes de importar
 * - Progreso en tiempo real durante importación
 */

import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FolderTree, Wrench, Settings, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

// Interfaces
interface ImportCronogramaModalProps {
  cotizacionId: string
  proyectoId?: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (result: ImportResult) => void
}

interface ImportConfig {
  metodo: 'categorias' // ✅ Solo categorías según especificación del manual
  crearZonas: boolean
  zonasPersonalizadas?: string[]
  fechasAutomaticas: boolean
}

interface ImportResult {
  edtsCreados: number
  actividadesCreadas: number
  tareasCreadas: number
  zonasCreadas: number
  tiempoEjecucion: number
}

type ModalStep = 'config' | 'preview' | 'importing' | 'success' | 'error'

// Componente principal
export function ImportCronogramaModal({
  cotizacionId,
  proyectoId,
  isOpen,
  onClose,
  onSuccess
}: ImportCronogramaModalProps) {
  // Estados del modal
  const [currentStep, setCurrentStep] = useState<ModalStep>('config')
  const [config, setConfig] = useState<ImportConfig>({
    metodo: 'categorias', // ✅ Solo categorías según manual
    crearZonas: false,
    fechasAutomaticas: true
  })
  const [progress, setProgress] = useState(0)
  const [currentOperation, setCurrentOperation] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset modal cuando se abre
  React.useEffect(() => {
    if (isOpen) {
      setCurrentStep('config')
      setProgress(0)
      setError(null)
      setConfig({
        metodo: 'categorias',
        crearZonas: false,
        fechasAutomaticas: true
      })
    }
  }, [isOpen])

  // Handlers
  const handleConfigChange = (newConfig: Partial<ImportConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
  }

  const handleNext = () => {
    if (currentStep === 'config') {
      setCurrentStep('preview')
    } else if (currentStep === 'preview') {
      handleImport()
    }
  }

  const handleBack = () => {
    if (currentStep === 'preview') {
      setCurrentStep('config')
    }
  }

  const handleImport = async () => {
    setCurrentStep('importing')
    setProgress(0)
    setCurrentOperation('Analizando cotización...')

    try {
      // Obtener análisis de la cotización
      const analisisResponse = await fetch(`/api/cotizaciones/${cotizacionId}/analisis-cronograma`, {
        credentials: 'include'
      })

      if (!analisisResponse.ok) {
        throw new Error('Error al analizar la cotización')
      }

      const analisisData = await analisisResponse.json()
      setProgress(30)
      setCurrentOperation('Creando estructura del cronograma comercial...')

      // Importar cronograma directamente en la cotización
      const importResponse = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/importar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          metodo: config.metodo,
          crearZonas: config.crearZonas,
          fechasAutomaticas: config.fechasAutomaticas
        })
      })

      if (!importResponse.ok) {
        const errorData = await importResponse.json()
        throw new Error(errorData.error || 'Error en la importación')
      }

      const importResult = await importResponse.json()
      setProgress(100)
      setCurrentOperation('Importación completada')

      // Resultado exitoso
      const result: ImportResult = {
        edtsCreados: importResult.data.edtsCreados,
        actividadesCreadas: importResult.data.actividadesCreadas,
        tareasCreadas: importResult.data.tareasCreadas,
        zonasCreadas: importResult.data.zonasCreadas || 0,
        tiempoEjecucion: importResult.data.tiempoEjecucion
      }

      setCurrentStep('success')
      onSuccess(result)
      // Real API calls are now above, so this simulation code is removed

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setCurrentStep('error')
    }
  }

  const handleClose = () => {
    onClose()
  }

  // Renderizado condicional según el paso
  const renderStep = () => {
    switch (currentStep) {
      case 'config':
        return <ConfigStep config={config} onConfigChange={handleConfigChange} />
      case 'preview':
        return <PreviewStep config={config} />
      case 'importing':
        return <ImportingStep progress={progress} currentOperation={currentOperation} />
      case 'success':
        return <SuccessStep onClose={handleClose} />
      case 'error':
        return <ErrorStep error={error} onRetry={handleImport} onClose={handleClose} />
      default:
        return null
    }
  }

  // Botones del footer
  const renderFooter = () => {
    if (currentStep === 'importing') return null
    if (currentStep === 'success') return null
    if (currentStep === 'error') return null

    return (
      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancelar
        </Button>
        {currentStep === 'preview' && (
          <Button variant="outline" onClick={handleBack}>
            Atrás
          </Button>
        )}
        <Button onClick={handleNext}>
          {currentStep === 'config' ? 'Siguiente' : 'Importar Cronograma'}
        </Button>
      </DialogFooter>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Importar Cronograma Comercial
          </DialogTitle>
          <DialogDescription>
            Crea automáticamente un cronograma comercial de 6 niveles dentro de tu cotización.
            Categorías → EDTs, Servicios → Actividades, Ítems → Tareas.
          </DialogDescription>
        </DialogHeader>

        {renderStep()}
        {renderFooter()}
      </DialogContent>
    </Dialog>
  )
}

// Componentes de pasos
function ConfigStep({
  config,
  onConfigChange
}: {
  config: ImportConfig
  onConfigChange: (config: Partial<ImportConfig>) => void
}) {
  return (
    <div className="space-y-6">
      {/* Método de Agrupación - Solo categorías según manual */}
      <div>
        <Label className="text-base font-semibold">Método de Agrupación</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Se crearán EDTs por categoría según la especificación del sistema
        </p>

        <Card className="border-primary bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                value="categorias"
                checked={true} // ✅ Siempre seleccionado
                readOnly
                className="h-4 w-4"
              />
              <Label className="flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                <span className="font-semibold">Por Categorías (Estándar)</span>
              </Label>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Cada categoría de servicio genera un EDT independiente con sus actividades y tareas.
            </CardDescription>
            <div className="mt-2 text-xs text-muted-foreground">
              ✅ Categoría → EDT | Servicio → Actividad | Ítem → Tarea
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuración de Zonas */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="crearZonas"
            checked={config.crearZonas}
            onCheckedChange={(checked) => onConfigChange({ crearZonas: checked as boolean })}
          />
          <Label htmlFor="crearZonas" className="text-base font-semibold">
            Crear zonas automáticamente
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Detecta y crea zonas basándose en patrones de nombres (Área Producción, Piso 1, etc.)
        </p>
      </div>

      {/* Fechas Automáticas */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="fechasAutomaticas"
            checked={config.fechasAutomaticas}
            onCheckedChange={(checked) => onConfigChange({ fechasAutomaticas: checked as boolean })}
          />
          <Label htmlFor="fechasAutomaticas" className="text-base font-semibold">
            Calcular fechas automáticamente
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Usa horas de la cotización para calcular duraciones, con plantillas como respaldo
        </p>
      </div>
    </div>
  )
}

function PreviewStep({ config }: { config: ImportConfig }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Vista Previa del Cronograma</h3>
        <p className="text-sm text-muted-foreground">
          Revisa la estructura que se creará antes de importar
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">3</div>
            <div className="text-sm text-muted-foreground">EDTs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">8</div>
            <div className="text-sm text-muted-foreground">Actividades</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">24</div>
            <div className="text-sm text-muted-foreground">Tareas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {config.crearZonas ? '5' : '0'}
            </div>
            <div className="text-sm text-muted-foreground">Zonas</div>
          </CardContent>
        </Card>
      </div>

      {/* Estructura de ejemplo - Según especificación del manual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estructura del Cronograma (6 Niveles)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono bg-gray-50 p-4 rounded">
            <div>📋 Cotización</div>
            <div>&nbsp;&nbsp;├── 📋 Fase: Planificación</div>
            <div>&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── 🔧 EDT: [Categoría] (ej: Eléctrica)</div>
            <div>&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── ⚙️ Actividad: [Servicio] (ej: Cableado Principal)</div>
            <div>&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── ✅ Tarea: [Ítem] (ej: Cable UTP Cat6)</div>
            <div>&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── ⚙️ Actividad: [Otro Servicio]</div>
            <div>&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── ✅ Tarea: [Ítem]</div>
            <div>&nbsp;&nbsp;├── 📋 Fase: Ejecución</div>
            <div>&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── 🔧 EDT: [Otra Categoría] (ej: Mecánica)</div>
            {config.crearZonas && (
              <>
                <div>&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── 📍 Zona: Piso 1</div>
                <div>&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── ⚙️ Actividades + ✅ Tareas</div>
                <div>&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── 📍 Zona: Piso 2</div>
              </>
            )}
            {!config.crearZonas && (
              <div>&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── ⚙️ Actividades + ✅ Tareas</div>
            )}
            <div>&nbsp;&nbsp;└── 📋 Fase: Cierre</div>
          </div>
        </CardContent>
      </Card>

      {/* Información adicional - Según especificación del manual */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900">Mapeo de Datos (Especificación)</h4>
            <ul className="text-sm text-blue-800 mt-1 space-y-1">
              <li>• <strong>Categoría</strong> → EDT (Nivel 3)</li>
              <li>• <strong>Servicio</strong> → Actividad (Nivel 5)</li>
              <li>• <strong>Ítem</strong> → Tarea (Nivel 6)</li>
              <li>• Zonas: {config.crearZonas ? 'Sí (automáticas)' : 'No'}</li>
              <li>• Fechas: {config.fechasAutomaticas ? 'Cálculo automático' : 'Manual posterior'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function ImportingStep({ progress, currentOperation }: { progress: number; currentOperation: string }) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Importando Cronograma</h3>
        <p className="text-sm text-muted-foreground">{currentOperation}</p>
      </div>

      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground">{progress}% completado</p>
      </div>

      <div className="text-xs text-muted-foreground">
        Este proceso puede tomar unos minutos dependiendo de la complejidad de la cotización.
      </div>
    </div>
  )
}

function SuccessStep({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <CheckCircle className="h-16 w-16 text-green-600" />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2 text-green-900">¡Cronograma Comercial Importado Exitosamente!</h3>
        <p className="text-sm text-muted-foreground">
          El cronograma comercial de 6 niveles ha sido creado automáticamente en tu cotización.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-green-700">EDTs creados:</span>
            <span className="font-medium ml-2">3</span>
          </div>
          <div>
            <span className="text-green-700">Actividades:</span>
            <span className="font-medium ml-2">8</span>
          </div>
          <div>
            <span className="text-green-700">Tareas:</span>
            <span className="font-medium ml-2">24</span>
          </div>
          <div>
            <span className="text-green-700">Tiempo:</span>
            <span className="font-medium ml-2">3.5s</span>
          </div>
        </div>
      </div>

      <Button onClick={onClose} className="w-full">
        Ver Cronograma
      </Button>
    </div>
  )
}

function ErrorStep({ error, onRetry, onClose }: { error: string | null; onRetry: () => void; onClose: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <AlertCircle className="h-16 w-16 text-red-600" />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2 text-red-900">Error en la Importación</h3>
        <p className="text-sm text-muted-foreground">
          Ocurrió un error durante la importación del cronograma.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={onRetry} className="flex-1">
          Reintentar
        </Button>
      </div>
    </div>
  )
}

export default ImportCronogramaModal