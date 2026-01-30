'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, Building2, RotateCcw, Users, Loader2, Search, UserCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Departamento, User } from '@/types/modelos'
import { getDepartamentos, createDepartamento, updateDepartamento, deleteDepartamento, DepartamentoPayload } from '@/lib/services/departamento'

export default function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [allDepartamentos, setAllDepartamentos] = useState<Departamento[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingDepartamento, setEditingDepartamento] = useState<Departamento | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [departamentoToDelete, setDepartamentoToDelete] = useState<Departamento | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Form state
  const [formData, setFormData] = useState<DepartamentoPayload>({
    nombre: '',
    descripcion: '',
    responsableId: undefined,
    activo: true
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilter(allDepartamentos)
  }, [filter, searchTerm, allDepartamentos])

  const loadData = async () => {
    try {
      const [deptData, usuariosRes] = await Promise.all([
        getDepartamentos(),
        fetch('/api/admin/usuarios').then(r => r.json())
      ])
      setAllDepartamentos(deptData)
      setUsuarios(usuariosRes)
      applyFilter(deptData)
    } catch (error) {
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const applyFilter = (data: Departamento[]) => {
    let filtered = data

    // Filter by status
    if (filter === 'active') {
      filtered = filtered.filter(d => d.activo)
    } else if (filter === 'inactive') {
      filtered = filtered.filter(d => !d.activo)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(d =>
        d.nombre.toLowerCase().includes(term) ||
        d.descripcion?.toLowerCase().includes(term) ||
        d.responsable?.name?.toLowerCase().includes(term)
      )
    }

    setDepartamentos(filtered)
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      responsableId: undefined,
      activo: true
    })
    setEditingDepartamento(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setSaving(true)
    try {
      if (editingDepartamento) {
        await updateDepartamento(editingDepartamento.id, formData)
        toast.success('Departamento actualizado correctamente')
      } else {
        await createDepartamento(formData)
        toast.success('Departamento creado correctamente')
      }

      setShowForm(false)
      resetForm()
      loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (departamento: Departamento) => {
    setEditingDepartamento(departamento)
    setFormData({
      nombre: departamento.nombre,
      descripcion: departamento.descripcion || '',
      responsableId: departamento.responsableId || undefined,
      activo: departamento.activo
    })
    setShowForm(true)
  }

  const handleDeleteClick = (departamento: Departamento) => {
    setDepartamentoToDelete(departamento)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!departamentoToDelete) return

    try {
      await deleteDepartamento(departamentoToDelete.id)
      toast.success('Departamento eliminado correctamente')
      loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    } finally {
      setShowDeleteDialog(false)
      setDepartamentoToDelete(null)
    }
  }

  const handleToggleActive = async (departamento: Departamento) => {
    try {
      await updateDepartamento(departamento.id, { activo: !departamento.activo })
      toast.success(departamento.activo ? 'Departamento desactivado' : 'Departamento activado')
      loadData()
    } catch (error) {
      toast.error('Error al cambiar estado')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-purple-600" />
            Gestión de Departamentos
          </h1>
          <p className="text-muted-foreground">
            Administra los departamentos de la empresa (Proyectos, Comercial, SGI, etc.)
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Departamento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar departamentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex rounded-lg border">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className="rounded-r-none"
          >
            Todos ({allDepartamentos.length})
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('active')}
            className="rounded-none border-x"
          >
            Activos ({allDepartamentos.filter(d => d.activo).length})
          </Button>
          <Button
            variant={filter === 'inactive' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('inactive')}
            className="rounded-l-none"
          >
            Inactivos ({allDepartamentos.filter(d => !d.activo).length})
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Departamentos ({departamentos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {departamentos.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay departamentos</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No se encontraron resultados' : 'Crea el primer departamento para comenzar'}
              </p>
              {!searchTerm && (
                <Button onClick={() => { resetForm(); setShowForm(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Departamento
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Empleados</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departamentos.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.nombre}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {dept.descripcion || '-'}
                    </TableCell>
                    <TableCell>
                      {dept.responsable ? (
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-muted-foreground" />
                          <span>{dept.responsable.name || dept.responsable.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <Users className="h-3 w-3" />
                        {dept._count?.empleados || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={dept.activo ? 'default' : 'secondary'}>
                        {dept.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(dept)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {dept.activo ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(dept)}
                            className="text-orange-600 hover:text-orange-700"
                            title="Desactivar"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(dept)}
                            className="text-green-600 hover:text-green-700"
                            title="Activar"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(dept)}
                          className="text-red-600 hover:text-red-700"
                          disabled={(dept._count?.empleados || 0) > 0}
                          title={(dept._count?.empleados || 0) > 0 ? 'No se puede eliminar: tiene empleados asignados' : 'Eliminar'}
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

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editingDepartamento ? 'Editar Departamento' : 'Nuevo Departamento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Proyectos, Comercial, SGI, Logística"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion || ''}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción del departamento"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsableId">Responsable</Label>
              <Select
                value={formData.responsableId || ''}
                onValueChange={(v) => setFormData({ ...formData, responsableId: v || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un responsable (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin responsable</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
              <Label htmlFor="activo">Activo</Label>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowForm(false); resetForm() }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editingDepartamento ? 'Actualizar' : 'Crear'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este departamento? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {departamentoToDelete && (
            <div className="py-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium">{departamentoToDelete.nombre}</p>
                {departamentoToDelete.descripcion && (
                  <p className="text-sm text-muted-foreground mt-1">{departamentoToDelete.descripcion}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowDeleteDialog(false); setDepartamentoToDelete(null) }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
