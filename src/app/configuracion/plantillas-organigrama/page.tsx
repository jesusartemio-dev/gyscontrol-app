'use client'

import { normalizeStr } from '@/lib/utils'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, GitBranch, Edit, Trash2, Copy, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'

interface Plantilla {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  createdAt: string
  _count: { nodos: number }
}

export default function PlantillasOrganigramaPage() {
  const router = useRouter()
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' })

  useEffect(() => { loadPlantillas() }, [])

  const loadPlantillas = async () => {
    try {
      const res = await fetch('/api/configuracion/plantillas-organigrama')
      if (!res.ok) throw new Error()
      setPlantillas(await res.json())
    } catch {
      toast.error('Error al cargar plantillas')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ nombre: '', descripcion: '' })
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch(`/api/configuracion/plantillas-organigrama/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error()
        toast.success('Plantilla actualizada')
      } else {
        const res = await fetch('/api/configuracion/plantillas-organigrama', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error()
        const nueva = await res.json()
        toast.success('Plantilla creada')
        setShowForm(false)
        resetForm()
        // Navegar al editor de nodos inmediatamente
        router.push(`/configuracion/plantillas-organigrama/${nueva.id}`)
        return
      }
      setShowForm(false)
      resetForm()
      loadPlantillas()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (p: Plantilla) => {
    setEditingId(p.id)
    setFormData({ nombre: p.nombre, descripcion: p.descripcion ?? '' })
    setShowForm(true)
  }

  const handleDuplicate = async (p: Plantilla) => {
    try {
      // Crear nueva plantilla con mismo nombre + "(copia)"
      const res = await fetch('/api/configuracion/plantillas-organigrama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: `${p.nombre} (copia)`, descripcion: p.descripcion }),
      })
      if (!res.ok) throw new Error()
      const nueva = await res.json()

      // Copiar nodos de la plantilla original
      const detRes = await fetch(`/api/configuracion/plantillas-organigrama/${p.id}`)
      if (!detRes.ok) throw new Error()
      const detalle = await detRes.json()

      // Copiar en orden topológico
      const idMap: Record<string, string> = {}
      const nodos = [...detalle.nodos].sort((a: any, b: any) => {
        if (!a.parentId) return -1
        if (!b.parentId) return 1
        return 0
      })
      for (const nodo of nodos) {
        const nRes = await fetch(`/api/configuracion/plantillas-organigrama/${nueva.id}/nodos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cargoLabel: nodo.cargoLabel,
            parentId: nodo.parentId ? idMap[nodo.parentId] : null,
            orden: nodo.orden,
            recursoId: nodo.recursoId,
            esObligatorio: nodo.esObligatorio,
          }),
        })
        if (nRes.ok) {
          const created = await nRes.json()
          idMap[nodo.id] = created.id
        }
      }

      toast.success('Plantilla duplicada')
      loadPlantillas()
    } catch {
      toast.error('Error al duplicar plantilla')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/configuracion/plantillas-organigrama/${deletingId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Plantilla eliminada')
      loadPlantillas()
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setShowDeleteDialog(false)
      setDeletingId(null)
    }
  }

  const filtered = plantillas.filter(p =>
    !search || normalizeStr(p.nombre).includes(normalizeStr(search))
  )

  const deletingPlantilla = plantillas.find(p => p.id === deletingId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 rounded-xl">
              <GitBranch className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Plantillas de Organigrama</h1>
              <p className="text-muted-foreground">
                Define estructuras de equipo reutilizables para tus proyectos
              </p>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{plantillas.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar plantillas..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
                {search && (
                  <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setSearch('')}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Button onClick={() => { resetForm(); setShowForm(true) }} className="h-9">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Plantilla
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay plantillas</h3>
                <p className="text-muted-foreground mb-4">
                  Crea una plantilla para definir la estructura de equipo de tus proyectos
                </p>
                <Button onClick={() => { resetForm(); setShowForm(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Plantilla
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[80px] text-center">Nodos</TableHead>
                    <TableHead className="w-[80px] text-center">Estado</TableHead>
                    <TableHead className="w-[140px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/configuracion/plantillas-organigrama/${p.id}`)}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[240px] truncate">
                        {p.descripcion || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{p._count.nodos}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={p.activo ? 'default' : 'secondary'}>
                          {p.activo ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(p)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar nombre</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDuplicate(p)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                onClick={() => { setDeletingId(p.id); setShowDeleteDialog(true) }}
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
        <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); resetForm() } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                {editingId ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Proyecto estándar NEXA"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Estructura de equipo para proyectos de automatización industrial"
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm() }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingId ? 'Guardar' : 'Crear y editar nodos →'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar plantilla</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              ¿Eliminar <strong>{deletingPlantilla?.nombre}</strong>? Esta acción no se puede deshacer.
              Los organigramas de proyectos ya generados <strong>no se verán afectados</strong>.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
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
