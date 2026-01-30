'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, Briefcase, RotateCcw, Users, DollarSign, Loader2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Cargo } from '@/types/modelos'
import { getCargos, createCargo, updateCargo, deleteCargo, CargoPayload } from '@/lib/services/cargo'

export default function CargosPage() {
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [allCargos, setAllCargos] = useState<Cargo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [cargoToDelete, setCargoToDelete] = useState<Cargo | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Form state
  const [formData, setFormData] = useState<CargoPayload>({
    nombre: '',
    descripcion: '',
    sueldoBase: undefined,
    activo: true
  })

  useEffect(() => {
    loadCargos()
  }, [])

  useEffect(() => {
    applyFilter(allCargos)
  }, [filter, searchTerm, allCargos])

  const loadCargos = async () => {
    try {
      const data = await getCargos()
      setAllCargos(data)
      applyFilter(data)
    } catch (error) {
      toast.error('Error al cargar los cargos')
    } finally {
      setLoading(false)
    }
  }

  const applyFilter = (cargosData: Cargo[]) => {
    let filtered = cargosData

    // Filter by status
    if (filter === 'active') {
      filtered = filtered.filter(c => c.activo)
    } else if (filter === 'inactive') {
      filtered = filtered.filter(c => !c.activo)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c =>
        c.nombre.toLowerCase().includes(term) ||
        c.descripcion?.toLowerCase().includes(term)
      )
    }

    setCargos(filtered)
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      sueldoBase: undefined,
      activo: true
    })
    setEditingCargo(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    setSaving(true)
    try {
      if (editingCargo) {
        await updateCargo(editingCargo.id, formData)
        toast.success('Cargo actualizado correctamente')
      } else {
        await createCargo(formData)
        toast.success('Cargo creado correctamente')
      }

      setShowForm(false)
      resetForm()
      loadCargos()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (cargo: Cargo) => {
    setEditingCargo(cargo)
    setFormData({
      nombre: cargo.nombre,
      descripcion: cargo.descripcion || '',
      sueldoBase: cargo.sueldoBase,
      activo: cargo.activo
    })
    setShowForm(true)
  }

  const handleDeleteClick = (cargo: Cargo) => {
    setCargoToDelete(cargo)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!cargoToDelete) return

    try {
      await deleteCargo(cargoToDelete.id)
      toast.success('Cargo eliminado correctamente')
      loadCargos()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    } finally {
      setShowDeleteDialog(false)
      setCargoToDelete(null)
    }
  }

  const handleToggleActive = async (cargo: Cargo) => {
    try {
      await updateCargo(cargo.id, { activo: !cargo.activo })
      toast.success(cargo.activo ? 'Cargo desactivado' : 'Cargo activado')
      loadCargos()
    } catch (error) {
      toast.error('Error al cambiar estado')
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(amount)
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
            <Briefcase className="h-6 w-6 text-blue-600" />
            Gestión de Cargos
          </h1>
          <p className="text-muted-foreground">
            Administra los cargos/puestos de trabajo disponibles en la empresa
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cargo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cargos..."
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
            Todos ({allCargos.length})
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('active')}
            className="rounded-none border-x"
          >
            Activos ({allCargos.filter(c => c.activo).length})
          </Button>
          <Button
            variant={filter === 'inactive' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('inactive')}
            className="rounded-l-none"
          >
            Inactivos ({allCargos.filter(c => !c.activo).length})
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Cargos ({cargos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cargos.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay cargos</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No se encontraron resultados' : 'Crea el primer cargo para comenzar'}
              </p>
              {!searchTerm && (
                <Button onClick={() => { resetForm(); setShowForm(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Cargo
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Sueldo Base</TableHead>
                  <TableHead>Empleados</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargos.map((cargo) => (
                  <TableRow key={cargo.id}>
                    <TableCell className="font-medium">{cargo.nombre}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {cargo.descripcion || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        {formatCurrency(cargo.sueldoBase)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <Users className="h-3 w-3" />
                        {cargo._count?.empleados || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cargo.activo ? 'default' : 'secondary'}>
                        {cargo.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(cargo)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {cargo.activo ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(cargo)}
                            className="text-orange-600 hover:text-orange-700"
                            title="Desactivar"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(cargo)}
                            className="text-green-600 hover:text-green-700"
                            title="Activar"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(cargo)}
                          className="text-red-600 hover:text-red-700"
                          disabled={(cargo._count?.empleados || 0) > 0}
                          title={(cargo._count?.empleados || 0) > 0 ? 'No se puede eliminar: tiene empleados asignados' : 'Eliminar'}
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
              <Briefcase className="h-5 w-5" />
              {editingCargo ? 'Editar Cargo' : 'Nuevo Cargo'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Ingeniero Senior, Técnico, Coordinador"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion || ''}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción del cargo y responsabilidades"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sueldoBase">Sueldo Base Referencial (PEN)</Label>
              <Input
                id="sueldoBase"
                type="number"
                step="0.01"
                value={formData.sueldoBase || ''}
                onChange={(e) => setFormData({ ...formData, sueldoBase: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Este valor es solo referencial, el sueldo real se define en el empleado
              </p>
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
                  editingCargo ? 'Actualizar' : 'Crear'
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
              ¿Estás seguro de que deseas eliminar este cargo? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {cargoToDelete && (
            <div className="py-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium">{cargoToDelete.nombre}</p>
                {cargoToDelete.descripcion && (
                  <p className="text-sm text-muted-foreground mt-1">{cargoToDelete.descripcion}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowDeleteDialog(false); setCargoToDelete(null) }}
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
