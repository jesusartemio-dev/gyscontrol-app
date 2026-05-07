'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, MessageSquare, Plus, Trash2, Save, Download, Sparkles, Pencil, X, Check } from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatrizFila {
  id: string
  orden: number
  informacion: string
  emisor: string
  receptores: string   // JSON string
  medio: string
  frecuencia: string
  formato: string
  notas: string | null
  edt: { id: string; nombre: string } | null
}

interface Matriz {
  id: string
  proyectoId: string
  version: string
  estado: string
  generadoConIA: boolean
  filas: MatrizFila[]
}

interface OrgNodo {
  cargoLabel: string
  user: { name: string } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MEDIOS = ['Reunión', 'Correo electrónico', 'Informe escrito', 'WhatsApp/Teléfono', 'Sistema GYS']
const FRECUENCIAS = ['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Al evento', 'Al inicio', 'Al cierre']

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MatrizComunicacionPage() {
  const { id: proyectoId } = useParams<{ id: string }>()

  const [matriz, setMatriz] = useState<Matriz | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Personal (siglas) derived from organigrama
  const [personal, setPersonal] = useState<{ siglas: string; nombre: string; cargo: string }[]>([])

  // Proyecto info for PDF export
  const [proyectoInfo, setProyectoInfo] = useState<{ nombre: string; codigo: string; cliente: string } | null>(null)

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<Partial<MatrizFila> & { receptoresArr: string[] }>({
    receptoresArr: [],
  })
  const [savingRow, setSavingRow] = useState(false)

  // ─── Load data ────────────────────────────────────────────────────────────

  const loadMatriz = useCallback(async () => {
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/matriz-comunicacion`)
      if (res.ok) {
        const data = await res.json()
        setMatriz(data)
      }
    } catch {
      toast.error('Error al cargar la matriz')
    } finally {
      setLoading(false)
    }
  }, [proyectoId])

  useEffect(() => {
    const init = async () => {
      const [matrizRes, orgRes, proyRes] = await Promise.all([
        fetch(`/api/proyectos/${proyectoId}/matriz-comunicacion`),
        fetch(`/api/proyectos/${proyectoId}/organigrama`),
        fetch(`/api/proyectos/${proyectoId}`),
      ])

      if (matrizRes.ok) {
        const data = await matrizRes.json()
        setMatriz(data)
      }

      if (orgRes.ok) {
        const nodos: OrgNodo[] = await orgRes.json()
        setPersonal(buildPersonalConSiglas(nodos))
      }

      if (proyRes.ok) {
        const p = await proyRes.json()
        setProyectoInfo({
          nombre: p.nombre ?? '',
          codigo: p.codigo ?? '',
          cliente: p.cliente?.nombre ?? p.clienteNombre ?? '',
        })
      }

      setLoading(false)
    }
    init()
  }, [proyectoId])

  // ─── Actions ─────────────────────────────────────────────────────────────

  async function handleCrear(conIA: boolean) {
    if (conIA) setGenerating(true)
    else setCreating(true)

    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/matriz-comunicacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generarConIA: conIA }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error al crear')
      }

      const data = await res.json()
      setMatriz(data)
      toast.success(conIA ? 'Matriz generada con IA' : 'Matriz creada')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setCreating(false)
      setGenerating(false)
    }
  }

  async function handleAddFila() {
    if (!matriz) return
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/matriz-comunicacion/filas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          informacion: 'Nueva comunicación',
          emisor: '',
          receptores: [],
          medio: 'Correo electrónico',
          frecuencia: 'Al evento',
          formato: '',
        }),
      })
      if (!res.ok) throw new Error()
      const fila = await res.json()
      setMatriz(m => m ? { ...m, filas: [...m.filas, fila] } : m)
      // Immediately open edit for new row
      startEdit({ ...fila, edt: null })
    } catch {
      toast.error('Error al agregar fila')
    }
  }

  async function handleDeleteFila(filaId: string) {
    if (!confirm('¿Eliminar esta fila?')) return
    try {
      const res = await fetch(
        `/api/proyectos/${proyectoId}/matriz-comunicacion/filas/${filaId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error()
      setMatriz(m => m ? { ...m, filas: m.filas.filter(f => f.id !== filaId) } : m)
    } catch {
      toast.error('Error al eliminar fila')
    }
  }

  function startEdit(fila: MatrizFila) {
    setEditingId(fila.id)
    const receptoresArr = (() => {
      try { return JSON.parse(fila.receptores) as string[] }
      catch { return [] }
    })()
    setEditRow({
      informacion: fila.informacion,
      emisor: fila.emisor,
      receptoresArr,
      medio: fila.medio,
      frecuencia: fila.frecuencia,
      formato: fila.formato,
      notas: fila.notas ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditRow({ receptoresArr: [] })
  }

  async function saveEdit(filaId: string) {
    setSavingRow(true)
    try {
      const res = await fetch(
        `/api/proyectos/${proyectoId}/matriz-comunicacion/filas/${filaId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            informacion: editRow.informacion,
            emisor: editRow.emisor,
            receptores: editRow.receptoresArr,
            medio: editRow.medio,
            frecuencia: editRow.frecuencia,
            formato: editRow.formato,
            notas: editRow.notas,
          }),
        }
      )
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setMatriz(m =>
        m ? { ...m, filas: m.filas.map(f => f.id === filaId ? { ...f, ...updated } : f) } : m
      )
      setEditingId(null)
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSavingRow(false)
    }
  }

  async function handleExportPdf() {
    if (!matriz || !proyectoInfo) return
    const { exportMatrizPdf } = await import('@/lib/matrizComunicacion/exportPdf')
    exportMatrizPdf({
      nombreProyecto: proyectoInfo.nombre,
      codigoProyecto: proyectoInfo.codigo,
      cliente: proyectoInfo.cliente,
      version: matriz.version,
      filas: matriz.filas.map(f => ({
        orden: f.orden,
        informacion: f.informacion,
        emisor: f.emisor,
        receptores: parseReceptores(f.receptores),
        medio: f.medio,
        frecuencia: f.frecuencia,
        formato: f.formato,
        notas: f.notas,
      })),
    })
  }

  function toggleReceptor(siglas: string) {
    setEditRow(prev => {
      const arr = prev.receptoresArr ?? []
      return {
        ...prev,
        receptoresArr: arr.includes(siglas)
          ? arr.filter(s => s !== siglas)
          : [...arr, siglas],
      }
    })
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    )
  }

  // Estado A — sin matriz
  if (!matriz) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-6 min-h-[480px]">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <div className="p-4 rounded-full bg-blue-50">
            <MessageSquare className="text-blue-500" size={36} />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            Matriz de Comunicaciones
          </h2>
          <p className="text-sm text-muted-foreground">
            Aún no hay una Matriz de Comunicaciones para este proyecto.
            Puedes crearla vacía o generarla automáticamente con IA usando
            el organigrama y las actividades del proyecto.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleCrear(false)}
            disabled={creating || generating}
          >
            {creating && <Loader2 className="animate-spin mr-2" size={14} />}
            Crear vacía
          </Button>
          <Button
            onClick={() => handleCrear(true)}
            disabled={creating || generating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {generating
              ? <><Loader2 className="animate-spin mr-2" size={14} />Generando con IA…</>
              : <><Sparkles size={14} className="mr-2" />Generar con IA</>}
          </Button>
        </div>
      </div>
    )
  }

  // Estado B — tiene matriz
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-3">
          <MessageSquare size={18} className="text-blue-500" />
          <span className="font-semibold text-sm text-gray-700">Matriz de Comunicaciones</span>
          <span className="text-xs text-muted-foreground">
            v{matriz.version} · {matriz.filas.length} filas
            {matriz.generadoConIA && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-indigo-500">
                <Sparkles size={10} /> IA
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleAddFila}>
            <Plus size={14} className="mr-1" /> Agregar fila
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPdf}>
            <Download size={14} className="mr-1" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Legend — personal siglas */}
      {personal.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-b bg-slate-50">
          <span className="text-[10px] text-muted-foreground self-center">Personal:</span>
          {personal.map(p => (
            <span
              key={p.siglas}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-mono font-semibold"
              title={`${p.nombre} — ${p.cargo}`}
            >
              {p.siglas}
              <span className="font-normal text-indigo-500">{p.nombre.split(' ')[0]}</span>
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead className="w-8 text-center">#</TableHead>
              <TableHead className="min-w-[200px]">Información / Comunicación</TableHead>
              <TableHead className="min-w-[140px]">Emisor</TableHead>
              <TableHead className="min-w-[120px]">Receptores</TableHead>
              <TableHead className="min-w-[130px]">Medio</TableHead>
              <TableHead className="min-w-[110px]">Frecuencia</TableHead>
              <TableHead className="min-w-[110px]">Formato</TableHead>
              <TableHead className="min-w-[130px]">Notas</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {matriz.filas.map((fila, idx) => {
              const isEditing = editingId === fila.id
              const receptores = parseReceptores(fila.receptores)

              if (isEditing) {
                return (
                  <TableRow key={fila.id} className="bg-blue-50">
                    <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={editRow.informacion ?? ''}
                        onChange={e => setEditRow(r => ({ ...r, informacion: e.target.value }))}
                        className="h-7 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editRow.emisor ?? ''}
                        onChange={e => setEditRow(r => ({ ...r, emisor: e.target.value }))}
                        className="h-7 text-xs"
                        placeholder="Cargo del emisor"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {personal.map(p => {
                          const selected = editRow.receptoresArr?.includes(p.siglas)
                          return (
                            <button
                              key={p.siglas}
                              type="button"
                              onClick={() => toggleReceptor(p.siglas)}
                              className={[
                                'px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition-colors',
                                selected
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-gray-500 border-gray-300 hover:border-indigo-400',
                              ].join(' ')}
                              title={p.nombre}
                            >
                              {p.siglas}
                            </button>
                          )
                        })}
                        {personal.length === 0 && (
                          <Input
                            value={editRow.receptoresArr?.join(', ') ?? ''}
                            onChange={e =>
                              setEditRow(r => ({
                                ...r,
                                receptoresArr: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                              }))
                            }
                            className="h-7 text-xs w-28"
                            placeholder="JM, CA, ..."
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={editRow.medio ?? ''}
                        onValueChange={v => setEditRow(r => ({ ...r, medio: v }))}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEDIOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={editRow.frecuencia ?? ''}
                        onValueChange={v => setEditRow(r => ({ ...r, frecuencia: v }))}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FRECUENCIAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editRow.formato ?? ''}
                        onChange={e => setEditRow(r => ({ ...r, formato: e.target.value }))}
                        className="h-7 text-xs"
                        placeholder="GYS-GPR-001"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editRow.notas ?? ''}
                        onChange={e => setEditRow(r => ({ ...r, notas: e.target.value }))}
                        className="h-7 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          className="h-7 w-7 bg-green-600 hover:bg-green-700"
                          onClick={() => saveEdit(fila.id)}
                          disabled={savingRow}
                        >
                          {savingRow ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                          <X size={12} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              }

              return (
                <TableRow key={fila.id} className="hover:bg-slate-50 group">
                  <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="text-xs font-medium">{fila.informacion}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fila.emisor}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {receptores.map(r => (
                        <span
                          key={r}
                          className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-mono font-semibold"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fila.medio}</TableCell>
                  <TableCell>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {fila.frecuencia}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{fila.formato}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fila.notas}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(fila)}
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:text-red-600"
                        onClick={() => handleDeleteFila(fila.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}

            {matriz.filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10 text-sm">
                  No hay filas. Usa "Agregar fila" para comenzar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseReceptores(json: string): string[] {
  try { return JSON.parse(json) as string[] }
  catch { return [] }
}

function buildPersonalConSiglas(nodos: OrgNodo[]): { siglas: string; nombre: string; cargo: string }[] {
  const usadas = new Set<string>()
  return nodos
    .filter(n => n.user)
    .map(n => {
      const nombre = n.user!.name
      const siglas = generarSiglas(nombre, usadas)
      usadas.add(siglas)
      return { nombre, siglas, cargo: n.cargoLabel }
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
