'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Edit, Trash2, RotateCcw, Loader2, Search, X, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

interface TipoBloqueo {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  orden: number
  createdAt: string
  updatedAt: string
}

interface FormData {
  nombre: string
  descripcion: string
  activo: boolean
}

export default function TiposBloqueosPage() {
  const [tipos, setTipos] = useState<TipoBloqueo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingTipo, setEditingTipo] = useState<TipoBloqueo | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [tipoToDelete, setTipoToDelete] = useState<TipoBloqueo | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    descripcion: '',
    activo: true
  })

  useEffect(() => { loadTipos() }, [])

  const filteredTipos = useMemo(() => {
    let filtered = tipos
    if (filter === 'active') filtered = filtered.filter(t => t.activo)
    else if (filter === 'inactive') filtered = filtered.filter(t => !t.activo)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(t =>
        t.nombre.toLowerCase().includes(term) ||
        t.descripcion?.toLowerCase().includes(term)
      )
    }
    return filtered
  }, [tipos, filter, searchTerm])

  const loadTipos = async () => {
    try {
      const res = await fetch('/api/configuracion/tipos-bloqueo')
      if (!res.ok) throw new Error('Error al cargar')
      const data = await res.json()
      setTipos(data)
    } catch {
      toast.error('Error al cargar tipos de bloqueo')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ nombre: '', descripcion: '', activo: true })
    setEditingTipo(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    setSaving(true)
    try {
      const url = editingTipo
        ? `/api/configuracion/tipos-bloqueo/${editingTipo.id}`
        : '/api/configuracion/tipos-bloqueo'
      const res = await fetch(url, {
        method: editingTipo ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error al guardar')
      toast.success(editingTipo ? 'Tipo actualizado' : 'Tipo creado')
      setShowForm(false)
      resetForm()
      loadTipos()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (tipo: TipoBloqueo) => {
    setEditingTipo(tipo)
    setFormData({
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
      activo: tipo.activo
    })
    setShowForm(true)
  }

  const handleToggleActive = async (tipo: TipoBloqueo) => {
    try {
      const res = await fetch(`/api/configuracion/tipos-bloqueo/${tipo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !tipo.activo })
      })
      if (!res.ok) throw new Error('Error')
      toast.success(tipo.activo ? 'Tipo desactivado' : 'Tipo activado')
      loadTipos()
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  const handleDeleteClick = (tipo: TipoBloqueo) => {
    setTipoToDelete(tipo)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!tipoToDelete) return
    try {
      const res = await fetch(`/api/configuracion/tipos-bloqueo/${tipoToDelete.id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Error al eliminar')
      toast.success('Tipo eliminado')
      loadTipos()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    } finally {
      setShowDeleteDialog(false)
      setTipoToDelete(null)
    }
  }

  const stats = useMemo(() => ({
    total: tipos.length,
    activos: tipos.filter(t => t.activo).length,
    inactivos: tipos.filter(t => !t.activo).length
  }), [tipos])

  const hasActiveFilters = searchTerm !== '' || filter !== 'all'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tipos de Bloqueo</h1>
              <p className="text-muted-foreground">
                Categorías de bloqueos para identificar causas de retrasos en campo
              </p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.total}</div>
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
              <div className="flex flex-1 gap-2 w-full sm:w-auto flex-wrap">
                <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar tipos..."
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
                  <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setFilter('all') }} className="h-9">
                    <X className="h-4 w-4 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>

              <Button onClick={() => { resetForm(); setShowForm(true) }} className="h-9">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Tipo
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {filteredTipos.length === 0 ? (
              <div className="text-center py-8">
                <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay tipos de bloqueo</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'No se encontraron resultados' : 'Crea el primer tipo para comenzar'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => { resetForm(); setShowForm(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Tipo
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTipos.map((tipo) => (
                    <TableRow key={tipo.id}>
                      <TableCell className="text-muted-foreground text-sm">{tipo.orden}</TableCell>
                      <TableCell className="font-medium">{tipo.nombre}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[300px] truncate">
                        {tipo.descripcion || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tipo.activo ? 'default' : 'secondary'}>
                          {tipo.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(tipo)} className="h-8 w-8 p-0">
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
                                onClick={() => handleToggleActive(tipo)}
                                className={`h-8 w-8 p-0 ${tipo.activo ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}`}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{tipo.activo ? 'Desactivar' : 'Activar'}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(tipo)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar</TooltipContent>
                          </Tooltip>
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
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                {editingTipo ? 'Editar Tipo de Bloqueo' : 'Nuevo Tipo de Bloqueo'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: GYS-Logística, Cliente-Gestión"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripcion</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripcion del tipo de bloqueo para ayudar al supervisor a seleccionar correctamente"
                  rows={3}
                />
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
                    editingTipo ? 'Actualizar' : 'Crear'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Eliminacion</DialogTitle>
              <DialogDescription>
                Esta accion no se puede deshacer. Los bloqueos ya registrados con este tipo conservaran el nombre.
              </DialogDescription>
            </DialogHeader>
            {tipoToDelete && (
              <div className="py-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">{tipoToDelete.nombre}</p>
                  {tipoToDelete.descripcion && (
                    <p className="text-sm text-muted-foreground mt-1">{tipoToDelete.descripcion}</p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setTipoToDelete(null) }}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>
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
