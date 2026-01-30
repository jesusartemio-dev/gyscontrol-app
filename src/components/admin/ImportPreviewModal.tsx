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
  AlertTriangle,
  RefreshCw,
  Upload,
  FileWarning,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmpleadoImportado } from '@/lib/utils/empleadoExcel'

interface ImportPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  datos: {
    validos: EmpleadoImportado[]
    nuevos: number
    actualizaciones: number
    errores: string[]
    sinUsuario: string[]
  }
  isLoading?: boolean
}

export function ImportPreviewModal({
  open,
  onOpenChange,
  onConfirm,
  datos,
  isLoading = false
}: ImportPreviewModalProps) {
  const { validos, nuevos, actualizaciones, errores, sinUsuario } = datos

  const totalProblemas = errores.length + sinUsuario.length
  const hayValidos = validos.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Vista Previa de Importación
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
              <p className="text-lg font-bold text-red-700">{totalProblemas}</p>
              <p className="text-xs text-red-600">Con Errores</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {/* Empleados Válidos */}
          {validos.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Empleados a Procesar ({validos.length})
              </h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs py-2">Email</TableHead>
                      <TableHead className="text-xs py-2">Cargo</TableHead>
                      <TableHead className="text-xs py-2">Departamento</TableHead>
                      <TableHead className="text-xs py-2 text-right">Sueldo</TableHead>
                      <TableHead className="text-xs py-2 text-center">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validos.slice(0, 10).map((emp, idx) => {
                      // Determinar si es nuevo o actualización basándose en la posición
                      const esNuevo = idx < nuevos
                      return (
                        <TableRow key={emp.email} className="text-xs">
                          <TableCell className="py-1.5 font-mono">{emp.email}</TableCell>
                          <TableCell className="py-1.5">{emp.cargo || '-'}</TableCell>
                          <TableCell className="py-1.5">{emp.departamento || '-'}</TableCell>
                          <TableCell className="py-1.5 text-right font-mono">
                            {((emp.sueldoPlanilla || 0) + (emp.sueldoHonorarios || 0)).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
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

          {/* Errores - Usuarios no encontrados */}
          {sinUsuario.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Emails sin usuario en el sistema ({sinUsuario.length})
              </h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-700 mb-2">
                  Estos emails no existen como usuarios. Debes crearlos primero en <strong>Configuración → Usuarios</strong>:
                </p>
                <div className="flex flex-wrap gap-2">
                  {sinUsuario.map((email) => (
                    <Badge key={email} variant="outline" className="text-xs border-red-300 text-red-700">
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Otros errores */}
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
                Importar {validos.length} Empleado(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
