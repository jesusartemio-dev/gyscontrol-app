'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Ship, Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { editarAdministrativoOC } from '@/lib/services/ordenCompra'
import type { OrdenCompra } from '@/types'

const CAMPOS_COSTO = [
  { key: 'arancelMonto', label: 'Arancel' },
  { key: 'igvAduanaMonto', label: 'IGV de aduana' },
  { key: 'fleteMonto', label: 'Flete' },
  { key: 'seguroMonto', label: 'Seguro' },
  { key: 'gastosAgenteMonto', label: 'Gastos de agente de aduana' },
] as const

const formatCurrency = (amount: number, moneda = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

interface Props {
  oc: OrdenCompra
  puedeEditar: boolean
  onSaved: () => void
}

/** 'nacional' | 'extranjero' | null — el override de la OC manda sobre el proveedor. */
export const getOrigenOc = (oc: OrdenCompra): string | null =>
  oc.tipoCompraOverride ?? oc.proveedor?.tipoProveedor ?? null

export default function CostosImportacionCard({ oc, puedeEditar, onSaved }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    tipoCompraOverride: oc.tipoCompraOverride ?? '__inherit__',
    arancelMonto: oc.arancelMonto?.toString() ?? '',
    igvAduanaMonto: oc.igvAduanaMonto?.toString() ?? '',
    fleteMonto: oc.fleteMonto?.toString() ?? '',
    seguroMonto: oc.seguroMonto?.toString() ?? '',
    gastosAgenteMonto: oc.gastosAgenteMonto?.toString() ?? '',
  })

  const origen = getOrigenOc(oc)
  const costos = CAMPOS_COSTO.map(c => ({ ...c, valor: (oc as any)[c.key] as number | null }))
  const sumaCostos = costos.reduce((s, c) => s + (c.valor || 0), 0)
  const costoRealTotal = oc.total + sumaCostos

  // OC nacional sin costos cargados y sin permiso de edición: nada que mostrar.
  if (!editing && origen !== 'extranjero' && sumaCostos === 0 && !puedeEditar) return null

  const openEdit = () => {
    setForm({
      tipoCompraOverride: oc.tipoCompraOverride ?? '__inherit__',
      arancelMonto: oc.arancelMonto?.toString() ?? '',
      igvAduanaMonto: oc.igvAduanaMonto?.toString() ?? '',
      fleteMonto: oc.fleteMonto?.toString() ?? '',
      seguroMonto: oc.seguroMonto?.toString() ?? '',
      gastosAgenteMonto: oc.gastosAgenteMonto?.toString() ?? '',
    })
    setEditing(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      await editarAdministrativoOC(oc.id, {
        tipoCompraOverride: form.tipoCompraOverride === '__inherit__' ? null : form.tipoCompraOverride,
        arancelMonto: form.arancelMonto === '' ? null : Number(form.arancelMonto),
        igvAduanaMonto: form.igvAduanaMonto === '' ? null : Number(form.igvAduanaMonto),
        fleteMonto: form.fleteMonto === '' ? null : Number(form.fleteMonto),
        seguroMonto: form.seguroMonto === '' ? null : Number(form.seguroMonto),
        gastosAgenteMonto: form.gastosAgenteMonto === '' ? null : Number(form.gastosAgenteMonto),
      })
      toast.success('Costos de importación actualizados')
      setEditing(false)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!editing && origen !== 'extranjero' && sumaCostos === 0) {
    // OC nacional, sin costos cargados: solo ofrecer la excepción si hay permiso.
    return (
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Ship className="h-4 w-4 text-muted-foreground" />
            Costos de Importación
          </CardTitle>
          {puedeEditar && (
            <Button variant="ghost" size="sm" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Marcar como importación
            </Button>
          )}
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Ship className="h-4 w-4 text-sky-600" />
          Costos de Importación
        </CardTitle>
        {puedeEditar && !editing && (
          <Button variant="ghost" size="sm" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
          </Button>
        )}
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Clasificación de esta OC</Label>
              <Select
                value={form.tipoCompraOverride}
                onValueChange={v => setForm(f => ({ ...f, tipoCompraOverride: v }))}
              >
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__inherit__">
                    Heredar del proveedor {oc.proveedor?.tipoProveedor ? `(${oc.proveedor.tipoProveedor})` : '(sin clasificar)'}
                  </SelectItem>
                  <SelectItem value="nacional">Forzar Nacional</SelectItem>
                  <SelectItem value="extranjero">Forzar Importación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {CAMPOS_COSTO.map(c => (
              <div key={c.key} className="grid grid-cols-2 items-center gap-2">
                <Label className="text-xs text-muted-foreground">{c.label}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-8 text-sm"
                  value={form[c.key]}
                  onChange={e => setForm(f => ({ ...f, [c.key]: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between text-muted-foreground">
              <span>Valor de factura (OC)</span>
              <span className="font-mono">{formatCurrency(oc.total, oc.moneda)}</span>
            </div>
            {costos.filter(c => c.valor != null && c.valor !== 0).map(c => (
              <div key={c.key} className="flex justify-between text-muted-foreground">
                <span>{c.label}</span>
                <span className="font-mono">{formatCurrency(c.valor || 0, oc.moneda)}</span>
              </div>
            ))}
            {sumaCostos === 0 && (
              <div className="text-xs text-muted-foreground italic">Costos de nacionalización aún no registrados.</div>
            )}
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Costo real total</span>
              <span className="font-mono">{formatCurrency(costoRealTotal, oc.moneda)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
