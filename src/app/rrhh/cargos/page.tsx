'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Edit, Trash2, Briefcase, RotateCcw, Users, DollarSign, Loader2, Search, X, List, LayoutGrid, Download, Upload, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import type { Cargo } from '@/types/modelos'
import { getCargos, createCargo, updateCargo, deleteCargo, CargoPayload } from '@/lib/services/cargo'
import {
  exportarCargosAExcel,
  generarPlantillaCargos,
  leerCargosDesdeExcel,
  validarCargos,
  crearCargosEnBD
} from '@/lib/utils/cargoExcel'

type ViewMode = 'table' | 'cards'

export default function CargosPage() {
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [allCargos, setAllCargos] = useState<Cargo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importando, setImportando] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [cargoToDelete, setCargoToDelete] = useState<Cargo | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')

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

  // Filter cargos using useMemo
  const filteredCargos = useMemo(() => {
    let filtered = allCargos

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

    return filtered
  }, [allCargos, filter, searchTerm])

  useEffect(() => {
    setCargos(filteredCargos)
  }, [filteredCargos])

  const loadCargos = async () => {
    try {
      const data = await getCargos()
      setAllCargos(data)
    } catch (error) {
      toast.error('Error al cargar los cargos')
    } finally {
      setLoading(false)
    }
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

  const handleExportar = () => {
    if (cargos.length === 0) {
      toast.error('No hay cargos para exportar')
      return
    }
    exportarCargosAExcel(cargos)
    toast.success('Archivo exportado correctamente')
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportando(true)
    try {
      const datos = await leerCargosDesdeExcel(file)
      const nombresExistentes = allCargos.map(c => c.nombre)
      const { nuevos, errores, duplicados } = validarCargos(datos, nombresExistentes)

      if (errores.length > 0) {
        toast.error(`${errores.length} error(es): ${errores.slice(0, 2).join(', ')}`)
      }

      if (duplicados.length > 0) {
        toast(`${duplicados.length} cargo(s) ya existen y fueron omitidos`, { icon: '⚠️' })
      }

      if (nuevos.length === 0) {
        toast.error('No hay cargos nuevos para importar')
        return
      }

      const resultado = await crearCargosEnBD(nuevos)
      toast.success(`${resultado.creados} cargo(s) importados correctamente`)
      loadCargos()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar archivo')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(amount)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilter('all')
  }

  const hasActiveFilters = searchTerm !== '' || filter !== 'all'

  // Stats
  const stats = useMemo(() => ({
    total: allCargos.length,
    activos: allCargos.filter(c => c.activo).length,
    inactivos: allCargos.filter(c => !c.activo).length
  }), [allCargos])

  // Table View
  const renderTableView = () => (
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(cargo)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(cargo)}
                      className={cargo.activo ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{cargo.activo ? 'Desactivar' : 'Activar'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(cargo)}
                      className="text-red-600 hover:text-red-700"
                      disabled={(cargo._count?.empleados || 0) > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {(cargo._count?.empleados || 0) > 0 ? 'No se puede eliminar: tiene empleados' : 'Eliminar'}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  // Cards View
  const renderCardsView = () => (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {cargos.map((cargo) => (
          <motion.div
            key={cargo.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center justify-between p-4 rounded-lg border bg-white hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-gray-900">{cargo.nombre}</div>
                <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                  {cargo.descripcion || 'Sin descripción'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium">{formatCurrency(cargo.sueldoBase)}</div>
                <div className="text-xs text-muted-foreground">Sueldo base</div>
              </div>

              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {cargo._count?.empleados || 0}
              </Badge>

              <Badge variant={cargo.activo ? 'default' : 'secondary'}>
                {cargo.activo ? 'Activo' : 'Inactivo'}
              </Badge>

              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(cargo)} className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(cargo)}
                      className={cn("h-8 w-8 p-0", cargo.activo ? "text-orange-600" : "text-green-600")}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{cargo.activo ? 'Desactivar' : 'Activar'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(cargo)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      disabled={(cargo._count?.empleados || 0) > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {(cargo._count?.empleados || 0) > 0 ? 'Tiene empleados asignados' : 'Eliminar'}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-xl">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gestión de Cargos</h1>
              <p className="text-muted-foreground">
                Administra los cargos/puestos de trabajo disponibles en la empresa
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.activos}</div>
              <div className="text-xs text-muted-foreground">Activos</div>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search and Filters */}
              <div className="flex flex-1 gap-2 w-full sm:w-auto flex-wrap">
                <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cargos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="flex rounded-lg border">
                  <Button
                    variant={filter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('all')}
                    className="rounded-r-none h-9"
                  >
                    Todos ({stats.total})
                  </Button>
                  <Button
                    variant={filter === 'active' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('active')}
                    className="rounded-none border-x h-9"
                  >
                    Activos ({stats.activos})
                  </Button>
                  <Button
                    variant={filter === 'inactive' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('inactive')}
                    className="rounded-l-none h-9"
                  >
                    Inactivos ({stats.inactivos})
                  </Button>
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                    <X className="h-4 w-4 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Import/Export */}
                <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/50">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={handleExportar} className="h-8 px-2">
                        <Download className="h-4 w-4 mr-1" />
                        Exportar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Exportar a Excel</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label className={cn(
                        "flex items-center gap-1 h-8 px-2 rounded-md cursor-pointer transition-colors",
                        importando ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"
                      )}>
                        {importando ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span className="text-sm">Importar</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleImportar}
                          className="hidden"
                          disabled={importando}
                        />
                      </label>
                    </TooltipTrigger>
                    <TooltipContent>Importar desde Excel</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          generarPlantillaCargos()
                          toast.success('Plantilla descargada')
                        }}
                        className="h-8 px-2"
                      >
                        <FileDown className="h-4 w-4 mr-1" />
                        Plantilla
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Descargar plantilla de ejemplo para importar</TooltipContent>
                  </Tooltip>
                </div>

                {/* View Toggle */}
                <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode('table')}
                        className={cn(
                          "h-8 w-8 p-0 rounded-md",
                          viewMode === 'table' && "bg-white shadow-sm"
                        )}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Vista tabla</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode('cards')}
                        className={cn(
                          "h-8 w-8 p-0 rounded-md",
                          viewMode === 'cards' && "bg-white shadow-sm"
                        )}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Vista tarjetas</TooltipContent>
                  </Tooltip>
                </div>

                {/* New Button */}
                <Button onClick={() => { resetForm(); setShowForm(true) }} className="h-9">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Cargo
                </Button>
              </div>
            </div>
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
              viewMode === 'table' ? renderTableView() : renderCardsView()
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
    </TooltipProvider>
  )
}
