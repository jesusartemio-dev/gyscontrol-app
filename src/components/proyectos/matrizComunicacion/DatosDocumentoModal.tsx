'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  componerCodigoNexa,
  digitoEtapa,
  detectarEstandarCliente,
} from '@/lib/matrizComunicacion/codigoDocumentoAsistente'

interface PersonalInfo {
  siglas: string
  nombre: string
  cargo: string
  esCliente?: boolean
}

interface MatrizDatosDocumento {
  codigoDocumento: string | null
  revisionDocumento: string
  numeroConsultor: string | null
  desarrolloNombre: string | null
  verificoNombre: string | null
  aproboNombre: string | null
  autorizoNombre: string | null
}

interface ProyectoDatosDocumento {
  clienteNombre: string
  sede: string | null
  etapa: string | null
  codigoPEP: string | null
  areaSeccion: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  matriz: MatrizDatosDocumento
  proyectoInfo: ProyectoDatosDocumento
  personal: PersonalInfo[]
  onSaved: (updated: MatrizDatosDocumento) => void
}

function heuristicaDefault(personal: PersonalInfo[], patron: RegExp): string {
  return personal.find(p => patron.test(p.cargo))?.nombre ?? ''
}

// "Gerencia/Gerente de Proyectos" (rol corporativo, ej. Jesús Mamani en G300)
// es un cargo DISTINTO de "Gestor de Proyectos" (rol de proyecto, ej. Piero
// Ríos) — no deben confundirse. Requiere ambos "gerenc/gerente" Y "proyecto"
// para no matchear por accidente "Gerencia General"/"Gerencia Comercial".
const RX_GERENTE_PROYECTOS = /(gerenc|gerente).*proyecto/i

export function DatosDocumentoModal({ open, onOpenChange, proyectoId, matriz, proyectoInfo, personal, onSaved }: Props) {
  const [form, setForm] = useState({
    codigoDocumento: '', revisionDocumento: '0', numeroConsultor: '',
    desarrolloNombre: '', verificoNombre: '', aproboNombre: '', autorizoNombre: '',
  })
  const [correlativo, setCorrelativo] = useState('0001')
  const [etapaDigitoManual, setEtapaDigitoManual] = useState('')
  const [saving, setSaving] = useState(false)

  const estandar = detectarEstandarCliente(proyectoInfo.clienteNombre)
  const digitoAuto = digitoEtapa(proyectoInfo.etapa)
  const faltanDatosNexa = !proyectoInfo.codigoPEP || !proyectoInfo.areaSeccion
  const asistenteDisponible = estandar === 'nexa' && !faltanDatosNexa

  function componerSugerencia(correlativoValor: string, revisionValor: string, etapaDigitoManualValor: string): string | null {
    if (!asistenteDisponible) return null
    const etapaDigito = digitoAuto ?? etapaDigitoManualValor
    if (!etapaDigito) return null
    return componerCodigoNexa({
      pep: proyectoInfo.codigoPEP!,
      etapaDigito,
      area: proyectoInfo.areaSeccion!,
      correlativo: correlativoValor,
      revision: revisionValor || '0',
    })
  }

  useEffect(() => {
    if (!open) return
    const clienteContacto = personal.find(p => p.esCliente)?.nombre ?? ''
    const revisionInicial = matriz.revisionDocumento || '0'
    // Auto-sugerencia al abrir: si el código está vacío y los datos del
    // proyecto ya alcanzan para componerlo (incluye el dígito de etapa
    // automático — si hiciera falta escribirlo a mano, no se auto-sugiere),
    // se pre-llena editable. El usuario acepta guardando o lo sobreescribe.
    const autoSugerido = !matriz.codigoDocumento ? componerSugerencia(correlativo, revisionInicial, '') ?? '' : ''
    setForm({
      codigoDocumento: matriz.codigoDocumento || autoSugerido,
      revisionDocumento: revisionInicial,
      numeroConsultor: matriz.numeroConsultor ?? '',
      desarrolloNombre: matriz.desarrolloNombre ?? heuristicaDefault(personal, /residente/i),
      verificoNombre: matriz.verificoNombre ?? heuristicaDefault(personal, RX_GERENTE_PROYECTOS),
      aproboNombre: matriz.aproboNombre ?? heuristicaDefault(personal, RX_GERENTE_PROYECTOS),
      autorizoNombre: matriz.autorizoNombre ?? clienteContacto,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function sugerirCodigo() {
    const codigo = componerSugerencia(correlativo, form.revisionDocumento, etapaDigitoManual)
    if (!codigo) {
      toast.error('Falta el dígito de etapa — escríbelo abajo o define la etapa del proyecto.')
      return
    }
    setForm(f => ({ ...f, codigoDocumento: codigo }))
  }

  async function guardar() {
    setSaving(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/matriz-comunicacion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      onSaved(updated)
      toast.success('Datos del documento guardados')
      onOpenChange(false)
    } catch {
      toast.error('Error al guardar los datos del documento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Datos del documento</DialogTitle>
          <DialogDescription>
            Completa antes de descargar el Word con la plantilla oficial — sede/etapa/código PEP/área se editan en la ficha del proyecto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-xs bg-muted/50 rounded p-2 grid grid-cols-2 gap-1">
            <span><b>Sede:</b> {proyectoInfo.sede || '—'}</span>
            <span><b>Etapa:</b> {proyectoInfo.etapa || '—'}</span>
            <span><b>Código PEP:</b> {proyectoInfo.codigoPEP || '—'}</span>
            <span><b>Área/Sección:</b> {proyectoInfo.areaSeccion || '—'}</span>
          </div>

          <div>
            <Label className="text-xs">Código de documento</Label>
            <div className="flex gap-2 mt-1">
              <Input value={form.codigoDocumento} onChange={e => setForm({ ...form, codigoDocumento: e.target.value })} placeholder="Ingresa o sugiere el código del cliente" className="h-8 text-sm" />
            </div>
            {estandar === 'nexa' && (
              <>
                <div className="flex items-center gap-2 mt-2">
                  <Input value={correlativo} onChange={e => setCorrelativo(e.target.value)} placeholder="Correlativo" className="h-8 text-sm w-28" />
                  {!digitoAuto && (
                    <Input value={etapaDigitoManual} onChange={e => setEtapaDigitoManual(e.target.value)} placeholder="Dígito etapa" className="h-8 text-sm w-24" maxLength={1} />
                  )}
                  <Button type="button" size="sm" variant="secondary" onClick={sugerirCodigo} disabled={!asistenteDisponible}>
                    <Sparkles size={13} className="mr-1" />Sugerir código
                  </Button>
                </div>
                {!asistenteDisponible && (
                  <p className="text-xs text-amber-600 mt-1">
                    Completa Código PEP, etapa y área en la{' '}
                    <Link href={`/proyectos/${proyectoId}`} target="_blank" className="underline font-medium">
                      ficha del proyecto
                    </Link>{' '}
                    para sugerir.
                  </p>
                )}
              </>
            )}
            {estandar === 'qroma' && (
              <p className="text-xs text-muted-foreground mt-1">Asistente no configurado para este cliente todavía — escribe el código a mano.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Revisión</Label>
              <Input value={form.revisionDocumento} onChange={e => setForm({ ...form, revisionDocumento: e.target.value })} placeholder="0" className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">N° Consultor (GYS)</Label>
              <Input value={form.numeroConsultor} onChange={e => setForm({ ...form, numeroConsultor: e.target.value })} className="h-8 text-sm mt-1" />
            </div>
          </div>

          <datalist id="datos-documento-personal-options">
            {personal.map(p => <option key={p.nombre} value={p.nombre} />)}
          </datalist>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Desarrolló</Label>
              <Input list="datos-documento-personal-options" value={form.desarrolloNombre} onChange={e => setForm({ ...form, desarrolloNombre: e.target.value })} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Verificó</Label>
              <Input list="datos-documento-personal-options" value={form.verificoNombre} onChange={e => setForm({ ...form, verificoNombre: e.target.value })} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Aprobó</Label>
              <Input list="datos-documento-personal-options" value={form.aproboNombre} onChange={e => setForm({ ...form, aproboNombre: e.target.value })} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Autorizó</Label>
              <Input list="datos-documento-personal-options" value={form.autorizoNombre} onChange={e => setForm({ ...form, autorizoNombre: e.target.value })} className="h-8 text-sm mt-1" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={guardar} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
