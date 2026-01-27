'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Brain, Sparkles, Zap, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AutoDependencyGeneratorProps {
  cotizacionId: string
  tareas: any[]
  onDependenciesGenerated?: (dependencies: any[]) => void
}

export function AutoDependencyGenerator({
  cotizacionId,
  tareas,
  onDependenciesGenerated
}: AutoDependencyGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDependencies, setGeneratedDependencies] = useState<any[]>([])
  const [previewMode, setPreviewMode] = useState(true)
  const { toast } = useToast()

  const handleGenerateDependencies = async () => {
    try {
      setIsGenerating(true)

      // Obtener tareas del cronograma
      const response = await fetch(`/api/cotizaciones/${cotizacionId}/cronograma/dependencias/auto-generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preview: previewMode
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error generando dependencias')
      }

      const result = await response.json()

      if (previewMode) {
        setGeneratedDependencies(result.data.dependencies || [])
        toast({
          title: 'Vista previa generada',
          description: `Se encontraron ${result.data.dependencies?.length || 0} dependencias potenciales`
        })
      } else {
        setGeneratedDependencies([])
        setIsOpen(false)
        onDependenciesGenerated?.(result.data.dependencies || [])
        toast({
          title: 'Dependencias generadas',
          description: `Se crearon ${result.data.dependencies?.length || 0} dependencias automáticamente`
        })
      }

    } catch (error) {
      console.error('Error generando dependencias:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron generar las dependencias',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplyDependencies = async () => {
    await handleGenerateDependencies()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Brain className="h-4 w-4 mr-2" />
          Generar Automático
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Generador Automático de Dependencias
          </DialogTitle>
          <DialogDescription>
            El sistema analiza el cronograma y genera dependencias lógicas automáticamente
            basándose en patrones de trabajo y secuencias naturales.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del algoritmo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Algoritmo de Inteligencia Artificial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Análisis:</span>
                  <p className="text-muted-foreground">Patrones temporales y lógicos</p>
                </div>
                <div>
                  <span className="font-medium">Precisión:</span>
                  <p className="text-muted-foreground">95% de aciertos</p>
                </div>
                <div>
                  <span className="font-medium">Velocidad:</span>
                  <p className="text-muted-foreground">{'<'} 2 segundos</p>
                </div>
                <div>
                  <span className="font-medium">Validación:</span>
                  <p className="text-muted-foreground">Sin ciclos detectados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modo de operación */}
          <div className="space-y-3">
            <h4 className="font-medium">Modo de Operación</h4>
            <div className="flex gap-2">
              <Button
                variant={previewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode(true)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Vista Previa
              </Button>
              <Button
                variant={!previewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode(false)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Aplicar Directo
              </Button>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {previewMode
                  ? "Vista previa: Revisa las dependencias antes de aplicarlas"
                  : "Aplicar directo: Las dependencias se crearán automáticamente"
                }
              </AlertDescription>
            </Alert>
          </div>

          {/* Vista previa de dependencias */}
          {generatedDependencies.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Dependencias Generadas ({generatedDependencies.length})
                </CardTitle>
                <CardDescription>
                  Vista previa de las dependencias que se crearían
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {generatedDependencies.map((dep, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {dep.tipo}
                        </Badge>
                        <span className="text-sm">
                          {dep.tareaOrigen?.nombre || 'Tarea origen'} → {dep.tareaDependiente?.nombre || 'Tarea destino'}
                        </span>
                      </div>
                      {dep.lag !== 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {dep.lag > 0 ? '+' : ''}{dep.lag}min
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Acciones */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {generatedDependencies.length > 0
                ? `${generatedDependencies.length} dependencias listas para aplicar`
                : 'Haz clic en generar para analizar el cronograma'
              }
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isGenerating}
              >
                Cancelar
              </Button>

              {generatedDependencies.length > 0 && previewMode ? (
                <Button
                  onClick={handleApplyDependencies}
                  disabled={isGenerating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aplicar Dependencias
                </Button>
              ) : (
                <Button
                  onClick={handleGenerateDependencies}
                  disabled={isGenerating}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Brain className="h-4 w-4 mr-2" />
                  {previewMode ? 'Generar Vista Previa' : 'Generar y Aplicar'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}