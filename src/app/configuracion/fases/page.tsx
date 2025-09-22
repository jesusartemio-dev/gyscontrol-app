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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, Settings, Palette, Percent } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface FaseDefault {
  id: string
  nombre: string
  descripcion?: string
  orden: number
  porcentajeDuracion?: number
  color?: string
  activo: boolean
  createdAt: string
  updatedAt: string
}

export default function FasesConfiguracionPage() {
  const [fases, setFases] = useState<FaseDefault[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingFase, setEditingFase] = useState<FaseDefault | null>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    orden: 0,
    porcentajeDuracion: 0,
    color: '#3b82f6',
    activo: true
  })

  useEffect(() => {
    loadFases()
  }, [])

  const loadFases = async () => {
    try {
      const response = await fetch('/api/configuracion/fases')
      const result = await response.json()

      if (result.success) {
        setFases(result.data)
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

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      orden: 0,
      porcentajeDuracion: 0,
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
      porcentajeDuracion: fase.porcentajeDuracion || 0,
      color: fase.color || '#3b82f6',
      activo: fase.activo
    })
    setShowForm(true)
  }

  const handleDelete = async (fase: FaseDefault) => {
    if (!confirm(`¿Estás seguro de desactivar la fase "${fase.nombre}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/configuracion/fases/${fase.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Éxito',
          description: 'Fase desactivada exitosamente'
        })
        loadFases()
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

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setShowForm(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Fase
            </Button>
          </DialogTrigger>

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
                  <Label htmlFor="porcentajeDuracion">Duración (%)</Label>
                  <Input
                    id="porcentajeDuracion"
                    type="number"
                    value={formData.porcentajeDuracion}
                    onChange={(e) => setFormData({ ...formData, porcentajeDuracion: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    step="0.1"
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
      </div>

      {/* Fases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Fases por Defecto ({fases.length})
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
                  <TableHead>Duración</TableHead>
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
                      {fase.porcentajeDuracion ? (
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <Percent className="h-3 w-3" />
                          {fase.porcentajeDuracion}%
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(fase)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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