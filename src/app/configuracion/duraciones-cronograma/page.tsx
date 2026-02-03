'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, Trash2, Calendar, AlertCircle, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { exportarDuracionesCronogramaAExcel, leerDuracionesCronogramaDesdeExcel, validarDuracionesCronograma } from '@/lib/utils/duracionesCronogramaExcel'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'

interface PlantillaDuracion {
  id: string
  nivel: 'edt' | 'actividad' | 'tarea'
  duracionDias: number
  horasPorDia: number
  bufferPorcentaje: number
  activo: boolean
  createdAt: string
  updatedAt: string
}

interface FormData {
  nivel: 'edt' | 'actividad' | 'tarea'
  duracionDias: number
  horasPorDia: number
  bufferPorcentaje: number
}

export default function DuracionesCronogramaPage() {
  const [plantillas, setPlantillas] = useState<PlantillaDuracion[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaDuracion | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [plantillaToDelete, setPlantillaToDelete] = useState<PlantillaDuracion | null>(null)
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<FormData>({
    nivel: 'edt',
    duracionDias: 1,
    horasPorDia: 8,
    bufferPorcentaje: 10
  })

  useEffect(() => {
    loadPlantillas()
  }, [])

  const loadPlantillas = async () => {
    try {
      const response = await fetch('/api/configuracion/duraciones-cronograma')
      if (response.ok) {
        const data = await response.json()
        setPlantillas(data.data || [])
      } else {
        toast.error('Error al cargar las plantillas')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingPlantilla(null)
    setFormData({
      nivel: 'edt',
      duracionDias: 1,
      horasPorDia: 8,
      bufferPorcentaje: 10
    })
    setDialogOpen(true)
  }

  const handleEdit = (plantilla: PlantillaDuracion) => {
    setEditingPlantilla(plantilla)
    setFormData({
      nivel: plantilla.nivel,
      duracionDias: plantilla.duracionDias,
      horasPorDia: plantilla.horasPorDia,
      bufferPorcentaje: plantilla.bufferPorcentaje
    })
    setDialogOpen(true)
  }

  const handleDelete = (plantilla: PlantillaDuracion) => {
    setPlantillaToDelete(plantilla)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const url = editingPlantilla
        ? `/api/configuracion/duraciones-cronograma/${editingPlantilla.id}`
        : '/api/configuracion/duraciones-cronograma'

      const method = editingPlantilla ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success(editingPlantilla ? 'Plantilla actualizada' : 'Plantilla creada')
        setDialogOpen(false)
        loadPlantillas()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error al guardar')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión')
    }
  }

  const handleConfirmDelete = async () => {
    if (!plantillaToDelete) return

    try {
      const response = await fetch(`/api/configuracion/duraciones-cronograma/${plantillaToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Plantilla desactivada')
        setDeleteDialogOpen(false)
        setPlantillaToDelete(null)
        loadPlantillas()
      } else {
        toast.error('Error al desactivar la plantilla')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión')
    }
  }

  const handleExportar = () => {
    try {
      exportarDuracionesCronogramaAExcel(plantillas)
      toast.success('Duraciones exportadas exitosamente')
    } catch (err) {
      toast.error('Error al exportar duraciones')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (importando) {
      toast.error('Espera a que termine la importación actual')
      return
    }

    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo inválido. Solo se permiten archivos Excel (.xlsx, .xls)')
      e.target.value = ''
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande. Máximo 5MB permitido')
      e.target.value = ''
      return
    }

    setImportando(true)
    setErrores([])

    try {
      const datos = await leerDuracionesCronogramaDesdeExcel(file)
      const duracionesExistentes = plantillas.map(p => p.nivel)
      const { nuevas, errores: erroresImport, actualizaciones } = validarDuracionesCronograma(datos, duracionesExistentes)

      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Se encontraron errores en la importación')
        return
      }

      if (actualizaciones.length > 0) {
        toast.success(`${actualizaciones.length} duraciones serán actualizadas: ${actualizaciones.join(', ')}`)
      }

      let successCount = 0
      let errorCount = 0
      const erroresAPI: string[] = []

      for (const duracion of nuevas) {
        try {
          const response = await fetch('/api/configuracion/duraciones-cronograma', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(duracion)
          })

          const result = await response.json()

          if (response.ok && result.success) {
            successCount++
          } else {
            errorCount++
            erroresAPI.push(`Error creando nivel "${duracion.nivel}": ${result.error || 'Error desconocido'}`)
          }
        } catch (error) {
          errorCount++
          erroresAPI.push(`Error de conexión procesando nivel "${duracion.nivel}"`)
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} duraciones importadas correctamente${errorCount > 0 ? `, ${errorCount} errores` : ''}`)
        loadPlantillas()
      }

      if (erroresAPI.length > 0) {
        setErrores(prev => [...prev, ...erroresAPI])
      }
    } catch (err) {
      const errorMessage = 'Error inesperado en la importación'
      setErrores([errorMessage])
      console.error('Error al importar duraciones:', err)
      toast.error(errorMessage)
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  const getNivelLabel = (nivel: string) => {
    const labels: Record<string, string> = {
      fase: 'Fase',
      edt: 'EDT',
      actividad: 'Actividad',
      tarea: 'Tarea'
    }
    return labels[nivel] || nivel
  }

  const filteredPlantillas = plantillas.filter(p =>
    getNivelLabel(p.nivel).toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-[250px]" />
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-7 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header compacto */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Duraciones de Cronograma</h1>
            </div>
            <Badge variant="secondary" className="font-normal">
              {plantillas.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Nueva
            </Button>
            <BotonesImportExport
              onExportar={handleExportar}
              onImportar={handleImportar}
              importando={importando}
            />
          </div>
        </div>

        {/* Errores de importación */}
        {errores.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-2">
              <AlertCircle className="h-4 w-4" />
              Errores de importación:
            </div>
            <ul className="text-xs text-red-600 space-y-1 ml-6 list-disc">
              {errores.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
              {errores.length > 5 && <li>... y {errores.length - 5} más</li>}
            </ul>
          </div>
        )}

        {/* Filtro */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nivel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 h-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {searchTerm && (
            <span className="text-sm text-muted-foreground">
              {filteredPlantillas.length} de {plantillas.length}
            </span>
          )}
        </div>

        {/* Tabla */}
        <Card>
          <CardContent className="p-0">
            {filteredPlantillas.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {plantillas.length === 0 ? 'No hay plantillas' : 'Sin resultados'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {plantillas.length === 0
                    ? 'Comienza agregando tu primera plantilla de duración'
                    : `No hay plantillas que coincidan con "${searchTerm}"`}
                </p>
                {plantillas.length === 0 ? (
                  <Button variant="outline" size="sm" onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva plantilla
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                    <X className="h-4 w-4 mr-2" />
                    Limpiar búsqueda
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Nivel
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                        Días
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                        Horas/Día
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                        Buffer
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
                        Estado
                      </th>
                      <th className="w-24 py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPlantillas.map(plantilla => (
                      <tr key={plantilla.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3">
                          <span className="font-medium text-sm">{getNivelLabel(plantilla.nivel)}</span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-sm">{plantilla.duracionDias}</span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-sm">{plantilla.horasPorDia}</span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-sm">{plantilla.bufferPorcentaje}%</span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={plantilla.activo ? 'default' : 'secondary'} className="text-xs">
                            {plantilla.activo ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleEdit(plantilla)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDelete(plantilla)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Desactivar</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog para crear/editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </DialogTitle>
              <DialogDescription>
                Configura la duración genérica para este nivel jerárquico
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nivel">Nivel Jerárquico</Label>
                <Select
                  value={formData.nivel}
                  onValueChange={(value: 'edt' | 'actividad' | 'tarea') => setFormData(prev => ({ ...prev, nivel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edt">EDT (Estructura de Desglose)</SelectItem>
                    <SelectItem value="actividad">Actividad (Agrupación)</SelectItem>
                    <SelectItem value="tarea">Tarea (Acción ejecutable)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duracionDias">Duración (días)</Label>
                  <Input
                    id="duracionDias"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={isNaN(formData.duracionDias) ? '' : formData.duracionDias}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      setFormData(prev => ({ ...prev, duracionDias: isNaN(value) ? 1 : value }))
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="horasPorDia">Horas/Día</Label>
                  <Input
                    id="horasPorDia"
                    type="number"
                    min="1"
                    max="24"
                    value={isNaN(formData.horasPorDia) ? '' : formData.horasPorDia}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      setFormData(prev => ({ ...prev, horasPorDia: isNaN(value) ? 8 : value }))
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bufferPorcentaje">Buffer (%)</Label>
                  <Input
                    id="bufferPorcentaje"
                    type="number"
                    min="0"
                    max="100"
                    value={isNaN(formData.bufferPorcentaje) ? '' : formData.bufferPorcentaje}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      setFormData(prev => ({ ...prev, bufferPorcentaje: isNaN(value) ? 10 : value }))
                    }}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingPlantilla ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmación para eliminar */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Desactivar plantilla?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción desactivará la plantilla de duración para el nivel "{plantillaToDelete ? getNivelLabel(plantillaToDelete.nivel) : ''}".
                No afectará a cronogramas ya creados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Desactivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
