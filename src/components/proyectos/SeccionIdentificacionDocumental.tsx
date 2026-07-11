'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileBadge, Pencil, Save, X, Loader2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type { Proyecto } from '@/types'
import { ETAPAS_SUGERIDAS, OTRA_ETAPA } from '@/lib/config/etapasProyecto'

interface Props {
  proyecto: Proyecto
  onUpdateProyecto: (updated: Partial<Proyecto>) => void
}

export default function SeccionIdentificacionDocumental({ proyecto, onUpdateProyecto }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    sede: '',
    etapa: '',
    etapaLibre: '',
    codigoPEP: '',
    areaSeccion: '',
  })

  const etapaEsSugerida = ETAPAS_SUGERIDAS.includes(form.etapa)

  function startEditing() {
    const etapaActual = proyecto.etapa || ''
    setForm({
      sede: proyecto.sede || '',
      etapa: etapaActual && !ETAPAS_SUGERIDAS.includes(etapaActual) ? OTRA_ETAPA : etapaActual,
      etapaLibre: etapaActual && !ETAPAS_SUGERIDAS.includes(etapaActual) ? etapaActual : '',
      codigoPEP: proyecto.codigoPEP || '',
      areaSeccion: proyecto.areaSeccion || '',
    })
    setEditing(true)
  }

  async function guardar() {
    setSaving(true)
    try {
      const etapaFinal = form.etapa === OTRA_ETAPA ? form.etapaLibre : form.etapa
      const payload = {
        sede: form.sede || null,
        etapa: etapaFinal || null,
        codigoPEP: form.codigoPEP || null,
        areaSeccion: form.areaSeccion || null,
      }
      const res = await fetch(`/api/proyectos/${proyecto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Error ${res.status}`)
      }
      const { data } = await res.json()
      onUpdateProyecto(data)
      setEditing(false)
      toast.success('Identificación documental actualizada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.33 }}>
      <Card>
        <CardContent className="p-0">
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center gap-2">
              <FileBadge className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Identificación Documental</span>
              <span className="text-xs text-muted-foreground">
                {[proyecto.sede, proyecto.etapa, proyecto.codigoPEP].filter(Boolean).join(' · ') || 'Sin definir'}
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>

          {expanded && (
            <div className="border-t px-4 py-3 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">
                  Datos usados por los documentos generados desde plantilla (matriz de comunicaciones, dossier, informes, protocolos).
                </p>
                {!editing ? (
                  <Button variant="ghost" size="sm" className="h-7 px-2 shrink-0" onClick={startEditing}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-green-700" onClick={guardar} disabled={saving}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditing(false)} disabled={saving}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {!editing ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Sede</div>
                    <div className="font-medium">{proyecto.sede || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Etapa</div>
                    <div className="font-medium">{proyecto.etapa || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Código PEP</div>
                    <div className="font-medium">{proyecto.codigoPEP || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Área/Sección</div>
                    <div className="font-medium">{proyecto.areaSeccion || '—'}</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Sede</Label>
                    <Input value={form.sede} onChange={e => setForm({ ...form, sede: e.target.value })} placeholder="ej: Unidad Cerro Lindo" className="h-8 text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Etapa</Label>
                    <Select value={form.etapa} onValueChange={v => setForm({ ...form, etapa: v })}>
                      <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                      <SelectContent>
                        {ETAPAS_SUGERIDAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                        <SelectItem value={OTRA_ETAPA}>Otro (texto libre)</SelectItem>
                      </SelectContent>
                    </Select>
                    {!etapaEsSugerida && form.etapa === OTRA_ETAPA && (
                      <Input
                        value={form.etapaLibre}
                        onChange={e => setForm({ ...form, etapaLibre: e.target.value })}
                        placeholder="Etapa del proyecto"
                        className="h-8 text-sm mt-1"
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Código PEP (asignado por el cliente)</Label>
                    <Input value={form.codigoPEP} onChange={e => setForm({ ...form, codigoPEP: e.target.value })} placeholder="ej: I790126021" className="h-8 text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Área/Sección</Label>
                    <Input value={form.areaSeccion} onChange={e => setForm({ ...form, areaSeccion: e.target.value })} placeholder="ej: 0240" className="h-8 text-sm mt-1" />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
