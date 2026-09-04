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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Edit, Trash2, Building2, RotateCcw, Users, Loader2, Search, UserCircle, X, List, LayoutGrid, Download, Upload, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import type { Departamento, User } from '@/types/modelos'
import { getDepartamentos, createDepartamento, updateDepartamento, deleteDepartamento, DepartamentoPayload } from '@/lib/services/departamento'
import {
  exportarDepartamentosAExcel,
  generarPlantillaDepartamentos,
  leerDepartamentosDesdeExcel,
  validarDepartamentos,
  crearDepartamentosEnBD
} from '@/lib/utils/departamentoExcel'

type ViewMode = 'table' | 'cards'

export default function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [allDepartamentos, setAllDepartamentos] = useState<Departamento[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importando, setImportando] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingDepartamento, setEditingDepartamento] = useState<Departamento | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [departamentoToDelete, setDepartamentoToDelete] = useState<Departamento | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')

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

  // Filter departamentos using useMemo
  const filteredDepartamentos = useMemo(() => {
    let filtered = allDepartamentos

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

    return filtered
  }, [allDepartamentos, filter, searchTerm])

  useEffect(() => {
    setDepartamentos(filteredDepartamentos)
  }, [filteredDepartamentos])

  const loadData = async () => {
    try {
      const [deptData, usuariosRes] = await Promise.all([
        getDepartamentos(),
        fetch('/api/admin/usuarios').then(r => r.json())
      ])
      setAllDepartamentos(deptData)
      setUsuarios(usuariosRes)
    } catch (error) {
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
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

  const handleExportar = () => {
    if (departamentos.length === 0) {
      toast.error('No hay departamentos para exportar')
      return
    }
    exportarDepartamentosAExcel(departamentos)
    toast.success('Archivo exportado correctamente')
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportando(true)
    try {
      const datos = await leerDepartamentosDesdeExcel(file)
      const nombresExistentes = allDepartamentos.map(d => d.nombre)
      const { nuevos, errores, duplicados } = validarDepartamentos(datos, nombresExistentes)

      if (errores.length > 0) {
        toast.error(`${errores.length} error(es): ${errores.slice(0, 2).join(', ')}`)
      }

      if (duplicados.length > 0) {
        toast(`${duplicados.length} departamento(s) ya existen y fueron omitidos`, { icon: '⚠️' })
      }

      if (nuevos.length === 0) {
        toast.error('No hay departamentos nuevos para importar')
        return
      }

      const resultado = await crearDepartamentosEnBD(nuevos)
      toast.success(`${resultado.creados} departamento(s) importados correctamente`)
      loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar archivo')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilter('all')
  }

  const hasActiveFilters = searchTerm !== '' || filter !== 'all'

  // Stats
  const stats = useMemo(() => ({
    total: allDepartamentos.length,
    activos: allDepartamentos.filter(d => d.activo).length,
    inactivos: allDepartamentos.filter(d => !d.activo).length
  }), [allDepartamentos])

  // Table View
  const renderTableView = () => (
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(dept)}>
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
                      onClick={() => handleToggleActive(dept)}
                      className={dept.activo ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{dept.activo ? 'Desactivar' : 'Activar'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(dept)}
                      className="text-red-600 hover:text-red-700"
                      disabled={(dept._count?.empleados || 0) > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {(dept._count?.empleados || 0) > 0 ? 'No se puede eliminar: tiene empleados' : 'Eliminar'}
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
        {departamentos.map((dept) => (
          <motion.div
            key={dept.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center justify-between p-4 rounded-lg border bg-white hover:border-purple-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-gray-900">{dept.nombre}</div>
                <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                  {dept.descripcion || 'Sin descripción'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {dept.responsable && (
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium flex items-center gap-1">
                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                    {dept.responsable.name || dept.responsable.email}
                  </div>
                  <div className="text-xs text-muted-foreground">Responsable</div>
                </div>
              )}

              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {dept._count?.empleados || 0}
              </Badge>

              <Badge variant={dept.activo ? 'default' : 'secondary'}>
                {dept.activo ? 'Activo' : 'Inactivo'}
              </Badge>

              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(dept)} className="h-8 w-8 p-0">
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
                      onClick={() => handleToggleActive(dept)}
                      className={cn("h-8 w-8 p-0", dept.activo ? "text-orange-600" : "text-green-600")}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{dept.activo ? 'Desactivar' : 'Activar'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(dept)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      disabled={(dept._count?.empleados || 0) > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {(dept._count?.empleados || 0) > 0 ? 'Tiene empleados asignados' : 'Eliminar'}
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
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 rounded-xl">
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gestión de Departamentos</h1>
              <p className="text-muted-foreground">
                Administra los departamentos de la empresa (Proyectos, Comercial, SGI, etc.)
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
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
                    placeholder="Buscar departamentos..."
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
                      <Button variant="ghost" size="sm" onClick={generarPlantillaDepartamentos} className="h-8 w-8 p-0">
                        <FileDown className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Descargar plantilla</TooltipContent>
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
                  Nuevo Departamento
                </Button>
              </div>
            </div>
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
              viewMode === 'table' ? renderTableView() : renderCardsView()
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
                  value={formData.responsableId || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, responsableId: v === 'none' ? undefined : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un responsable (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin responsable</SelectItem>
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
    </TooltipProvider>
  )
}
