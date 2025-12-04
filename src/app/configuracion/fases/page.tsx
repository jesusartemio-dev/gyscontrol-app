// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: /configuracion/fases/
// 🎨 Descripción: Página de configuración de fases por defecto
// ✅ Gestión completa de fases estándar del sistema
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-22
// ===================================================

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, Settings, Palette, Calendar, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { exportarFasesAExcel } from '@/lib/utils/faseExcel'
import {
  leerFasesDesdeExcel,
  validarFases
} from '@/lib/utils/faseImportUtils'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

interface FaseDefault {
  id: string
  nombre: string
  descripcion?: string
  orden: number
  duracionDias: number
  color?: string
  activo: boolean
  createdAt: string
  updatedAt: string
}

export default function FasesConfiguracionPage() {
  const [fases, setFases] = useState<FaseDefault[]>([])
  const [allFases, setAllFases] = useState<FaseDefault[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingFase, setEditingFase] = useState<FaseDefault | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [faseToDelete, setFaseToDelete] = useState<FaseDefault | null>(null)
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    orden: 0,
    duracionDias: 0,
    color: '#3b82f6',
    activo: true
  })

  useEffect(() => {
    loadFases()
  }, [])

  useEffect(() => {
    applyFilter(allFases)
  }, [filter, allFases])

  const loadFases = async () => {
    try {
      // Load all phases for proper filtering
      const response = await fetch('/api/configuracion/fases?all=true')
      const result = await response.json()

      if (result.success) {
        setAllFases(result.data)
        // Apply current filter
        applyFilter(result.data)
      } else {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las fases por defecto',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión al cargar fases',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilter = (fasesData: FaseDefault[]) => {
    let filteredFases: FaseDefault[]

    switch (filter) {
      case 'active':
        filteredFases = fasesData.filter(f => f.activo)
        break
      case 'inactive':
        filteredFases = fasesData.filter(f => !f.activo)
        break
      default:
        filteredFases = fasesData
    }

    setFases(filteredFases)
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      orden: 0,
      duracionDias: 0,
      color: '#3b82f6',
      activo: true
    })
    setEditingFase(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingFase
        ? `/api/configuracion/fases/${editingFase.id}`
        : '/api/configuracion/fases'

      const method = editingFase ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Éxito',
          description: editingFase
            ? 'Fase actualizada exitosamente'
            : 'Fase creada exitosamente'
        })

        setShowForm(false)
        resetForm()
        loadFases()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Error al guardar la fase',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive'
      })
    }
  }

  const handleEdit = (fase: FaseDefault) => {
    setEditingFase(fase)
    setFormData({
      nombre: fase.nombre,
      descripcion: fase.descripcion || '',
      orden: fase.orden,
      duracionDias: fase.duracionDias || 0,
      color: fase.color || '#3b82f6',
      activo: fase.activo
    })
    setShowForm(true)
  }

  const handleDeleteClick = (fase: FaseDefault) => {
    setFaseToDelete(fase)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!faseToDelete) return

    try {
      const response = await fetch(`/api/configuracion/fases/${faseToDelete.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Fase desactivada exitosamente'
        })
        loadFases()
        setShowDeleteDialog(false)
        setFaseToDelete(null)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Error al desactivar la fase',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive'
      })
    }
  }

  const handleReactivate = async (fase: FaseDefault) => {
    try {
      const response = await fetch(`/api/configuracion/fases/${fase.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...fase, activo: true })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Fase reactivada exitosamente'
        })
        loadFases()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Error al reactivar la fase',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive'
      })
    }
  }

  const handleExportar = () => {
    try {
      exportarFasesAExcel(fases)
      toast({
        title: 'Éxito',
        description: 'Fases exportadas exitosamente'
      })
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Error al exportar fases',
        variant: 'destructive'
      })
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Prevent multiple simultaneous imports
    if (importando) {
      toast({
        title: 'Importación en progreso',
        description: 'Espera a que termine la importación actual',
        variant: 'destructive'
      })
      return
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Tipo de archivo inválido',
        description: 'Solo se permiten archivos Excel (.xlsx, .xls)',
        variant: 'destructive'
      })
      e.target.value = ''
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'Archivo demasiado grande',
        description: 'El archivo no debe superar los 5MB',
        variant: 'destructive'
      })
      e.target.value = ''
      return
    }

    setImportando(true)
    setErrores([])

    try {
      const datos = await leerFasesDesdeExcel(file)

      // Get ALL phases (active and inactive) for proper validation
      const responseAll = await fetch('/api/configuracion/fases?all=true')
      const resultAll = await responseAll.json()
      const allFases = resultAll.success ? resultAll.data : []

      const nombresExistentes = allFases.map((f: FaseDefault) => f.nombre)
      const { nuevas, errores: erroresImport, actualizaciones } = validarFases(datos, nombresExistentes)

      // Only validation errors are blocking - updates are allowed
      if (erroresImport.length > 0) {
        setErrores(erroresImport)
        toast({
          title: 'Errores encontrados',
          description: 'Se encontraron errores en la importación',
          variant: 'destructive'
        })
        return
      }

      // Show info about updates if any
      if (actualizaciones.length > 0) {
        toast({
          title: 'Actualizaciones detectadas',
          description: `${actualizaciones.length} fases serán actualizadas: ${actualizaciones.join(', ')}`,
        })
      }

      // Import fases one by one to handle errors better
      let successCount = 0
      let errorCount = 0
      const erroresAPI: string[] = []

      for (const fase of nuevas) {
        try {
          // Check if fase already exists (in ALL fases, including deactivated)
          const existingFase = allFases.find((f: FaseDefault) => f.nombre === fase.nombre)

          const method = existingFase ? 'PUT' : 'POST'
          const url = existingFase
            ? `/api/configuracion/fases/${existingFase.id}`
            : '/api/configuracion/fases'

          // If fase exists but is deactivated, ensure it gets reactivated
          const faseData = existingFase && !existingFase.activo
            ? { ...fase, activo: true } // Reactivate if it was deactivated
            : fase

          const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(faseData)
          })

          const result = await response.json()

          if (response.ok && result.success) {
            successCount++
          } else {
            errorCount++
            const action = existingFase ? 'actualizando' : 'creando'
            erroresAPI.push(`Error ${action} "${fase.nombre}": ${result.error || 'Error desconocido'}`)
          }
        } catch (error) {
          errorCount++
          erroresAPI.push(`Error de conexión procesando "${fase.nombre}"`)
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Importación completada',
          description: `${successCount} fases importadas correctamente${errorCount > 0 ? `, ${errorCount} errores` : ''}`
        })
        loadFases()
      }

      if (erroresAPI.length > 0) {
        setErrores(prev => [...prev, ...erroresAPI])
      }
    } catch (err) {
      const errorMessage = 'Error inesperado en la importación'
      setErrores([errorMessage])
      console.error('Error al importar fases:', err)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando configuración de fases...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Configuración de Fases por Defecto
          </h1>
          <p className="text-muted-foreground">
            Gestiona las fases estándar que se utilizarán en cronogramas de cotizaciones y proyectos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => { resetForm(); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Fase
          </Button>
          <BotonesImportExport
            onExportar={handleExportar}
            onImportar={handleImportar}
            importando={importando}
            exportLabel="Exportar Fases"
            importLabel="Importar Fases"
          />
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm}>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingFase ? 'Editar Fase' : 'Nueva Fase por Defecto'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Planificación, Ejecución, Cierre"
                  required
                />
              </div>

              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción de la fase"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orden">Orden</Label>
                  <Input
                    id="orden"
                    type="number"
                    value={formData.orden}
                    onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="duracionDias">Duración (días) *</Label>
                  <Input
                    id="duracionDias"
                    type="number"
                    value={formData.duracionDias}
                    onChange={(e) => setFormData({ ...formData, duracionDias: parseInt(e.target.value) || 0 })}
                    min="1"
                    placeholder="Ej: 45, 90, 120"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <Label htmlFor="activo">Activa</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowForm(false); resetForm() }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingFase ? 'Actualizar' : 'Crear'} Fase
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Eliminación</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que quieres desactivar esta fase? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>

            {faseToDelete && (
              <div className="py-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Fase:</span>
                      <span className="text-gray-900">{faseToDelete.nombre}</span>
                    </div>
                  </div>
                  {faseToDelete.descripcion && (
                    <div className="mt-2 text-sm text-gray-600">
                      {faseToDelete.descripcion}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                    <span>Orden: {faseToDelete.orden}</span>
                    {faseToDelete.duracionDias && (
                      <span>Duración: {faseToDelete.duracionDias} días</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false)
                  setFaseToDelete(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Desactivar Fase
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-muted-foreground">Filtrar:</span>
        <div className="flex rounded-lg border">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className="rounded-r-none"
          >
            Todas ({allFases.length})
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('active')}
            className="rounded-none border-x"
          >
            Activas ({allFases.filter(f => f.activo).length})
          </Button>
          <Button
            variant={filter === 'inactive' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('inactive')}
            className="rounded-l-none"
          >
            Inactivas ({allFases.filter(f => !f.activo).length})
          </Button>
        </div>
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

      {/* Fases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Fases por Defecto ({fases.length})
            {filter !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                {filter === 'active' ? 'Activas' : 'Inactivas'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fases.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay fases configuradas</h3>
              <p className="text-muted-foreground mb-4">
                Crea fases por defecto que se utilizarán automáticamente en los cronogramas
              </p>
              <Button onClick={() => { resetForm(); setShowForm(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Fase
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Duración (días)</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fases.map((fase) => (
                  <TableRow key={fase.id}>
                    <TableCell className="font-medium">{fase.orden}</TableCell>
                    <TableCell className="font-medium">{fase.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {fase.descripcion || '-'}
                    </TableCell>
                    <TableCell>
                      {fase.duracionDias ? (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <Calendar className="h-3 w-3" />
                          {fase.duracionDias} días
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: fase.color || '#3b82f6' }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {fase.color || '#3b82f6'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={fase.activo ? "default" : "secondary"}>
                        {fase.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(fase)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {fase.activo ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(fase)}
                            className="text-red-600 hover:text-red-700"
                            title="Desactivar fase"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivate(fase)}
                            className="text-green-600 hover:text-green-700"
                            title="Reactivar fase"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium mb-2">¿Cómo funcionan las fases por defecto?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Se utilizan automáticamente al crear fases en cotizaciones</li>
                <li>• El porcentaje de duración define cuánto tiempo ocupa cada fase del proyecto total</li>
                <li>• Los colores ayudan en la visualización de Gantt charts</li>
                <li>• Las fases inactivas no aparecen en nuevas creaciones</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}