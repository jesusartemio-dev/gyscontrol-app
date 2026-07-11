'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  componerCodigoNexa,
  digitoEtapa,
  detectarEstandarCliente,
} from '@/lib/matrizComunicacion/codigoDocumentoAsistente'
import { ETAPAS_SUGERIDAS, OTRA_ETAPA } from '@/lib/config/etapasProyecto'

interface PersonalInfo {
  siglas: string
  nombre: string
  cargo: string
  esCliente?: boolean
}

export interface DatosDocumentoMeta {
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

interface ProyectoActualizado {
  sede: string | null
  etapa: string | null
  codigoPEP: string | null
  areaSeccion: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  proyectoId: string
  documento: DatosDocumentoMeta
  proyectoInfo: ProyectoDatosDocumento
  personal: PersonalInfo[]
  /** 'MX' (default, Matriz) | 'OR' (Organigrama) — pasado a componerCodigoNexa. */
  codigoTipoDocumento?: string
  onGuardarDocumento: (payload: DatosDocumentoMeta) => Promise<Response>
  onSaved: (updated: DatosDocumentoMeta) => void
  onProyectoActualizado: (updated: ProyectoActualizado) => void
}

function heuristicaDefault(personal: PersonalInfo[], patron: RegExp): string {
  return personal.find(p => patron.test(p.cargo))?.nombre ?? ''
}

// "Gerencia/Gerente de Proyectos" (rol corporativo, ej. Jesús Mamani en G300)
// es un cargo DISTINTO de "Gestor de Proyectos" (rol de proyecto, ej. Piero
// Ríos) — no deben confundirse. Requiere ambos "gerenc/gerente" Y "proyecto"
// para no matchear por accidente "Gerencia General"/"Gerencia Comercial".
const RX_GERENTE_PROYECTOS = /(gerenc|gerente).*proyecto/i

export function DatosDocumentoModal({
  open, onOpenChange, proyectoId, documento, proyectoInfo, personal,
  codigoTipoDocumento, onGuardarDocumento, onSaved, onProyectoActualizado,
}: Props) {
  const [form, setForm] = useState({
    codigoDocumento: '', revisionDocumento: '0', numeroConsultor: '',
    desarrolloNombre: '', verificoNombre: '', aproboNombre: '', autorizoNombre: '',
  })
  // Editables acá mismo — evita el callejón sin salida de tener que ir a
  // buscar una tarjeta colapsada en la ficha del proyecto (bug real
  // detectado en uso: el link llevaba a la página correcta, pero la sección
  // estaba colapsada y sin resaltar, sin ninguna pista de qué hacer ahí).
  const [proyectoForm, setProyectoForm] = useState({ sede: '', etapa: '', etapaLibre: '', codigoPEP: '', areaSeccion: '' })
  const [correlativo, setCorrelativo] = useState('0001')
  const [etapaDigitoManual, setEtapaDigitoManual] = useState('')
  const [saving, setSaving] = useState(false)

  const etapaResuelta = proyectoForm.etapa === OTRA_ETAPA ? proyectoForm.etapaLibre : proyectoForm.etapa
  const estandar = detectarEstandarCliente(proyectoInfo.clienteNombre)
  const digitoAuto = digitoEtapa(etapaResuelta)
  const faltanDatosNexa = !proyectoForm.codigoPEP || !proyectoForm.areaSeccion
  const asistenteDisponible = estandar === 'nexa' && !faltanDatosNexa

  function componerSugerencia(correlativoValor: string, revisionValor: string, etapaDigitoManualValor: string): string | null {
    if (!asistenteDisponible) return null
    const etapaDigito = digitoAuto ?? etapaDigitoManualValor
    if (!etapaDigito) return null
    return componerCodigoNexa({
      pep: proyectoForm.codigoPEP,
      etapaDigito,
      area: proyectoForm.areaSeccion,
      correlativo: correlativoValor,
      revision: revisionValor || '0',
      tipoDocumento: codigoTipoDocumento,
    })
  }

  useEffect(() => {
    if (!open) return
    const clienteContacto = personal.find(p => p.esCliente)?.nombre ?? ''
    const revisionInicial = documento.revisionDocumento || '0'
    const etapaInicial = proyectoInfo.etapa && !ETAPAS_SUGERIDAS.includes(proyectoInfo.etapa) ? OTRA_ETAPA : (proyectoInfo.etapa ?? '')
    setProyectoForm({
      sede: proyectoInfo.sede ?? '',
      etapa: etapaInicial,
      etapaLibre: etapaInicial === OTRA_ETAPA ? proyectoInfo.etapa ?? '' : '',
      codigoPEP: proyectoInfo.codigoPEP ?? '',
      areaSeccion: proyectoInfo.areaSeccion ?? '',
    })
    // Auto-sugerencia al abrir: si el código está vacío y los datos del
    // proyecto ya alcanzan para componerlo (incluye el dígito de etapa
    // automático — si hiciera falta escribirlo a mano, no se auto-sugiere),
    // se pre-llena editable. El usuario acepta guardando o lo sobreescribe.
    const etapaDigitoInicial = digitoEtapa(proyectoInfo.etapa)
    const autoSugerido =
      !documento.codigoDocumento && detectarEstandarCliente(proyectoInfo.clienteNombre) === 'nexa' && proyectoInfo.codigoPEP && proyectoInfo.areaSeccion && etapaDigitoInicial
        ? componerCodigoNexa({
            pep: proyectoInfo.codigoPEP,
            etapaDigito: etapaDigitoInicial,
            area: proyectoInfo.areaSeccion,
            correlativo,
            revision: revisionInicial,
            tipoDocumento: codigoTipoDocumento,
          })
        : ''
    setForm({
      codigoDocumento: documento.codigoDocumento || autoSugerido,
      revisionDocumento: revisionInicial,
      numeroConsultor: documento.numeroConsultor ?? '',
      desarrolloNombre: documento.desarrolloNombre ?? heuristicaDefault(personal, /residente/i),
      verificoNombre: documento.verificoNombre ?? heuristicaDefault(personal, RX_GERENTE_PROYECTOS),
      aproboNombre: documento.aproboNombre ?? heuristicaDefault(personal, RX_GERENTE_PROYECTOS),
      autorizoNombre: documento.autorizoNombre ?? clienteContacto,
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
      const proyectoPayload = {
        sede: proyectoForm.sede || null,
        etapa: etapaResuelta || null,
        codigoPEP: proyectoForm.codigoPEP || null,
        areaSeccion: proyectoForm.areaSeccion || null,
      }
      const [resProyecto, resDocumento] = await Promise.all([
        fetch(`/api/proyectos/${proyectoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proyectoPayload),
        }),
        onGuardarDocumento(form),
      ])
      if (!resProyecto.ok) {
        throw new Error(resProyecto.status === 403 ? 'Sin permiso para editar los datos del proyecto' : 'Error al guardar los datos del proyecto')
      }
      if (!resDocumento.ok) throw new Error('Error al guardar los datos del documento')

      const { data: proyectoActualizado } = await resProyecto.json()
      const documentoActualizado = await resDocumento.json()
      onProyectoActualizado(proyectoActualizado)
      onSaved(documentoActualizado)
      toast.success('Datos guardados')
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
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
            Completa antes de descargar el Word con la plantilla oficial. Sede/etapa/código PEP/área se guardan en el proyecto y las usarán también futuros documentos (dossier, informes, protocolos).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="border rounded p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Datos del proyecto</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Sede</Label>
                <Input value={proyectoForm.sede} onChange={e => setProyectoForm({ ...proyectoForm, sede: e.target.value })} placeholder="ej: Unidad Cerro Lindo" className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Etapa</Label>
                <Select value={proyectoForm.etapa} onValueChange={v => setProyectoForm({ ...proyectoForm, etapa: v })}>
                  <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {ETAPAS_SUGERIDAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    <SelectItem value={OTRA_ETAPA}>Otro (texto libre)</SelectItem>
                  </SelectContent>
                </Select>
                {proyectoForm.etapa === OTRA_ETAPA && (
                  <Input
                    value={proyectoForm.etapaLibre}
                    onChange={e => setProyectoForm({ ...proyectoForm, etapaLibre: e.target.value })}
                    placeholder="Etapa del proyecto"
                    className="h-8 text-sm mt-1"
                  />
                )}
              </div>
              <div>
                <Label className="text-xs">Código PEP (del cliente)</Label>
                <Input value={proyectoForm.codigoPEP} onChange={e => setProyectoForm({ ...proyectoForm, codigoPEP: e.target.value })} placeholder="ej: I790126021" className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Área/Sección</Label>
                <Input value={proyectoForm.areaSeccion} onChange={e => setProyectoForm({ ...proyectoForm, areaSeccion: e.target.value })} placeholder="ej: 0240" className="h-8 text-sm mt-1" />
              </div>
            </div>
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
                  <p className="text-xs text-amber-600 mt-1">Completa Código PEP y Área arriba para poder sugerir.</p>
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
