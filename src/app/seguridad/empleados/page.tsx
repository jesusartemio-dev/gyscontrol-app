'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Pencil, Search } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Empleado {
  id: string
  documentoIdentidad: string | null
  activo: boolean
  tallaCamisa: string | null
  tallaPantalon: string | null
  tallaCalzado: string | null
  tallaCasco: string | null
  cargo: { nombre: string } | null
  departamento: { nombre: string } | null
  user: { id: string; name: string; email: string }
}

export default function EmpleadosEppPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Empleado | null>(null)
  const [draft, setDraft] = useState({ tallaCamisa: '', tallaPantalon: '', tallaCalzado: '', tallaCasco: '' })
  const [saving, setSaving] = useState(false)

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/empleado')
      if (!res.ok) throw new Error()
      setEmpleados(await res.json())
    } catch {
      toast.error('Error al cargar empleados')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { cargar() }, [])

  const filtrados = empleados.filter(e => {
    if (!e.activo) return false
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      e.user.name.toLowerCase().includes(q) ||
      (e.documentoIdentidad || '').toLowerCase().includes(q) ||
      (e.cargo?.nombre || '').toLowerCase().includes(q)
    )
  })

  const abrirEdicion = (e: Empleado) => {
    setEditando(e)
    setDraft({
      tallaCamisa: e.tallaCamisa ?? '',
      tallaPantalon: e.tallaPantalon ?? '',
      tallaCalzado: e.tallaCalzado ?? '',
      tallaCasco: e.tallaCasco ?? '',
    })
  }

  const guardar = async () => {
    if (!editando) return
    setSaving(true)
    try {
      const res = await fetch(`/api/empleado/${editando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tallaCamisa: draft.tallaCamisa.trim() || null,
          tallaPantalon: draft.tallaPantalon.trim() || null,
          tallaCalzado: draft.tallaCalzado.trim() || null,
          tallaCasco: draft.tallaCasco.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al guardar tallas')
      }
      toast.success('Tallas actualizadas')
      setEditando(null)
      cargar()
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/seguridad"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold">Empleados</h1>
          <p className="text-sm text-muted-foreground">Tallas registradas para asignación de EPPs</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Nombre, DNI o cargo..." className="pl-8" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtrados.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Sin empleados</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Cargo / Depto</TableHead>
                  <TableHead>Tallas</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{e.user.name}</div>
                      <div className="text-[10px] text-muted-foreground">{e.user.email}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{e.documentoIdentidad || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {e.cargo?.nombre || '—'}
                      {e.departamento && <div className="text-[10px] text-muted-foreground">{e.departamento.nombre}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {e.tallaCamisa && <Badge variant="secondary" className="text-[10px]">Camisa: {e.tallaCamisa}</Badge>}
                        {e.tallaPantalon && <Badge variant="secondary" className="text-[10px]">Pantalón: {e.tallaPantalon}</Badge>}
                        {e.tallaCalzado && <Badge variant="secondary" className="text-[10px]">Calzado: {e.tallaCalzado}</Badge>}
                        {e.tallaCasco && <Badge variant="secondary" className="text-[10px]">Casco: {e.tallaCasco}</Badge>}
                        {!e.tallaCamisa && !e.tallaPantalon && !e.tallaCalzado && !e.tallaCasco && (
                          <span className="text-[10px] text-amber-600">Sin tallas</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicion(e)}>
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

      <Dialog open={!!editando} onOpenChange={v => !v && setEditando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tallas de {editando?.user.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Camisa</Label>
              <Input value={draft.tallaCamisa} onChange={e => setDraft(d => ({ ...d, tallaCamisa: e.target.value }))} placeholder="S/M/L/XL" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pantalón</Label>
              <Input value={draft.tallaPantalon} onChange={e => setDraft(d => ({ ...d, tallaPantalon: e.target.value }))} placeholder="28-44" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Calzado</Label>
              <Input value={draft.tallaCalzado} onChange={e => setDraft(d => ({ ...d, tallaCalzado: e.target.value }))} placeholder="36-46" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Casco</Label>
              <Input value={draft.tallaCasco} onChange={e => setDraft(d => ({ ...d, tallaCasco: e.target.value }))} placeholder="S/M/L" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={guardar} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
