'use client'

import { useState, useRef, useCallback } from 'react'
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
  Loader2,
  FileSpreadsheet,
  Download,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { EmpleadoImportado } from '@/lib/utils/empleadoExcel'
import {
  generarPlantillaEmpleados,
  leerEmpleadosDesdeExcel,
  validarEmpleados,
  crearEmpleadosEnBD
} from '@/lib/utils/empleadoExcel'

interface EmpleadoImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  emailsUsuarios: string[]
  emailsEmpleadosExistentes: string[]
}

export function EmpleadoImportModal({
  open,
  onOpenChange,
  onSuccess,
  emailsUsuarios,
  emailsEmpleadosExistentes
}: EmpleadoImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [importPreviewData, setImportPreviewData] = useState<{
    validos: EmpleadoImportado[]
    nuevos: number
    actualizaciones: number
    errores: string[]
    sinUsuario: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setFile(null)
    setImportPreviewData(null)
    setIsLoading(false)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState()
    }
    onOpenChange(open)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setIsLoading(true)
    try {
      const datos = await leerEmpleadosDesdeExcel(selectedFile)

      if (datos.length === 0) {
        toast.error('El archivo no contiene datos para importar')
        resetState()
        return
      }

      const resultado = validarEmpleados(datos, emailsUsuarios, emailsEmpleadosExistentes)
      setImportPreviewData(resultado)
    } catch (error) {
      console.error('Error leyendo Excel:', error)
      toast.error(error instanceof Error ? error.message : 'Error al leer el archivo')
      resetState()
    } finally {
      setIsLoading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      processFile(droppedFile)
    } else {
      toast.error('Solo se permiten archivos Excel (.xlsx, .xls)')
    }
  }, [emailsUsuarios, emailsEmpleadosExistentes])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  const handleDownloadTemplate = () => {
    generarPlantillaEmpleados()
    toast.success('Plantilla descargada')
  }

  const executeImport = async () => {
    if (!importPreviewData || importPreviewData.validos.length === 0) return

    setIsLoading(true)
    try {
      const resultado = await crearEmpleadosEnBD(importPreviewData.validos)

      const mensajes: string[] = []
      if (resultado.creados > 0) mensajes.push(`${resultado.creados} creados`)
      if (resultado.actualizados > 0) mensajes.push(`${resultado.actualizados} actualizados`)

      if (mensajes.length > 0) {
        toast.success(`Importacion completada: ${mensajes.join(', ')}`)
      }

      onSuccess()
      handleClose(false)
    } catch (error) {
      console.error('Error en importacion:', error)
      toast.error(error instanceof Error ? error.message : 'Error al importar')
    } finally {
      setIsLoading(false)
    }
  }

  const { validos = [], nuevos = 0, actualizaciones = 0, errores = [], sinUsuario = [] } = importPreviewData || {}
  const totalProblemas = errores.length + sinUsuario.length
  const hayValidos = validos.length > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-orange-500" />
            Importar Personal desde Excel
          </DialogTitle>
          <DialogDescription>
            {!importPreviewData
              ? 'Arrastra un archivo Excel o haz clic para seleccionar'
              : 'Revisa los datos antes de importar'
            }
          </DialogDescription>
        </DialogHeader>

        {!importPreviewData ? (
          // Vista inicial: cargar archivo
          <div className="flex-1 space-y-4 py-4">
            {/* Dropzone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragging ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-gray-400",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isLoading && fileInputRef.current?.click()}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  <p className="text-sm text-muted-foreground">Procesando archivo...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium">
                    Arrastra un archivo Excel o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato .xlsx con columnas: Email, Cargo, Departamento, Sueldo Planilla, etc.
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading}
              />
            </div>

            {/* Descargar plantilla */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs font-medium">Descargar plantilla</p>
                  <p className="text-[10px] text-muted-foreground">
                    Archivo Excel con el formato correcto
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="h-7 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Descargar
              </Button>
            </div>

            {/* Info */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs font-medium text-amber-800 mb-1">Importante</p>
              <ul className="text-[10px] text-amber-700 space-y-0.5 list-disc list-inside">
                <li>El Email debe corresponder a un usuario existente en el sistema</li>
                <li>Cargo y Departamento se vinculan por nombre exacto</li>
                <li>Si el empleado ya existe (mismo email), se actualizara</li>
              </ul>
            </div>
          </div>
        ) : (
          // Vista previa de importacion
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Archivo cargado */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium">{file?.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="h-6 w-6 p-0"
                disabled={isLoading}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-bold text-blue-700">{validos.length}</p>
                  <p className="text-[10px] text-blue-600">Validos</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-green-700">{nuevos}</p>
                  <p className="text-[10px] text-green-600">Nuevos</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
                <RefreshCw className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-amber-700">{actualizaciones}</p>
                  <p className="text-[10px] text-amber-600">Actualizar</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                <XCircle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-sm font-bold text-red-700">{totalProblemas}</p>
                  <p className="text-[10px] text-red-600">Errores</p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              {/* Empleados Validos */}
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
                          <TableHead className="text-xs py-2 text-center">Accion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validos.slice(0, 10).map((emp, idx) => {
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
                        ... y {validos.length - 10} mas
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
                      Estos emails no existen como usuarios. Debes crearlos primero en <strong>Admin → Usuarios</strong>:
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

              {/* Sin datos validos */}
              {!hayValidos && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <XCircle className="h-12 w-12 text-red-300 mb-3" />
                  <h4 className="font-medium text-red-700">No hay datos validos para importar</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Corrige los errores en el Excel y vuelve a intentar.
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          {importPreviewData && (
            <Button
              onClick={executeImport}
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
