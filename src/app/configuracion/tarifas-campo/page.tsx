'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, DollarSign, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  getTarifasCampo,
  createTarifaCampo,
  updateTarifaCampo,
  deleteTarifaCampo,
  type TarifaCampoPersonal,
} from '@/lib/services/tarifaCampo'
import { getClientes } from '@/lib/services/cliente'
import { getUsuarios, type Usuario } from '@/lib/services/usuario'
import type { Cliente } from '@/types/modelos'

export default function TarifasCampoPage() {
  const [tarifas, setTarifas] = useState<TarifaCampoPersonal[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [clienteFiltro, setClienteFiltro] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<TarifaCampoPersonal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TarifaCampoPersonal | null>(null)

  const [clienteId, setClienteId] = useState('')
  const [userId, setUserId] = useState('')
  const [costoAlmuerzo, setCostoAlmuerzo] = useState('')
  const [costoMovilidad, setCostoMovilidad] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [tarifasData, clientesData, usuariosData] = await Promise.all([
        getTarifasCampo(),
        getClientes(),
        getUsuarios(),
      ])
      setTarifas(tarifasData)
      setClientes(clientesData)
      setUsuarios(usuariosData)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar tarifas de campo')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let result = tarifas
    if (clienteFiltro !== 'all') result = result.filter(t => t.clienteId === clienteFiltro)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        t =>
          t.usuario.name?.toLowerCase().includes(term) ||
          t.usuario.email.toLowerCase().includes(term) ||
          t.cliente.nombre.toLowerCase().includes(term)
      )
    }
    return result
  }, [tarifas, clienteFiltro, searchTerm])

  const resetForm = () => {
    setClienteId(clienteFiltro !== 'all' ? clienteFiltro : '')
    setUserId('')
    setCostoAlmuerzo('')
    setCostoMovilidad('')
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (item: TarifaCampoPersonal) => {
    setEditing(item)
    setClienteId(item.clienteId)
    setUserId(item.userId)
    setCostoAlmuerzo(String(item.costoAlmuerzo))
    setCostoMovilidad(String(item.costoMovilidad))
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!editing && (!clienteId || !userId)) {
      toast.error('Selecciona cliente y persona')
      return
    }
    const almuerzo = Number(costoAlmuerzo)
    const movilidad = Number(costoMovilidad)
    if (!Number.isFinite(almuerzo) || almuerzo < 0 || !Number.isFinite(movilidad) || movilidad < 0) {
      toast.error('Los montos deben ser números válidos mayores o iguales a 0')
      return
    }
    try {
      setSaving(true)
      if (editing) {
        await updateTarifaCampo(editing.id, { costoAlmuerzo: almuerzo, costoMovilidad: movilidad })
        toast.success('Tarifa actualizada')
      } else {
        await createTarifaCampo({ clienteId, userId, costoAlmuerzo: almuerzo, costoMovilidad: movilidad })
        toast.success('Tarifa creada')
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
      await deleteTarifaCampo(deleteTarget.id)
      toast.success('Tarifa desactivada')
      setDeleteTarget(null)
      loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al desactivar')
    }
  }

  const activos = tarifas.filter(t => t.activo).length

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Tarifas de Campo
          </h1>
          <p className="text-sm text-muted-foreground">
            Costo de almuerzo y movilidad (ida y vuelta) por persona y cliente — se usa para prellenar el
            &quot;Requerimiento del día&quot; en Gastos. {tarifas.length} tarifas · {activos} activas
          </p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" />
          Agregar persona
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar persona o cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2.5">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
          <SelectTrigger className="w-[220px] h-9">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {clientes.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron tarifas de campo
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Almuerzo</TableHead>
                  <TableHead>Movilidad (ida y vuelta)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.usuario.name || item.usuario.email}</TableCell>
                    <TableCell>{item.cliente.nombre}</TableCell>
                    <TableCell>S/ {item.costoAlmuerzo.toFixed(2)}</TableCell>
                    <TableCell>S/ {item.costoMovilidad.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={item.activo ? 'default' : 'secondary'} className="text-xs">
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(item)} className="p-1 rounded hover:bg-muted">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
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

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              {editing ? 'Editar Tarifa' : 'Agregar Persona'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Modifica los montos de almuerzo y movilidad.'
                : 'Configura el costo de almuerzo y movilidad para una persona en un cliente.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label>Cliente <span className="text-red-500">*</span></Label>
                  <Select value={clienteId} onValueChange={setClienteId} disabled={saving}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Persona <span className="text-red-500">*</span></Label>
                  <Select value={userId} onValueChange={setUserId} disabled={saving}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una persona" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {editing && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <div className="font-medium">{editing.usuario.name || editing.usuario.email}</div>
                <div className="text-muted-foreground">{editing.cliente.nombre}</div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Costo de almuerzo (S/) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={costoAlmuerzo}
                onChange={(e) => setCostoAlmuerzo(e.target.value)}
                placeholder="0.00"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Costo de movilidad, ida y vuelta (S/) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={costoMovilidad}
                onChange={(e) => setCostoMovilidad(e.target.value)}
                placeholder="0.00"
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar Tarifa</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desactivar la tarifa de &quot;{deleteTarget?.usuario.name || deleteTarget?.usuario.email}&quot; para{' '}
              &quot;{deleteTarget?.cliente.nombre}&quot;? Ya no se usará para prellenar nuevos requerimientos del día,
              pero se conserva para trazabilidad de los ya creados.
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
