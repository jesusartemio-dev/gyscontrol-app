'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, RefreshCw, Building2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface ProyectoInterno {
  id: string
  codigo: string
  nombre: string
  estado: string
  centroCosto: { id: string; nombre: string } | null
  gestor: { id: string; name: string } | null
  createdAt: string
}

interface CentroCosto {
  id: string
  nombre: string
  tipo: string
}

interface Usuario {
  id: string
  name: string
  role: string
}

const ESTADO_LABELS: Record<string, string> = {
  en_ejecucion: 'Activo',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
}

const ESTADO_COLORS: Record<string, string> = {
  en_ejecucion: 'bg-green-100 text-green-800',
  cerrado: 'bg-gray-100 text-gray-700',
  cancelado: 'bg-red-100 text-red-700',
}

export default function ProyectosInternosPage() {
  const [proyectos, setProyectos] = useState<ProyectoInterno[]>([])
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<ProyectoInterno | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ nombre: '', codigo: '', centroCostoId: '', gestorId: '', fechaInicio: '' })

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/administracion/proyectos-internos')
      const data = await res.json()
      setProyectos(data.data || [])
      setCentrosCosto(data.centrosCosto || [])
      setUsuarios(data.usuarios || [])
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarDatos() }, [])

  const abrirCrear = () => {
    setEditando(null)
    setForm({ nombre: '', codigo: '', centroCostoId: '', gestorId: '', fechaInicio: format(new Date(), 'yyyy-MM-dd') })
    setShowModal(true)
  }

  const abrirEditar = (p: ProyectoInterno) => {
    setEditando(p)
    setForm({ nombre: p.nombre, codigo: '', centroCostoId: p.centroCosto?.id || '', gestorId: p.gestor?.id || '', fechaInicio: '' })
    setShowModal(true)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return }
    if (!form.centroCostoId) { toast.error('El Centro de Costos es requerido'); return }
    if (!form.gestorId) { toast.error('El responsable es requerido'); return }

    try {
      setGuardando(true)
      const url = editando
        ? `/api/administracion/proyectos-internos/${editando.id}`
        : '/api/administracion/proyectos-internos'
      const method = editando ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, codigoPersonalizado: form.codigo }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Error al guardar')
        return
      }

      toast.success(editando ? 'Proyecto actualizado' : 'Proyecto interno creado')
      setShowModal(false)
      cargarDatos()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const cambiarEstado = async (p: ProyectoInterno, estado: string) => {
    try {
      const res = await fetch(`/api/administracion/proyectos-internos/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      })
      if (!res.ok) { toast.error('Error al cambiar estado'); return }
      toast.success('Estado actualizado')
      cargarDatos()
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-emerald-600" />
            Proyectos Internos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Proyectos administrativos imputados a un Centro de Costos (sin cronograma de planificación)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargarDatos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button size="sm" onClick={abrirCrear} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proyectos ({proyectos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : proyectos.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No hay proyectos internos creados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Centro de Costos</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proyectos.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm font-medium">{p.codigo}</TableCell>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell>
                      {p.centroCosto ? (
                        <span className="text-sm text-emerald-700 bg-emerald-50 rounded px-2 py-0.5">
                          {p.centroCosto.nombre}
                        </span>
                      ) : <span className="text-gray-400 text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">{p.gestor?.name || '—'}</TableCell>
                    <TableCell>
                      <Select value={p.estado} onValueChange={(v) => cambiarEstado(p, v)}>
                        <SelectTrigger className={`h-7 w-[110px] text-xs border-0 ${ESTADO_COLORS[p.estado] || 'bg-gray-100'}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en_ejecucion">Activo</SelectItem>
                          <SelectItem value="cerrado">Cerrado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {format(new Date(p.createdAt), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => abrirEditar(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal crear/editar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-emerald-700 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {editando ? 'Editar Proyecto Interno' : 'Nuevo Proyecto Interno'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500">Nombre *</Label>
              <Input
                placeholder="Ej: Mantenimiento Oficinas"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="h-9"
              />
            </div>

            {!editando && (
              <div>
                <Label className="text-xs text-gray-500">Código <span className="text-gray-400">(opcional — se auto-genera si se deja vacío)</span></Label>
                <Input
                  placeholder="Ej: GYS.PRY o INT-001"
                  value={form.codigo}
                  onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                  className="h-9 font-mono"
                />
              </div>
            )}

            <div>
              <Label className="text-xs text-gray-500">Centro de Costos *</Label>
              <Select value={form.centroCostoId || '__none__'} onValueChange={v => setForm({ ...form, centroCostoId: v === '__none__' ? '' : v })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccionar...</SelectItem>
                  {centrosCosto.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-gray-500">Responsable *</Label>
              <Select value={form.gestorId || '__none__'} onValueChange={v => setForm({ ...form, gestorId: v === '__none__' ? '' : v })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccionar...</SelectItem>
                  {usuarios.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editando && (
              <div>
                <Label className="text-xs text-gray-500">Fecha de inicio</Label>
                <Input
                  type="date"
                  value={form.fechaInicio}
                  onChange={e => setForm({ ...form, fechaInicio: e.target.value })}
                  className="h-9"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button size="sm" onClick={guardar} disabled={guardando} className="bg-emerald-600 hover:bg-emerald-700">
              {guardando ? <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
              {editando ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
