'use client'

/**
 * 📅 Página de Configuración de Duraciones de Cronograma
 *
 * Página simplificada para gestionar las duraciones genéricas por nivel jerárquico
 * que se usan en la importación automática de cronogramas de 5 niveles.
 *
 * Funcionalidades:
 * - Ver todas las plantillas activas en una sola tabla
 * - Crear nuevas plantillas genéricas
 * - Editar plantillas existentes
 * - Desactivar plantillas
 * - Configuración unificada para EDTs, Actividades y Tareas
 */

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Edit, Trash2, Calendar, Clock, Percent, AlertCircle, CheckCircle, Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { exportarDuracionesCronogramaAExcel, leerDuracionesCronogramaDesdeExcel, validarDuracionesCronograma } from '@/lib/utils/duracionesCronogramaExcel'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Interfaces
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

// Componente principal
export default function DuracionesCronogramaPage() {
  const { data: session } = useSession()
  const [plantillas, setPlantillas] = useState<PlantillaDuracion[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaDuracion | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [plantillaToDelete, setPlantillaToDelete] = useState<PlantillaDuracion | null>(null)
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [formData, setFormData] = useState<FormData>({
    nivel: 'edt',
    duracionDias: 1,
    horasPorDia: 8,
    bufferPorcentaje: 10
  })

  // Cargar plantillas
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

  // Handlers
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

    // Prevent multiple simultaneous imports
    if (importando) {
      toast.error('Espera a que termine la importación actual')
      return
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo inválido. Solo se permiten archivos Excel (.xlsx, .xls)')
      e.target.value = ''
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande. Máximo 5MB permitido')
      e.target.value = ''
      return
    }

    setImportando(true)
    setErrores([])

    try {
      const datos = await leerDuracionesCronogramaDesdeExcel(file)

      // Get all existing duraciones for proper validation
      const duracionesExistentes = plantillas.map(p => p.nivel)
      const { nuevas, errores: erroresImport, actualizaciones } = validarDuracionesCronograma(datos, duracionesExistentes)

      // Only validation errors are blocking - updates are allowed
      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast.error('Se encontraron errores en la importación')
        return
      }

      // Show info about updates if any
      if (actualizaciones.length > 0) {
        toast.success(`${actualizaciones.length} duraciones serán actualizadas: ${actualizaciones.join(', ')}`)
      }

      // Import duraciones one by one to handle errors better
      let successCount = 0
      let errorCount = 0
      const erroresAPI: string[] = []

      for (const duracion of nuevas) {
        try {
          // Always create new duraciones (POST) since we're importing fresh data
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

  // Funciones auxiliares

  const getNivelLabel = (nivel: string) => {
    const labels = {
      fase: 'Fase',
      edt: 'EDT',
      actividad: 'Actividad',
      tarea: 'Tarea'
    }
    return labels[nivel as keyof typeof labels] || nivel
  }

  // No necesitamos agrupar por tipo, mostramos todas las plantillas en una sola tabla

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Duraciones de Cronograma</h1>
          <p className="text-muted-foreground">
            Configura las duraciones genéricas por nivel jerárquico para EDTs, Actividades y Tareas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Plantilla
          </Button>
          <BotonesImportExport
            onExportar={handleExportar}
            onImportar={handleImportar}
            importando={importando}
            exportLabel="Exportar Duraciones"
            importLabel="Importar Duraciones"
          />
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Plantillas</p>
                <p className="text-2xl font-bold">{plantillas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Activas</p>
                <p className="text-2xl font-bold">{plantillas.filter(p => p.activo).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Niveles Configurados</p>
                <p className="text-2xl font-bold">{plantillas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Percent className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Buffer Promedio</p>
                <p className="text-2xl font-bold">
                  {plantillas.length > 0
                    ? Math.round(plantillas.reduce((sum, p) => sum + p.bufferPorcentaje, 0) / plantillas.length)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Errors */}
      {errores.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errores de Importación</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {errores.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabla única de plantillas */}
      <Card>
        <CardHeader>
          <CardTitle>Duraciones por Nivel Jerárquico</CardTitle>
          <CardDescription>
            Configuraciones de duración genéricas para EDTs, Actividades y Tareas en todos los proyectos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nivel</TableHead>
                <TableHead>Duración (días)</TableHead>
                <TableHead>Horas/Día</TableHead>
                <TableHead>Buffer (%)</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plantillas.map(plantilla => (
                <TableRow key={plantilla.id}>
                  <TableCell className="font-medium">
                    {getNivelLabel(plantilla.nivel)}
                  </TableCell>
                  <TableCell>{plantilla.duracionDias}</TableCell>
                  <TableCell>{plantilla.horasPorDia}</TableCell>
                  <TableCell>{plantilla.bufferPorcentaje}%</TableCell>
                  <TableCell>
                    <Badge variant={plantilla.activo ? "default" : "secondary"}>
                      {plantilla.activo ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(plantilla)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(plantilla)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
              Configura la duración genérica para este nivel jerárquico en todos los proyectos
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nivel">Nivel Jerárquico</Label>
              <Select
                value={formData.nivel}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, nivel: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="edt">EDT (Estructura de Desglose de Trabajo)</SelectItem>
                  <SelectItem value="actividad">Actividad (Agrupación de trabajo)</SelectItem>
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
                <Label htmlFor="horasPorDia">Horas por Día</Label>
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
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la plantilla de duración. No se podrá usar en nuevas importaciones,
              pero no afectará a cronogramas ya creados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}