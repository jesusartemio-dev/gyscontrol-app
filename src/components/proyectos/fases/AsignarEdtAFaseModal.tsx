'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Target,
  Shuffle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ===================================================
// 📁 Archivo: AsignarEdtAFaseModal.tsx
// 📌 Ubicación: src/components/proyectos/fases/
// 🔧 Descripción: Modal para asignación masiva de EDTs a fases
//
// 🧠 Uso: Reorganizar EDTs existentes en fases del proyecto
// ✍️ Autor: Sistema GYS - Implementación Cronograma 4 Niveles
// 📅 Última actualización: 2025-09-21
// ===================================================

interface AsignarEdtAFaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proyectoId: string;
  fases: Array<{
    id: string;
    nombre: string;
    orden: number;
    fechaInicioPlan?: string;
    fechaFinPlan?: string;
  }>;
  edts: Array<{
    id: string;
    nombre: string;
    categoriaServicio?: { nombre: string };
    proyectoFaseId?: string;
    estado: string;
  }>;
  onAsignacionComplete?: () => void;
}

interface AsignacionData {
  edtId: string;
  faseId: string | null;
  edtNombre: string;
  faseNombre: string;
}

export function AsignarEdtAFaseModal({
  open,
  onOpenChange,
  proyectoId,
  fases,
  edts,
  onAsignacionComplete
}: AsignarEdtAFaseModalProps) {
  const [asignaciones, setAsignaciones] = useState<AsignacionData[]>([]);
  const [selectedEdts, setSelectedEdts] = useState<Set<string>>(new Set());
  const [targetFase, setTargetFase] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(true);

  // Inicializar asignaciones
  useEffect(() => {
    if (open && edts.length > 0) {
      const initialAsignaciones = edts.map(edt => {
        const faseAsignada = fases.find(f => f.id === edt.proyectoFaseId);
        return {
          edtId: edt.id,
          faseId: edt.proyectoFaseId || null,
          edtNombre: edt.nombre,
          faseNombre: faseAsignada?.nombre || 'Sin asignar'
        };
      });
      setAsignaciones(initialAsignaciones);
    }
  }, [open, edts, fases]);

  // EDTs sin asignar
  const edtsSinAsignar = asignaciones.filter(a => !a.faseId);

  // EDTs por fase
  const edtsPorFase = fases.map(fase => ({
    fase,
    edts: asignaciones.filter(a => a.faseId === fase.id)
  }));

  // Manejar selección de EDTs
  const toggleEdtSelection = (edtId: string) => {
    const newSelected = new Set(selectedEdts);
    if (newSelected.has(edtId)) {
      newSelected.delete(edtId);
    } else {
      newSelected.add(edtId);
    }
    setSelectedEdts(newSelected);
  };

  // Asignar EDTs seleccionados a una fase
  const asignarSeleccionados = () => {
    if (!targetFase || selectedEdts.size === 0) return;

    const targetFaseData = fases.find(f => f.id === targetFase);
    if (!targetFaseData) return;

    setAsignaciones(prev =>
      prev.map(asignacion =>
        selectedEdts.has(asignacion.edtId)
          ? {
              ...asignacion,
              faseId: targetFase,
              faseNombre: targetFaseData.nombre
            }
          : asignacion
      )
    );

    setSelectedEdts(new Set());
    setTargetFase('');
  };

  // Cambiar asignación individual
  const cambiarAsignacionIndividual = (edtId: string, nuevaFaseId: string) => {
    const nuevaFase = fases.find(f => f.id === nuevaFaseId);
    if (!nuevaFase) return;

    setAsignaciones(prev =>
      prev.map(asignacion =>
        asignacion.edtId === edtId
          ? {
              ...asignacion,
              faseId: nuevaFaseId,
              faseNombre: nuevaFase.nombre
            }
          : asignacion
      )
    );
  };

  // Auto-asignar EDTs sin asignar
  const autoAsignar = () => {
    const edtsSinAsignarLocal = asignaciones.filter(a => !a.faseId);

    // Algoritmo simple de auto-asignación basado en categorías
    const nuevasAsignaciones = asignaciones.map(asignacion => {
      if (asignacion.faseId) return asignacion; // Ya asignado

      // Buscar EDT en la lista sin asignar
      const edtSinAsignar = edtsSinAsignarLocal.find(e => e.edtId === asignacion.edtId);
      if (!edtSinAsignar) return asignacion;

      // Lógica de auto-asignación
      let faseRecomendada = fases[0]; // Default: primera fase

      const edtOriginal = edts.find(e => e.id === asignacion.edtId);
      const categoria = edtOriginal?.categoriaServicio?.nombre?.toLowerCase() || '';

      if (categoria.includes('levantamiento') || categoria.includes('diseño') || categoria.includes('planificación')) {
        faseRecomendada = fases.find(f => f.nombre.toLowerCase().includes('planificación')) || fases[0];
      } else if (categoria.includes('instalación') || categoria.includes('montaje') || categoria.includes('construcción')) {
        faseRecomendada = fases.find(f => f.nombre.toLowerCase().includes('ejecución')) || fases[1] || fases[0];
      } else if (categoria.includes('prueba') || categoria.includes('puesta en marcha') || categoria.includes('cierre')) {
        faseRecomendada = fases.find(f => f.nombre.toLowerCase().includes('cierre')) || fases[fases.length - 1];
      }

      return {
        ...asignacion,
        faseId: faseRecomendada.id,
        faseNombre: faseRecomendada.nombre
      };
    });

    setAsignaciones(nuevasAsignaciones);
  };

  // Guardar asignaciones
  const guardarAsignaciones = async () => {
    try {
      setSaving(true);

      // Agrupar cambios por EDT
      const cambios = asignaciones.filter(asignacion => {
        const edtOriginal = edts.find(e => e.id === asignacion.edtId);
        return edtOriginal?.proyectoFaseId !== asignacion.faseId;
      });

      if (cambios.length === 0) {
        toast({
          title: 'Sin cambios',
          description: 'No hay cambios para guardar',
        });
        return;
      }

      // Ejecutar cambios en lote
      const promises = cambios.map(async (cambio) => {
        const response = await fetch(`/api/proyecto-edt/${cambio.edtId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            proyectoFaseId: cambio.faseId
          }),
        });

        if (!response.ok) {
          throw new Error(`Error al actualizar EDT ${cambio.edtNombre}`);
        }

        return response.json();
      });

      await Promise.all(promises);

      toast({
        title: 'Asignaciones guardadas',
        description: `Se actualizaron ${cambios.length} EDTs`,
      });

      onAsignacionComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error guardando asignaciones:', error);
      toast({
        title: 'Error',
        description: 'Error al guardar las asignaciones',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const cambiosPendientes = asignaciones.filter(asignacion => {
    const edtOriginal = edts.find(e => e.id === asignacion.edtId);
    return edtOriginal?.proyectoFaseId !== asignacion.faseId;
  }).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5" />
            Asignar EDTs a Fases
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Modo Preview/Edición */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={previewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode(true)}
              >
                Vista Previa
              </Button>
              <Button
                variant={!previewMode ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode(false)}
              >
                Editar Asignaciones
              </Button>
            </div>

            {cambiosPendientes > 0 && (
              <Badge variant="secondary">
                {cambiosPendientes} cambios pendientes
              </Badge>
            )}
          </div>

          {/* Herramientas de asignación masiva */}
          {!previewMode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Asignación Masiva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Select value={targetFase} onValueChange={setTargetFase}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar fase destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {fases.map(fase => (
                          <SelectItem key={fase.id} value={fase.id}>
                            {fase.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={asignarSeleccionados}
                    disabled={!targetFase || selectedEdts.size === 0}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Asignar {selectedEdts.size} EDTs
                  </Button>
                  <Button variant="outline" onClick={autoAsignar}>
                    <Target className="h-4 w-4 mr-2" />
                    Auto-asignar
                  </Button>
                </div>

                {edtsSinAsignar.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Hay {edtsSinAsignar.length} EDTs sin asignar a fases.
                      Use la asignación masiva o auto-asignación para organizarlos.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Lista de EDTs sin asignar */}
          {edtsSinAsignar.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-orange-600">
                  EDTs Sin Asignar ({edtsSinAsignar.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {edtsSinAsignar.map(asignacion => {
                    const edt = edts.find(e => e.id === asignacion.edtId);
                    return (
                      <div key={asignacion.edtId} className="flex items-center gap-2 p-2 border rounded">
                        {!previewMode && (
                          <Checkbox
                            checked={selectedEdts.has(asignacion.edtId)}
                            onCheckedChange={() => toggleEdtSelection(asignacion.edtId)}
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{asignacion.edtNombre}</div>
                          <div className="text-sm text-muted-foreground">
                            {edt?.categoriaServicio?.nombre || 'Sin categoría'}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-orange-600">
                          Sin asignar
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* EDTs por fase */}
          <div className="space-y-4">
            {edtsPorFase.map(({ fase, edts: edtsFase }) => (
              <Card key={fase.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{fase.nombre}</span>
                    <Badge variant="secondary">{edtsFase.length} EDTs</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {edtsFase.length > 0 ? (
                    <div className="space-y-2">
                      {edtsFase.map(asignacion => {
                        const edt = edts.find(e => e.id === asignacion.edtId);
                        return (
                          <div key={asignacion.edtId} className="flex items-center gap-2 p-2 border rounded">
                            {!previewMode && (
                              <Checkbox
                                checked={selectedEdts.has(asignacion.edtId)}
                                onCheckedChange={() => toggleEdtSelection(asignacion.edtId)}
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{asignacion.edtNombre}</div>
                              <div className="text-sm text-muted-foreground">
                                {edt?.categoriaServicio?.nombre || 'Sin categoría'}
                              </div>
                            </div>
                            {!previewMode && (
                              <Select
                                value={asignacion.faseId || ''}
                                onValueChange={(nuevaFaseId) => cambiarAsignacionIndividual(asignacion.edtId, nuevaFaseId)}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {fases.map(f => (
                                    <SelectItem key={f.id} value={f.id}>
                                      {f.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No hay EDTs asignados a esta fase
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={guardarAsignaciones}
              disabled={saving || cambiosPendientes === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Guardar Cambios ({cambiosPendientes})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}