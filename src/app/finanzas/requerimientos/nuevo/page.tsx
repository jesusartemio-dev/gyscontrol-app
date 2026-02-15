'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { getCentrosCosto } from '@/lib/services/centroCosto'
import { createHojaDeGastos } from '@/lib/services/hojaDeGastos'
import type { CentroCosto } from '@/types'

export default function NuevoRequerimientoPage() {
  const router = useRouter()
  const [centros, setCentros] = useState<CentroCosto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [centroCostoId, setCentroCostoId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [requiereAnticipo, setRequiereAnticipo] = useState(false)
  const [montoAnticipo, setMontoAnticipo] = useState('')

  useEffect(() => {
    getCentrosCosto({ activo: true })
      .then(setCentros)
      .catch(() => toast.error('Error al cargar centros de costo'))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!centroCostoId || !motivo.trim()) {
      toast.error('Complete los campos obligatorios')
      return
    }

    try {
      setSaving(true)
      const hoja = await createHojaDeGastos({
        centroCostoId,
        motivo: motivo.trim(),
        observaciones: observaciones.trim() || undefined,
        requiereAnticipo,
        montoAnticipo: requiereAnticipo ? parseFloat(montoAnticipo) || 0 : 0,
      })
      toast.success(`Requerimiento ${hoja.numero} creado`)
      router.push(`/finanzas/requerimientos/${hoja.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear requerimiento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-2xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/finanzas/requerimientos')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-amber-600" />
          Nuevo Requerimiento de Dinero
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Centro de Costo <span className="text-red-500">*</span></Label>
              <Select value={centroCostoId} onValueChange={setCentroCostoId} disabled={loading || saving}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? 'Cargando...' : 'Seleccionar centro de costo'} />
                </SelectTrigger>
                <SelectContent>
                  {centros.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        {c.nombre}
                        <span className="text-xs text-muted-foreground capitalize">({c.tipo})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Motivo <span className="text-red-500">*</span></Label>
              <Input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Gastos de movilidad proyecto XYZ"
                disabled={saving}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas adicionales (opcional)"
                rows={3}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <Label className="text-sm font-medium">Requiere anticipo de dinero</Label>
                <p className="text-xs text-muted-foreground">Marcar si necesitas recibir dinero antes de los gastos</p>
              </div>
              <Switch
                checked={requiereAnticipo}
                onCheckedChange={setRequiereAnticipo}
                disabled={saving}
              />
            </div>

            {requiereAnticipo && (
              <div className="space-y-1.5">
                <Label>Monto de anticipo (PEN)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoAnticipo}
                  onChange={(e) => setMontoAnticipo(e.target.value)}
                  placeholder="0.00"
                  disabled={saving}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !centroCostoId || !motivo.trim()} className="bg-amber-600 hover:bg-amber-700">
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Crear Requerimiento
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
