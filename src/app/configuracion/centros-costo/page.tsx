'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Edit, Trash2, CreditCard, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { getCentrosCosto, createCentroCosto, updateCentroCosto, deleteCentroCosto } from '@/lib/services/centroCosto'
import type { CentroCosto } from '@/types'

const TIPOS = [
  { value: 'departamento', label: 'Departamento' },
  { value: 'administrativo', label: 'Administrativo' },
]

export default function CentrosCostoPage() {
  const [items, setItems] = useState<CentroCosto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CentroCosto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CentroCosto | null>(null)
  const [filterTipo, setFilterTipo] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<'departamento' | 'administrativo'>('administrativo')
  const [descripcion, setDescripcion] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getCentrosCosto()
      setItems(data)
    } catch {
      toast.error('Error al cargar centros de costo')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let result = items
    if (filterTipo !== 'all') result = result.filter(i => i.tipo === filterTipo)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(i =>
        i.nombre.toLowerCase().includes(term) ||
        i.descripcion?.toLowerCase().includes(term)
      )
    }
    return result
  }, [items, filterTipo, searchTerm])

  const resetForm = () => {
    setNombre('')
    setTipo('administrativo')
    setDescripcion('')
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (item: CentroCosto) => {
    setEditing(item)
    setNombre(item.nombre)
    setTipo(item.tipo)
    setDescripcion(item.descripcion || '')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    try {
      setSaving(true)
      if (editing) {
        await updateCentroCosto(editing.id, { nombre: nombre.trim(), tipo, descripcion: descripcion.trim() || undefined })
        toast.success('Centro de costo actualizado')
      } else {
        await createCentroCosto({ nombre: nombre.trim(), tipo, descripcion: descripcion.trim() || undefined })
        toast.success('Centro de costo creado')
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

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteCentroCosto(deleteTarget.id)
      toast.success('Centro de costo desactivado')
      setDeleteTarget(null)
      loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al desactivar')
    }
  }

  const activos = items.filter(i => i.activo).length
  const inactivos = items.length - activos

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-600" />
            Centros de Costo
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length} centros · {activos} activos · {inactivos} inactivos
          </p>
        </div>
        <Button onClick={openCreate} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Centro
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2.5">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {TIPOS.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron centros de costo
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {item.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {item.descripcion || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.activo ? 'default' : 'secondary'} className="text-xs">
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(item)} className="p-1 rounded hover:bg-muted">
                          <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        {item.activo && (
                          <button onClick={() => setDeleteTarget(item)} className="p-1 rounded hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
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

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
              {editing ? 'Editar Centro de Costo' : 'Nuevo Centro de Costo'}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Modifica los datos del centro de costo.' : 'Crea un nuevo centro de costo para clasificar gastos.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Nombre <span className="text-red-500">*</span></Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Oficina Lima, Proyecto ABC"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as 'departamento' | 'administrativo')} disabled={saving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción opcional"
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !nombre.trim()} className="bg-amber-600 hover:bg-amber-700">
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar Centro de Costo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desactivar &quot;{deleteTarget?.nombre}&quot;? No se eliminará, solo se marcará como inactivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
