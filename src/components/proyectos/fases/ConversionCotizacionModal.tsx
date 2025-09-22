'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Target,
  Users
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ===================================================
// 📁 Archivo: ConversionCotizacionModal.tsx
// 📌 Ubicación: src/components/proyectos/fases/
// 🔧 Descripción: Modal para conversión automática cotización → proyecto
//
// 🧠 Uso: Preview y confirmación de conversión de cronogramas
// ✍️ Autor: Sistema GYS - Implementación Cronograma 4 Niveles
// 📅 Última actualización: 2025-09-21
// ===================================================

interface ConversionCotizacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotizacionId: string;
  proyectoId: string;
  onConversionComplete?: () => void;
}

interface PreviewData {
  cotizacion: {
    id: string;
    nombre: string;
    edtsComerciales: number;
    tareasComerciales: number;
  };
  proyecto: {
    id: string;
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
  };
  fasesSimuladas: Array<{
    nombre: string;
    orden: number;
    fechaInicio: string;
    fechaFin: string;
  }>;
  asignacionesSimuladas: Array<{
    edtNombre: string;
    categoria: string;
    faseAsignada: string;
    tareasCount: number;
    horasEstimadas: number;
  }>;
  resumen: {
    fasesACrear: number;
    edtsAConvertir: number;
    tareasAConvertir: number;
  };
}

export function ConversionCotizacionModal({
  open,
  onOpenChange,
  cotizacionId,
  proyectoId,
  onConversionComplete
}: ConversionCotizacionModalProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [step, setStep] = useState<'preview' | 'confirm' | 'converting'>('preview');

  // Cargar preview al abrir el modal
  useEffect(() => {
    if (open && cotizacionId) {
      loadPreview();
    }
  }, [open, cotizacionId]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/proyectos/convertir-desde-cotizacion?cotizacionId=${cotizacionId}`);
      const result = await response.json();

      if (result.success) {
        setPreview(result.data);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo cargar el preview de conversión',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar el preview',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConversion = async () => {
    try {
      setConverting(true);
      setStep('converting');

      const response = await fetch('/api/proyectos/convertir-desde-cotizacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cotizacionId,
          proyectoId
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Conversión exitosa',
          description: `Se crearon ${result.data.fasesCreadas} fases, ${result.data.edtsConvertidos} EDTs y ${result.data.tareasConvertidas} tareas`,
        });

        onConversionComplete?.();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error en conversión',
          description: result.error || 'Error desconocido',
          variant: 'destructive'
        });
        setStep('confirm');
      }
    } catch (error) {
      console.error('Error en conversión:', error);
      toast({
        title: 'Error',
        description: 'Error al realizar la conversión',
        variant: 'destructive'
      });
      setStep('confirm');
    } finally {
      setConverting(false);
    }
  };

  const resetModal = () => {
    setPreview(null);
    setStep('preview');
    setLoading(false);
    setConverting(false);
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Conversión Automática: Cotización → Proyecto
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Cargando preview...</span>
          </div>
        ) : preview ? (
          <div className="space-y-6">
            {/* Paso 1: Preview */}
            {step === 'preview' && (
              <>
                <Alert>
                  <Target className="h-4 w-4" />
                  <AlertDescription>
                    Esta herramienta convertirá automáticamente el cronograma comercial de la cotización
                    en un plan de ejecución estructurado con fases, EDTs y tareas.
                  </AlertDescription>
                </Alert>

                {/* Resumen de origen */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Datos de Origen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-medium">{preview.cotizacion.nombre}</div>
                          <div className="text-sm text-muted-foreground">Cotización</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium">{preview.proyecto.nombre}</div>
                          <div className="text-sm text-muted-foreground">Proyecto destino</div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {preview.cotizacion.edtsComerciales}
                        </div>
                        <div className="text-sm text-muted-foreground">EDTs Comerciales</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {preview.cotizacion.tareasComerciales}
                        </div>
                        <div className="text-sm text-muted-foreground">Tareas</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">
                          {preview.fasesSimuladas.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Fases a Crear</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Fases que se crearán */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Fases del Proyecto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {preview.fasesSimuladas.map((fase, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{fase.orden}</Badge>
                            <span className="font-medium">{fase.nombre}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(fase.fechaInicio).toLocaleDateString()} - {new Date(fase.fechaFin).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Asignaciones EDTs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Asignación de EDTs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {preview.asignacionesSimuladas.map((asignacion, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div className="flex-1">
                            <div className="font-medium">{asignacion.edtNombre}</div>
                            <div className="text-muted-foreground">{asignacion.categoria}</div>
                          </div>
                          <ArrowRight className="h-4 w-4 mx-2" />
                          <div className="text-right">
                            <Badge variant="secondary">{asignacion.faseAsignada}</Badge>
                            <div className="text-xs text-muted-foreground mt-1">
                              {asignacion.tareasCount} tareas • {asignacion.horasEstimadas}h
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setStep('confirm')}>
                    Continuar
                  </Button>
                </div>
              </>
            )}

            {/* Paso 2: Confirmación */}
            {step === 'confirm' && (
              <>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Advertencia:</strong> Esta acción creará fases, EDTs y tareas en el proyecto.
                    Los datos existentes no se modificarán, pero se añadirán nuevos elementos.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumen de Cambios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded">
                        <div className="text-3xl font-bold text-blue-600">
                          {preview.resumen.fasesACrear}
                        </div>
                        <div className="text-sm text-muted-foreground">Fases nuevas</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-3xl font-bold text-green-600">
                          {preview.resumen.edtsAConvertir}
                        </div>
                        <div className="text-sm text-muted-foreground">EDTs convertidos</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-3xl font-bold text-orange-600">
                          {preview.resumen.tareasAConvertir}
                        </div>
                        <div className="text-sm text-muted-foreground">Tareas creadas</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setStep('preview')}>
                    Atrás
                  </Button>
                  <Button onClick={handleConversion} disabled={converting}>
                    {converting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Convirtiendo...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirmar Conversión
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* Paso 3: Convirtiendo */}
            {step === 'converting' && (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Convirtiendo cronograma...</h3>
                <p className="text-muted-foreground">
                  Creando fases, EDTs y tareas. Este proceso puede tomar unos momentos.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error al cargar datos</h3>
            <p className="text-muted-foreground mb-4">
              No se pudieron cargar los datos de preview para la conversión.
            </p>
            <Button onClick={loadPreview}>Reintentar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}