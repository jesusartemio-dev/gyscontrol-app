'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Upload,
  FileWarning,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecursoImportado } from '@/lib/utils/recursoImportUtils'

interface RecursoImportPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  datos: {
    validos: RecursoImportado[]
    nuevos: number
    actualizaciones: number
    errores: string[]
  }
  isLoading?: boolean
}

export function RecursoImportPreviewModal({
  open,
  onOpenChange,
  onConfirm,
  datos,
  isLoading = false
}: RecursoImportPreviewModalProps) {
  const { validos, nuevos, actualizaciones, errores } = datos

  const hayValidos = validos.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Vista Previa de Importación de Recursos
          </DialogTitle>
          <DialogDescription>
            Revisa los datos antes de importar. Puedes cancelar y modificar el Excel si es necesario.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen */}
        <div className="grid grid-cols-4 gap-3 py-3">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-lg font-bold text-blue-700">{validos.length}</p>
              <p className="text-xs text-blue-600">Válidos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-lg font-bold text-green-700">{nuevos}</p>
              <p className="text-xs text-green-600">Nuevos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
            <RefreshCw className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-lg font-bold text-amber-700">{actualizaciones}</p>
              <p className="text-xs text-amber-600">Actualizaciones</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-lg font-bold text-red-700">{errores.length}</p>
              <p className="text-xs text-red-600">Con Errores</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {/* Recursos Válidos */}
          {validos.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Recursos a Procesar ({validos.length})
              </h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs py-2">Nombre</TableHead>
                      <TableHead className="text-xs py-2">Tipo</TableHead>
                      <TableHead className="text-xs py-2">Origen</TableHead>
                      <TableHead className="text-xs py-2 text-right">Costo/Hora</TableHead>
                      <TableHead className="text-xs py-2 text-right">Costo Proy.</TableHead>
                      <TableHead className="text-xs py-2">Descripción</TableHead>
                      <TableHead className="text-xs py-2 text-center">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validos.slice(0, 10).map((rec, idx) => {
                      // Determinar si es nuevo o actualización basándose en la posición
                      const esNuevo = idx < nuevos
                      return (
                        <TableRow key={`${rec.nombre}-${idx}`} className="text-xs">
                          <TableCell className="py-1.5 font-medium">{rec.nombre}</TableCell>
                          <TableCell className="py-1.5">
                            <Badge variant="outline" className="text-[10px]">
                              {rec.tipo === 'cuadrilla' ? 'Cuadrilla' : 'Individual'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                rec.origen === 'externo'
                                  ? "border-orange-200 bg-orange-50 text-orange-700"
                                  : "border-sky-200 bg-sky-50 text-sky-700"
                              )}
                            >
                              {rec.origen === 'externo' ? 'Externo' : 'GYS'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5 text-right font-mono">
                            $ {rec.costoHora.toFixed(2)}
                          </TableCell>
                          <TableCell className="py-1.5 text-right font-mono">
                            {rec.costoHoraProyecto != null ? `$ ${rec.costoHoraProyecto.toFixed(2)}` : '–'}
                          </TableCell>
                          <TableCell className="py-1.5 truncate max-w-[150px]">
                            {rec.descripcion || '-'}
                          </TableCell>
                          <TableCell className="py-1.5 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                esNuevo
                                  ? "border-green-200 bg-green-50 text-green-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              )}
                            >
                              {esNuevo ? 'Crear' : 'Actualizar'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                {validos.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-2 bg-gray-50">
                    ... y {validos.length - 10} más
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Errores */}
          {errores.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-600">
                <FileWarning className="h-4 w-4" />
                Errores en el archivo ({errores.length})
              </h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                {errores.map((error, idx) => (
                  <p key={idx} className="text-xs text-red-700">• {error}</p>
                ))}
              </div>
            </div>
          )}

          {/* Sin datos válidos */}
          {!hayValidos && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <XCircle className="h-12 w-12 text-red-300 mb-3" />
              <h4 className="font-medium text-red-700">No hay datos válidos para importar</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Corrige los errores en el Excel y vuelve a intentar.
              </p>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar y Modificar Excel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!hayValidos || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importar {validos.length} Recurso(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
