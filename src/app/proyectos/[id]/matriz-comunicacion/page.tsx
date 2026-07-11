'use client'

import React, { useState, useEffect } from 'react'
import { ROL_CONTACTO_CLIENTE_LABELS } from '@/lib/config/rolesContactoCliente'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, MessageSquare, Plus, Trash2, Download, Sparkles, Pencil, X, Check, FileText } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { calcularNivelesOrgNodos, NIVELES_PARTICIPANTES_MATRIZ } from '@/lib/matrizComunicacion/utils'
import { DatosDocumentoModal } from '@/components/proyectos/matrizComunicacion/DatosDocumentoModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Celda { siglas: string; valor: string }

interface MatrizFila {
  id: string
  orden: number
  informacion: string  // = edtNombre
  receptores: string   // JSON: Celda[]
  medio: string
  frecuencia: string
}

interface Matriz {
  id: string
  proyectoId: string
  version: string
  generadoConIA: boolean
  filas: MatrizFila[]
  codigoDocumento: string | null
  revisionDocumento: string
  numeroConsultor: string | null
  desarrolloNombre: string | null
  verificoNombre: string | null
  aproboNombre: string | null
  autorizoNombre: string | null
}

interface PersonalInfo {
  siglas: string
  nombre: string
  cargo: string
  empresa: string
  celular: string
  correo: string
  esCliente?: boolean
}

interface ContactoClienteProyecto {
  id: string
  rolEnProyecto: string
  crmContacto: { nombre: string; email: string | null; celular: string | null; telefono: string | null }
}

interface OrgNodo {
  id: string
  parentId: string | null
  userId: string | null
  cargoLabel: string
  empresaOverride: string | null
  telefonoOverride: string | null
  _empresa: string
  _telefono: string | null
  user: { name: string; email: string } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FRECUENCIAS = ['M', 'S', 'E']
const MEDIOS = ['I', 'M', 'E', 'R', 'P', 'IE', 'IR']

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MatrizComunicacionPage() {
  const { id: proyectoId } = useParams<{ id: string }>()

  const [matriz, setMatriz] = useState<Matriz | null>(null)
  const [personal, setPersonal] = useState<PersonalInfo[]>([])
  const [proyectoInfo, setProyectoInfo] = useState<{
    nombre: string
    codigo: string
    cliente: string
    sede: string | null
    etapa: string | null
    codigoPEP: string | null
    areaSeccion: string | null
  } | null>(null)
  const [showDatosDocumento, setShowDatosDocumento] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [exportingWord, setExportingWord] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editInfo, setEditInfo] = useState('')
  const [editFrq, setEditFrq] = useState('')
  const [editMedio, setEditMedio] = useState('')
  const [editCeldas, setEditCeldas] = useState<Record<string, string>>({})
  const [savingRow, setSavingRow] = useState(false)

  // ─── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const [mRes, oRes, pRes, ccRes] = await Promise.all([
        fetch(`/api/proyectos/${proyectoId}/matriz-comunicacion`),
        fetch(`/api/proyectos/${proyectoId}/organigrama`),
        fetch(`/api/proyectos/${proyectoId}`),
        fetch(`/api/proyecto/${proyectoId}/contactos-cliente`),
      ])

      if (mRes.ok) { const d = await mRes.json(); setMatriz(d) }

      let allPersonal: PersonalInfo[] = []
      if (oRes.ok) {
        const nodos: OrgNodo[] = await oRes.json()
        allPersonal = buildPersonal(nodos)
      }

      let clienteNombre = ''
      if (pRes.ok) {
        const { data: p } = await pRes.json()
        clienteNombre = p.cliente?.nombre ?? ''
        setProyectoInfo({
          nombre: p.nombre ?? '',
          codigo: p.codigo ?? '',
          cliente: clienteNombre,
          sede: p.sede ?? null,
          etapa: p.etapa ?? null,
          codigoPEP: p.codigoPEP ?? null,
          areaSeccion: p.areaSeccion ?? null,
        })
      }

      if (ccRes.ok) {
        const ccData = await ccRes.json()
        const contactos: ContactoClienteProyecto[] = ccData.data ?? []
        if (contactos.length > 0) {
          const usadas = new Set(allPersonal.map(p => p.siglas))
          for (const cc of contactos) {
            const siglas = generarSiglas(cc.crmContacto.nombre, usadas)
            usadas.add(siglas)
            allPersonal.push({
              siglas,
              nombre: cc.crmContacto.nombre,
              cargo: ROL_CONTACTO_CLIENTE_LABELS[cc.rolEnProyecto] ?? cc.rolEnProyecto,
              empresa: clienteNombre || 'Cliente',
              celular: cc.crmContacto.celular ?? cc.crmContacto.telefono ?? '',
              correo: cc.crmContacto.email ?? '',
              esCliente: true,
            })
          }
        }
      }

      setPersonal(allPersonal)
      setLoading(false)
    }
    init()
  }, [proyectoId])

  // ─── Actions ───────────────────────────────────────────────────────────────

  async function handleCrear(conIA: boolean) {
    if (conIA) setGenerating(true); else setCreating(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/matriz-comunicacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generarConIA: conIA }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Error') }
      setMatriz(await res.json())
      toast.success(conIA ? 'Matriz generada con IA' : 'Matriz creada')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setCreating(false); setGenerating(false)
    }
  }

  async function handleAddFila() {
    if (!matriz) return
    const celdas: Celda[] = personal.map(p => ({ siglas: p.siglas, valor: 'D' }))
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/matriz-comunicacion/filas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ informacion: 'Nueva actividad', emisor: '', receptores: celdas, medio: 'E', frecuencia: 'E', formato: '' }),
      })
      if (!res.ok) throw new Error()
      const fila = await res.json()
      setMatriz(m => m ? { ...m, filas: [...m.filas, fila] } : m)
      startEdit(fila)
    } catch { toast.error('Error al agregar fila') }
  }

  async function handleDeleteFila(filaId: string) {
    if (!confirm('¿Eliminar esta fila?')) return
    try {
      await fetch(`/api/proyectos/${proyectoId}/matriz-comunicacion/filas/${filaId}`, { method: 'DELETE' })
      setMatriz(m => m ? { ...m, filas: m.filas.filter(f => f.id !== filaId) } : m)
    } catch { toast.error('Error al eliminar') }
  }

  function startEdit(fila: MatrizFila) {
    const celdas = parseCeldas(fila.receptores)
    const map: Record<string, string> = {}
    for (const c of celdas) map[c.siglas] = c.valor
    for (const p of personal) if (!map[p.siglas]) map[p.siglas] = 'D'
    setEditingId(fila.id)
    setEditInfo(fila.informacion)
    setEditFrq(fila.frecuencia)
    setEditMedio(fila.medio)
    setEditCeldas(map)
  }

  function cancelEdit() { setEditingId(null) }

  async function saveEdit(filaId: string) {
    setSavingRow(true)
    try {
      const celdas = personal.map(p => ({ siglas: p.siglas, valor: editCeldas[p.siglas] ?? 'D' }))
      const res = await fetch(`/api/proyectos/${proyectoId}/matriz-comunicacion/filas/${filaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ informacion: editInfo, frecuencia: editFrq, medio: editMedio, receptores: celdas }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setMatriz(m => m ? { ...m, filas: m.filas.map(f => f.id === filaId ? { ...f, ...updated } : f) } : m)
      setEditingId(null)
    } catch { toast.error('Error al guardar') }
    finally { setSavingRow(false) }
  }

  async function handleDeleteMatriz() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/matriz-comunicacion`, { method: 'DELETE' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Error') }
      setMatriz(null)
      setShowDeleteDialog(false)
      toast.success('Matriz eliminada')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  async function handleExportPdf() {
    if (!matriz || !proyectoInfo) return
    const { generarPdfMatriz } = await import('@/lib/matrizComunicacion/exportPdf')
    const today = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    generarPdfMatriz({
      proyecto: proyectoInfo.nombre,
      cliente: proyectoInfo.cliente,
      codigoDocumento: `MX-${proyectoInfo.codigo || proyectoId}-GYS-001`,
      revision: matriz.version,
      fecha: today,
      personal,
      filas: matriz.filas.map(f => ({
        orden: f.orden,
        edtNombre: f.informacion,
        frecuencia: f.frecuencia,
        medio: f.medio,
        celdas: parseCeldas(f.receptores),
      })),
    })
  }

  async function handleExportWord() {
    if (!proyectoInfo) return
    if (!matriz?.codigoDocumento) {
      setShowDatosDocumento(true)
      return
    }
    setExportingWord(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/matriz-comunicacion/docx`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${proyectoInfo.codigo}-MAC.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch { toast.error('Error al exportar Word') }
    finally { setExportingWord(false) }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-muted-foreground" size={28} />
    </div>
  )

  if (!matriz) return (
    <div className="p-8 flex flex-col items-center justify-center gap-6 min-h-[480px]">
      <div className="flex flex-col items-center gap-3 text-center max-w-md">
        <div className="p-4 rounded-full bg-blue-50">
          <MessageSquare className="text-blue-500" size={36} />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Matriz de Comunicaciones</h2>
        <p className="text-sm text-muted-foreground">
          Crea la matriz vacía o genérala automáticamente con IA usando el
          organigrama y las actividades del cronograma.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => handleCrear(false)} disabled={creating || generating}>
          {creating && <Loader2 className="animate-spin mr-2" size={14} />}
          Crear vacía
        </Button>
        <Button onClick={() => handleCrear(true)} disabled={creating || generating} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          {generating
            ? <><Loader2 className="animate-spin mr-2" size={14} />Generando con IA…</>
            : <><Sparkles size={14} className="mr-2" />Generar con IA</>}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
        <div className="flex items-center gap-3">
          <MessageSquare size={16} className="text-blue-500" />
          <span className="font-semibold text-sm text-gray-700">Matriz de Comunicaciones</span>
          <span className="text-xs text-muted-foreground">
            v{matriz.version} · {matriz.filas.length} filas
            {matriz.generadoConIA && <span className="ml-2 text-indigo-500 inline-flex items-center gap-0.5"><Sparkles size={10} />IA</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleAddFila}>
            <Plus size={13} className="mr-1" />Agregar fila
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPdf}>
            <Download size={13} className="mr-1" />PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportWord} disabled={exportingWord}>
            {exportingWord
              ? <Loader2 size={13} className="animate-spin mr-1" />
              : <FileText size={13} className="mr-1" />}
            Word
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowDatosDocumento(true)} title="Datos del documento (código, revisión, firmas)">
            <Pencil size={13} className="mr-1" />Datos del documento
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
            <Trash2 size={13} className="mr-1" />Eliminar y regenerar
          </Button>
        </div>
      </div>

      {/* Personal leyenda */}
      {personal.length > 0 && (() => {
        const gys = personal.filter(p => !p.esCliente)
        const clientes = personal.filter(p => p.esCliente)
        return (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 border-b bg-slate-50 shrink-0">
            {gys.length > 0 && (
              <>
                <span className="text-[10px] font-medium text-indigo-500 shrink-0">GYS:</span>
                {gys.map(p => (
                  <span key={p.siglas} title={`${p.nombre} — ${p.cargo}`}
                    className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-mono font-semibold cursor-default">
                    {p.siglas} <span className="font-normal">{p.nombre.split(' ')[0]}</span>
                  </span>
                ))}
              </>
            )}
            {clientes.length > 0 && (
              <>
                {gys.length > 0 && <span className="w-px h-4 bg-slate-300 shrink-0" />}
                <span className="text-[10px] font-medium text-rose-500 shrink-0">
                  Cliente{proyectoInfo?.cliente ? ` (${proyectoInfo.cliente})` : ''}:
                </span>
                {clientes.map(p => (
                  <span key={p.siglas} title={`${p.nombre} — ${p.cargo} · ${p.empresa}`}
                    className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-mono font-semibold cursor-default">
                    {p.siglas} <span className="font-normal">{p.nombre.split(' ')[0]}</span>
                  </span>
                ))}
              </>
            )}
          </div>
        )
      })()}

      {/* Matrix table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse min-w-max">
          <thead className="sticky top-0 z-10">
            {/* Row 1: fixed headers + grupos de responsabilidad */}
            <tr className="text-white text-[11px]">
              <th className="border border-slate-600 px-2 py-1.5 text-center font-semibold w-8 bg-[#2E4057]" rowSpan={2}>#</th>
              <th className="border border-slate-600 px-3 py-1.5 text-left font-semibold min-w-[160px] bg-[#2E4057]" rowSpan={2}>ACTIVIDAD</th>
              <th className="border border-slate-600 px-2 py-1.5 text-center font-semibold w-14 bg-[#2E4057]" rowSpan={2}>FREC.</th>
              <th className="border border-slate-600 px-2 py-1.5 text-center font-semibold w-14 bg-[#2E4057]" rowSpan={2}>MEDIO</th>
              {(() => {
                const gysCount = personal.filter(p => !p.esCliente).length
                const cliCount = personal.filter(p => p.esCliente).length
                return (
                  <>
                    {gysCount > 0 && (
                      <th className="border border-slate-600 px-2 py-1.5 text-center font-semibold bg-[#2E4057]" colSpan={gysCount}>
                        RESPONSABILIDAD — EQUIPO GYS
                      </th>
                    )}
                    {cliCount > 0 && (
                      <th className="border border-rose-400 px-2 py-1.5 text-center font-semibold bg-rose-700" colSpan={cliCount}>
                        CLIENTE{proyectoInfo?.cliente ? `: ${proyectoInfo.cliente}` : ''}
                      </th>
                    )}
                  </>
                )
              })()}
              <th className="border border-slate-600 w-14 bg-[#2E4057]" rowSpan={2} />
            </tr>
            {/* Row 2: siglas */}
            <tr>
              {personal.map(p => (
                <th key={p.siglas} title={`${p.nombre} — ${p.cargo}${p.esCliente ? ` · ${p.empresa}` : ''}`}
                  className={`border px-1 py-1 text-center font-mono text-[10px] w-10 text-white ${
                    p.esCliente
                      ? 'bg-rose-600 border-rose-400'
                      : 'bg-[#2E4057] border-slate-600'
                  }`}>
                  {p.siglas}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matriz.filas.map((fila, idx) => {
              const celdas = parseCeldas(fila.receptores)
              const isEditing = editingId === fila.id
              const rowBg = idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'

              return (
                <tr key={fila.id} className={`${rowBg} group hover:bg-blue-50/40`}>
                  <td className="border border-slate-200 px-2 py-1 text-center text-muted-foreground">{idx + 1}</td>

                  {/* Actividad */}
                  <td className="border border-slate-200 px-2 py-1 font-medium">
                    {isEditing
                      ? <Input value={editInfo} onChange={e => setEditInfo(e.target.value)} className="h-6 text-xs py-0 min-w-[120px]" />
                      : fila.informacion}
                  </td>

                  {/* Frecuencia */}
                  <td className="border border-slate-200 px-1 py-1 text-center font-mono">
                    {isEditing
                      ? <select value={editFrq} onChange={e => setEditFrq(e.target.value)} className="text-xs border rounded px-1 py-0.5 w-12">
                          {FRECUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      : fila.frecuencia}
                  </td>

                  {/* Medio */}
                  <td className="border border-slate-200 px-1 py-1 text-center font-mono">
                    {isEditing
                      ? <select value={editMedio} onChange={e => setEditMedio(e.target.value)} className="text-xs border rounded px-1 py-0.5 w-14">
                          {MEDIOS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      : fila.medio}
                  </td>

                  {/* Celdas por persona */}
                  {personal.map(p => {
                    const c = celdas.find(x => x.siglas === p.siglas)
                    const valor = c?.valor ?? ''
                    return (
                      <td key={p.siglas} className={`border px-1 py-1 text-center font-mono font-semibold ${
                        p.esCliente
                          ? 'border-rose-200 bg-rose-50/40'
                          : 'border-slate-200'
                      }`}>
                        {isEditing
                          ? <input
                              value={editCeldas[p.siglas] ?? 'D'}
                              onChange={e => setEditCeldas(prev => ({ ...prev, [p.siglas]: e.target.value.toUpperCase() }))}
                              className="w-9 text-center text-xs font-mono border rounded py-0.5 uppercase"
                              maxLength={3}
                            />
                          : <span className={valorColor(valor)}>{valor}</span>}
                      </td>
                    )
                  })}

                  {/* Acciones */}
                  <td className="border border-slate-200 px-1 py-1">
                    {isEditing ? (
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => saveEdit(fila.id)}
                          disabled={savingRow}
                          className="p-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {savingRow ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        </button>
                        <button onClick={cancelEdit} className="p-1 rounded bg-slate-200 hover:bg-slate-300">
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(fila)} className="p-1 rounded hover:bg-slate-200">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => handleDeleteFila(fila.id)} className="p-1 rounded hover:bg-red-100 text-red-400">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}

            {matriz.filas.length === 0 && (
              <tr>
                <td colSpan={5 + personal.length} className="text-center text-muted-foreground py-12 text-sm">
                  No hay filas. Usa &quot;Agregar fila&quot; para comenzar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="shrink-0 px-4 py-2 border-t bg-slate-50 flex gap-6 text-[10px] text-muted-foreground">
        <span><b>Frec:</b> M=Mensual S=Semanal E=Eventual</span>
        <span><b>Medio:</b> I=Informe M=Minuta E=Email R=Reunión P=Planilla IE=Informe+Email</span>
        <span><b>Resp:</b> D=Dest. E=Emisor R=Autoriza S=Soporte V=Valida</span>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar la Matriz de Comunicaciones?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todas las filas y celdas. Podrás generar una nueva con IA.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMatriz}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {proyectoInfo && (
        <DatosDocumentoModal
          open={showDatosDocumento}
          onOpenChange={setShowDatosDocumento}
          proyectoId={proyectoId}
          matriz={matriz}
          proyectoInfo={{
            clienteNombre: proyectoInfo.cliente,
            sede: proyectoInfo.sede,
            etapa: proyectoInfo.etapa,
            codigoPEP: proyectoInfo.codigoPEP,
            areaSeccion: proyectoInfo.areaSeccion,
          }}
          personal={personal}
          onSaved={updated => {
            setMatriz(m => (m ? { ...m, ...updated } : m))
            if (updated.codigoDocumento) handleExportWord()
          }}
        />
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCeldas(json: string): Celda[] {
  try {
    const arr = JSON.parse(json)
    if (!Array.isArray(arr)) return []
    if (arr.length > 0 && typeof arr[0] === 'object' && 'siglas' in arr[0]) return arr as Celda[]
    return []
  } catch { return [] }
}

function valorColor(v: string): string {
  if (v.startsWith('E')) return 'text-blue-700'
  if (v.startsWith('D')) return 'text-gray-700'
  if (v.startsWith('R')) return 'text-orange-600'
  if (v.startsWith('S')) return 'text-green-700'
  if (v.startsWith('V')) return 'text-purple-700'
  return 'text-gray-500'
}

function buildPersonal(nodos: OrgNodo[]): PersonalInfo[] {
  // Solo participan los niveles de gestión/ejecución del organigrama
  // (no la Gerencia General de nivel 1, ni los técnicos de campo del último nivel)
  const niveles = calcularNivelesOrgNodos(nodos)
  const usadas = new Set<string>()
  const seenUserIds = new Set<string>()
  return nodos
    .filter(n => {
      if (!n.user) return false
      if (!NIVELES_PARTICIPANTES_MATRIZ.includes(niveles.get(n.id) as 2 | 3 | 4)) return false
      if (n.userId) {
        if (seenUserIds.has(n.userId)) return false
        seenUserIds.add(n.userId)
      }
      return true
    })
    .map(n => {
      const nombre = n.user!.name
      const siglas = generarSiglas(nombre, usadas)
      usadas.add(siglas)
      return {
        siglas,
        nombre,
        cargo: n.cargoLabel,
        empresa: n._empresa ?? n.empresaOverride ?? 'GYS Control Industrial SAC',
        celular: n._telefono ?? n.telefonoOverride ?? '',
        correo: n.user!.email,
      }
    })
}

function generarSiglas(nombre: string, usadas: Set<string>): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  const base = partes.map(p => p[0].toUpperCase()).join('')
  if (!usadas.has(base)) return base
  if (partes.length >= 2) {
    const alt = partes[0][0].toUpperCase() + partes[1].substring(0, 2).toUpperCase()
    if (!usadas.has(alt)) return alt
  }
  let i = 2
  while (usadas.has(`${base}${i}`)) i++
  return `${base}${i}`
}
