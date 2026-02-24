'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Plus, Loader2, DollarSign, BarChart3, Info } from 'lucide-react'
import { toast } from 'sonner'
import type { TarifaClienteRecurso, ConfigDescuentoHH, Recurso } from '@/types'

interface TarifasHHProps {
  clienteId: string
  clienteNombre: string
}

export default function TarifasHH({ clienteId, clienteNombre }: TarifasHHProps) {
  const [tarifas, setTarifas] = useState<TarifaClienteRecurso[]>([])
  const [descuentos, setDescuentos] = useState<ConfigDescuentoHH[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [loading, setLoading] = useState(true)

  // Form state for new tarifa
  const [newRecursoId, setNewRecursoId] = useState('')
  const [newModalidad, setNewModalidad] = useState<'oficina' | 'campo'>('oficina')
  const [newTarifa, setNewTarifa] = useState('')
  const [newMoneda, setNewMoneda] = useState('USD')
  const [savingTarifa, setSavingTarifa] = useState(false)

  // Form state for new descuento
  const [newDesdeHoras, setNewDesdeHoras] = useState('')
  const [newDescuentoPct, setNewDescuentoPct] = useState('')
  const [savingDescuento, setSavingDescuento] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [clienteId])

  async function loadData() {
    setLoading(true)
    try {
      const [tarifasRes, recursosRes] = await Promise.all([
        fetch(`/api/clientes/${clienteId}/tarifas-hh`),
        fetch('/api/recurso'),
      ])

      if (tarifasRes.ok) {
        const data = await tarifasRes.json()
        setTarifas(data.tarifas || [])
        setDescuentos(data.descuentos || [])
      }

      if (recursosRes.ok) {
        const recursosData = await recursosRes.json()
        setRecursos(Array.isArray(recursosData) ? recursosData.filter((r: Recurso) => r.activo) : [])
      }
    } catch (error) {
      console.error('Error cargando tarifas:', error)
      toast.error('Error al cargar tarifas')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTarifa() {
    if (!newRecursoId || !newTarifa) {
      toast.error('Selecciona un recurso e ingresa la tarifa')
      return
    }

    setSavingTarifa(true)
    try {
      const res = await fetch(`/api/clientes/${clienteId}/tarifas-hh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'tarifa',
          recursoId: newRecursoId,
          modalidad: newModalidad,
          tarifaVenta: parseFloat(newTarifa),
          moneda: newMoneda,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }

      const tarifa = await res.json()
      // Upsert: replace existing or add new
      setTarifas(prev => {
        const idx = prev.findIndex(
          t => t.recursoId === tarifa.recursoId && t.modalidad === tarifa.modalidad
        )
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = tarifa
          return updated
        }
        return [...prev, tarifa]
      })

      setNewRecursoId('')
      setNewTarifa('')
      toast.success('Tarifa guardada')
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar tarifa')
    } finally {
      setSavingTarifa(false)
    }
  }

  async function handleAddDescuento() {
    if (!newDesdeHoras || !newDescuentoPct) {
      toast.error('Ingresa umbral de horas y porcentaje de descuento')
      return
    }

    const pctValue = parseFloat(newDescuentoPct)
    if (pctValue <= 0 || pctValue > 100) {
      toast.error('El porcentaje debe estar entre 0.1 y 100')
      return
    }

    setSavingDescuento(true)
    try {
      const res = await fetch(`/api/clientes/${clienteId}/tarifas-hh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'descuento',
          desdeHoras: parseFloat(newDesdeHoras),
          descuentoPct: pctValue / 100, // Convert to fraction
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }

      const descuento = await res.json()
      setDescuentos(prev => [...prev, descuento].sort((a, b) => a.orden - b.orden))

      setNewDesdeHoras('')
      setNewDescuentoPct('')
      toast.success('Descuento agregado')
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar descuento')
    } finally {
      setSavingDescuento(false)
    }
  }

  async function handleDeleteTarifa(tarifaId: string) {
    setDeletingId(tarifaId)
    try {
      const res = await fetch(`/api/clientes/${clienteId}/tarifas-hh?tarifaId=${tarifaId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Error al eliminar')
      setTarifas(prev => prev.filter(t => t.id !== tarifaId))
      toast.success('Tarifa eliminada')
    } catch {
      toast.error('Error al eliminar tarifa')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDeleteDescuento(descuentoId: string) {
    setDeletingId(descuentoId)
    try {
      const res = await fetch(`/api/clientes/${clienteId}/tarifas-hh?descuentoId=${descuentoId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Error al eliminar')
      setDescuentos(prev => prev.filter(d => d.id !== descuentoId))
      toast.success('Descuento eliminado')
    } catch {
      toast.error('Error al eliminar descuento')
    } finally {
      setDeletingId(null)
    }
  }

  // Calculate cumulative discount examples
  const ejemplosDescuento = useMemo(() => {
    if (descuentos.length === 0) return []

    const sortedDesc = [...descuentos].sort((a, b) => a.desdeHoras - b.desdeHoras)
    const ejemplos: { horas: number; pctTotal: number }[] = []

    // Generate examples: midpoints between thresholds + one above the last
    for (let i = 0; i < sortedDesc.length; i++) {
      const hh = i < sortedDesc.length - 1
        ? Math.round((sortedDesc[i].desdeHoras + sortedDesc[i + 1].desdeHoras) / 2)
        : Math.round(sortedDesc[i].desdeHoras * 1.5)

      let pctTotal = 0
      for (const d of sortedDesc) {
        if (hh >= d.desdeHoras) pctTotal += d.descuentoPct
      }

      ejemplos.push({ horas: hh, pctTotal })
    }

    return ejemplos
  }, [descuentos])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-muted-foreground">Cargando tarifas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Tarifas por Recurso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Tarifas HH por Recurso
          </CardTitle>
          <CardDescription>
            Precio de venta al cliente por hora trabajada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tarifas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recurso</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead className="text-right">Tarifa/Hora</TableHead>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tarifas.map(tarifa => (
                  <TableRow key={tarifa.id}>
                    <TableCell className="font-medium">
                      {tarifa.recurso?.nombre || tarifa.recursoNombre || '—'}
                      {tarifa.recurso?.tipo === 'cuadrilla' && (
                        <Badge variant="outline" className="ml-2 text-xs">Cuadrilla</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tarifa.modalidad === 'campo' ? 'default' : 'secondary'}>
                        {tarifa.modalidad === 'campo' ? 'Campo' : 'Oficina'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-green-700">
                      {tarifa.moneda} ${tarifa.tarifaVenta.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTarifa(tarifa.id)}
                        disabled={deletingId === tarifa.id}
                      >
                        {deletingId === tarifa.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4 text-destructive" />
                        }
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Sin tarifas configuradas. Agrega la primera tarifa.
            </div>
          )}

          {/* Add tarifa form */}
          <div className="flex flex-wrap items-end gap-3 pt-2 border-t">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Recurso</Label>
              <Select value={newRecursoId} onValueChange={setNewRecursoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar recurso..." />
                </SelectTrigger>
                <SelectContent>
                  {recursos.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nombre} {r.tipo === 'cuadrilla' ? '(Cuadrilla)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[130px]">
              <Label className="text-xs">Modalidad</Label>
              <Select value={newModalidad} onValueChange={(v) => setNewModalidad(v as 'oficina' | 'campo')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oficina">Oficina</SelectItem>
                  <SelectItem value="campo">Campo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[120px]">
              <Label className="text-xs">Tarifa/Hora</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="25.00"
                value={newTarifa}
                onChange={e => setNewTarifa(e.target.value)}
              />
            </div>
            <div className="w-[90px]">
              <Label className="text-xs">Moneda</Label>
              <Select value={newMoneda} onValueChange={setNewMoneda}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="PEN">PEN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddTarifa} disabled={savingTarifa || !newRecursoId || !newTarifa}>
              {savingTarifa ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Descuentos por Volumen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Descuentos por Volumen
          </CardTitle>
          <CardDescription>
            Se aplican acumulativamente sobre el subtotal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {descuentos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Desde (HH)</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {descuentos.map((d, i) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      &gt; {d.desdeHoras} HH
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {i === 0
                          ? `${Math.round(d.descuentoPct * 100)}%`
                          : `${Math.round(d.descuentoPct * 100)}% adicional`
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      Acumulativo
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDescuento(d.id)}
                        disabled={deletingId === d.id}
                      >
                        {deletingId === d.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4 text-destructive" />
                        }
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Sin descuentos configurados. Los descuentos son opcionales.
            </div>
          )}

          {/* Examples info box */}
          {ejemplosDescuento.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Ejemplos de descuento acumulativo:</span>
                <ul className="mt-1 space-y-0.5">
                  {ejemplosDescuento.map((ej, i) => (
                    <li key={i} className="text-sm">
                      Con {ej.horas} HH equivalentes: <strong>{Math.round(ej.pctTotal * 100)}%</strong> de descuento
                      {descuentos.length > 1 && i > 0 && (
                        <span className="text-muted-foreground">
                          {' '}({descuentos.filter(d => ej.horas >= d.desdeHoras).map(d => `${Math.round(d.descuentoPct * 100)}%`).join('+')})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Add descuento form */}
          <div className="flex flex-wrap items-end gap-3 pt-2 border-t">
            <div className="w-[150px]">
              <Label className="text-xs">Desde (HH)</Label>
              <Input
                type="number"
                step="1"
                min="1"
                placeholder="100"
                value={newDesdeHoras}
                onChange={e => setNewDesdeHoras(e.target.value)}
              />
            </div>
            <div className="w-[150px]">
              <Label className="text-xs">Descuento (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                placeholder="10"
                value={newDescuentoPct}
                onChange={e => setNewDescuentoPct(e.target.value)}
              />
            </div>
            <Button onClick={handleAddDescuento} disabled={savingDescuento || !newDesdeHoras || !newDescuentoPct}>
              {savingDescuento ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
