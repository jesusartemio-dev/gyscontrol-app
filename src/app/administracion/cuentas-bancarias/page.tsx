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
import { Switch } from '@/components/ui/switch'
import { Plus, Edit, Landmark, Loader2, Search } from 'lucide-react'
import toast from 'react-hot-toast'

interface CuentaBancaria {
  id: string
  nombreBanco: string
  numeroCuenta: string
  cci: string | null
  tipo: string
  moneda: string
  activa: boolean
  descripcion: string | null
  createdAt: string
  updatedAt: string
}

const TIPOS_CUENTA = [
  { value: 'corriente', label: 'Corriente' },
  { value: 'ahorro', label: 'Ahorro' },
]

const MONEDAS = [
  { value: 'PEN', label: 'Soles (PEN)' },
  { value: 'USD', label: 'Dólares (USD)' },
]

export default function CuentasBancariasPage() {
  const [items, setItems] = useState<CuentaBancaria[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CuentaBancaria | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMoneda, setFilterMoneda] = useState<string>('all')

  // Form fields
  const [nombreBanco, setNombreBanco] = useState('')
  const [numeroCuenta, setNumeroCuenta] = useState('')
  const [cci, setCci] = useState('')
  const [tipo, setTipo] = useState('corriente')
  const [moneda, setMoneda] = useState('PEN')
  const [descripcion, setDescripcion] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/administracion/cuentas-bancarias')
      if (!res.ok) throw new Error()
      setItems(await res.json())
    } catch {
      toast.error('Error al cargar cuentas bancarias')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let result = items
    if (filterMoneda !== 'all') result = result.filter(i => i.moneda === filterMoneda)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(i =>
        i.nombreBanco.toLowerCase().includes(term) ||
        i.numeroCuenta.includes(term) ||
        i.descripcion?.toLowerCase().includes(term)
      )
    }
    return result
  }, [items, filterMoneda, searchTerm])

  const resetForm = () => {
    setNombreBanco('')
    setNumeroCuenta('')
    setCci('')
    setTipo('corriente')
    setMoneda('PEN')
    setDescripcion('')
    setEditing(null)
  }

  const openCreate = () => { resetForm(); setShowForm(true) }

  const openEdit = (item: CuentaBancaria) => {
    setEditing(item)
    setNombreBanco(item.nombreBanco)
    setNumeroCuenta(item.numeroCuenta)
    setCci(item.cci || '')
    setTipo(item.tipo)
    setMoneda(item.moneda)
    setDescripcion(item.descripcion || '')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!nombreBanco.trim() || !numeroCuenta.trim()) {
      toast.error('Banco y número de cuenta son requeridos')
      return
    }
    setSaving(true)
    try {
      const payload = { nombreBanco, numeroCuenta, cci: cci || null, tipo, moneda, descripcion: descripcion || null }
      const res = editing
        ? await fetch(`/api/administracion/cuentas-bancarias/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/administracion/cuentas-bancarias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

      if (!res.ok) throw new Error()
      toast.success(editing ? 'Cuenta actualizada' : 'Cuenta creada')
      setShowForm(false)
      resetForm()
      loadData()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const toggleActiva = async (item: CuentaBancaria) => {
    try {
      const res = await fetch(`/api/administracion/cuentas-bancarias/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activa: !item.activa }),
      })
      if (!res.ok) throw new Error()
      toast.success(item.activa ? 'Cuenta desactivada' : 'Cuenta activada')
      loadData()
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cuentas Bancarias</h1>
          <p className="text-muted-foreground">Gestiona las cuentas bancarias de la empresa</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cuenta
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar banco, cuenta..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterMoneda} onValueChange={setFilterMoneda}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="PEN">Soles</SelectItem>
            <SelectItem value="USD">Dólares</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>N° Cuenta</TableHead>
                <TableHead>CCI</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-center">Activa</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Landmark className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No hay cuentas bancarias registradas
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(item => (
                  <TableRow key={item.id} className={!item.activa ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{item.nombreBanco}</TableCell>
                    <TableCell className="font-mono text-sm">{item.numeroCuenta}</TableCell>
                    <TableCell className="font-mono text-sm">{item.cci || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{item.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.moneda === 'USD' ? 'default' : 'secondary'}>{item.moneda}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.descripcion || '—'}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={item.activa} onCheckedChange={() => toggleActiva(item)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog crear/editar */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); resetForm() } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Modifica los datos de la cuenta bancaria' : 'Registra una nueva cuenta bancaria de la empresa'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Banco *</Label>
              <Input placeholder="Ej: BCP, BBVA, Interbank..." value={nombreBanco} onChange={e => setNombreBanco(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>N° Cuenta *</Label>
                <Input placeholder="Número de cuenta" value={numeroCuenta} onChange={e => setNumeroCuenta(e.target.value)} />
              </div>
              <div>
                <Label>CCI</Label>
                <Input placeholder="Código interbancario" value={cci} onChange={e => setCci(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_CUENTA.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Moneda</Label>
                <Select value={moneda} onValueChange={setMoneda}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONEDAS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input placeholder="Ej: Cuenta principal operaciones" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
