'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Plus, Trash2, Save, Loader2, GitBranch, ChevronRight, ChevronUp, ChevronDown, Eye, Lock } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import OrgChart, { OrgNodoCompleto } from '@/components/organigrama/OrgChart'
import { NODOS_FIJOS_GYS } from '@/lib/organigrama/nodosGys'

interface Recurso { id: string; nombre: string; tipo: string }
interface NodoPlantilla {
  id: string
  plantillaId: string
  parentId: string | null
  orden: number
  cargoLabel: string
  recursoId: string | null
  esObligatorio: boolean
  recurso: Recurso | null
}

interface Plantilla {
  id: string
  nombre: string
  descripcion: string | null
  nodos: NodoPlantilla[]
}

// Construye nodos sintéticos para la vista previa: GYS fijos + plantilla anclada bajo GERENCIA DE PROYECTOS
function buildPreviewNodos(nodos: NodoPlantilla[]): OrgNodoCompleto[] {
  const gysIdMap: Record<string, string> = {}

  const gysNodos: OrgNodoCompleto[] = NODOS_FIJOS_GYS.map(def => {
    const id = `gys-${def.cargoLabel.toLowerCase().replace(/[\s/]+/g, '-')}`
    gysIdMap[def.cargoLabel] = id
    return {
      id,
      parentId: def.parentLabel ? (gysIdMap[def.parentLabel] ?? null) : null,
      orden: def.orden,
      cargoLabel: def.cargoLabel,
      esFijoGys: true,
      cipOverride: null,
      telefonoOverride: null,
      empresaOverride: null,
      user: null,
      _telefono: null,
      _cip: null,
      _empresa: 'GYS CONTROL INDUSTRIAL SAC',
    }
  })

  const anchorId = gysIdMap['GERENCIA DE PROYECTOS']

  // Two-pass: assign IDs first, then resolve parentIds
  const pltIdMap: Record<string, string> = {}
  for (const n of nodos) pltIdMap[n.id] = `plt-${n.id}`

  const pltNodos: OrgNodoCompleto[] = nodos.map(n => ({
    id: pltIdMap[n.id],
    parentId: n.parentId ? (pltIdMap[n.parentId] ?? anchorId) : anchorId,
    orden: n.orden,
    cargoLabel: n.cargoLabel,
    esFijoGys: false,
    cipOverride: null,
    telefonoOverride: null,
    empresaOverride: null,
    user: null,
    _telefono: null,
    _cip: null,
    _empresa: 'GYS CONTROL INDUSTRIAL SAC',
  }))

  return [...gysNodos, ...pltNodos]
}

export default function PlantillaEditorPage() {
  const params = useParams()
  const router = useRouter()
  const plantillaId = params.id as string

  const [plantilla, setPlantilla] = useState<Plantilla | null>(null)
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNodoId, setSelectedNodoId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [addingChild, setAddingChild] = useState<string | null>(null)
  const [newCargoLabel, setNewCargoLabel] = useState('')
  const [deleteNodoId, setDeleteNodoId] = useState<string | null>(null)

  const [formLabel, setFormLabel] = useState('')
  const [formRecursoId, setFormRecursoId] = useState('')
  const [formObligatorio, setFormObligatorio] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [pRes, rRes] = await Promise.all([
        fetch(`/api/configuracion/plantillas-organigrama/${plantillaId}`),
        fetch('/api/recurso?activos=true'),
      ])
      if (!pRes.ok) { router.push('/configuracion/plantillas-organigrama'); return }
      const [p, r] = await Promise.all([pRes.json(), rRes.json()])
      setPlantilla(p)
      setRecursos(Array.isArray(r) ? r.filter((x: Recurso) => x.tipo === 'individual') : [])
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [plantillaId, router])

  useEffect(() => { loadData() }, [loadData])

  const selectedNodo = plantilla?.nodos.find(n => n.id === selectedNodoId) ?? null

  useEffect(() => {
    if (selectedNodo) {
      setFormLabel(selectedNodo.cargoLabel)
      setFormRecursoId(selectedNodo.recursoId ?? '')
      setFormObligatorio(selectedNodo.esObligatorio)
    }
  }, [selectedNodoId])

  const handleSaveNodo = async () => {
    if (!selectedNodo || !formLabel.trim()) return
    setSaving(true)
    try {
      const res = await fetch(
        `/api/configuracion/plantillas-organigrama/${plantillaId}/nodos/${selectedNodo.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cargoLabel: formLabel.trim(),
            recursoId: formRecursoId || null,
            esObligatorio: formObligatorio,
          }),
        }
      )
      if (!res.ok) throw new Error()
      toast.success('Nodo actualizado')
      await loadData()
    } catch {
      toast.error('Error al guardar nodo')
    } finally {
      setSaving(false)
    }
  }

  const handleMoveNodo = async (nodoId: string, direction: 'up' | 'down') => {
    const nodo = plantilla?.nodos.find(n => n.id === nodoId)
    if (!nodo || !plantilla) return

    const siblings = plantilla.nodos
      .filter(n => n.parentId === nodo.parentId)
      .sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id))

    const idx = siblings.findIndex(n => n.id === nodoId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= siblings.length) return

    const reordered = [...siblings]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]

    const updates = reordered
      .map((n, i) => ({ id: n.id, newOrden: i * 10, currentOrden: n.orden }))
      .filter(u => u.newOrden !== u.currentOrden)

    try {
      await Promise.all(updates.map(u =>
        fetch(`/api/configuracion/plantillas-organigrama/${plantillaId}/nodos/${u.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orden: u.newOrden }),
        })
      ))
      await loadData()
    } catch {
      toast.error('Error al reordenar nodo')
    }
  }

  const handleAddNodo = async (parentId: string | null) => {
    const label = newCargoLabel.trim()
    if (!label) { toast.error('Escribe el cargo del nodo'); return }
    const siblings = (plantilla?.nodos ?? []).filter(n => n.parentId === parentId)
    const nextOrden = siblings.length * 10
    try {
      const res = await fetch(
        `/api/configuracion/plantillas-organigrama/${plantillaId}/nodos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cargoLabel: label, parentId, orden: nextOrden }),
        }
      )
      if (!res.ok) throw new Error()
      const created = await res.json()
      toast.success('Nodo agregado')
      setNewCargoLabel('')
      setAddingChild(null)
      await loadData()
      setSelectedNodoId(created.id)
    } catch {
      toast.error('Error al agregar nodo')
    }
  }

  const handleDeleteNodo = async (nodoId: string) => {
    try {
      const res = await fetch(
        `/api/configuracion/plantillas-organigrama/${plantillaId}/nodos/${nodoId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error()
      toast.success('Nodo eliminado')
      if (selectedNodoId === nodoId) setSelectedNodoId(null)
      await loadData()
    } catch {
      toast.error('Error al eliminar nodo')
    } finally {
      setDeleteNodoId(null)
    }
  }

  // Render GYS fixed nodes as read-only context in the tree
  function renderGysTree() {
    const byParent: Record<string, typeof NODOS_FIJOS_GYS> = {}
    for (const def of NODOS_FIJOS_GYS) {
      const key = def.parentLabel ?? '__root__'
      if (!byParent[key]) byParent[key] = []
      byParent[key].push(def)
    }

    function renderGysLevel(parentLabel: string | null, level: number): React.ReactNode {
      const key = parentLabel ?? '__root__'
      const items = byParent[key] ?? []
      return items.sort((a, b) => a.orden - b.orden).map(def => {
        const isGerencia = def.cargoLabel === 'GERENCIA DE PROYECTOS'
        return (
          <div key={def.cargoLabel}>
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded select-none"
              style={{ paddingLeft: `${8 + level * 16}px` }}
            >
              <Lock className="h-3 w-3 text-[#4a6480] shrink-0" />
              <span className="text-xs font-semibold text-[#2E4057] uppercase tracking-wide truncate">
                {def.cargoLabel}
              </span>
              <span className="ml-1 text-[10px] px-1 py-0.5 bg-[#2E4057]/10 text-[#2E4057] rounded font-medium shrink-0">
                GYS
              </span>
            </div>
            {renderGysLevel(def.cargoLabel, level + 1)}
            {/* Plantilla nodes anchor under GERENCIA DE PROYECTOS */}
            {isGerencia && (
              <div>
                {addingChild === '__root__' && (
                  <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${8 + (level + 1) * 16}px` }}>
                    <Input
                      value={newCargoLabel}
                      onChange={e => setNewCargoLabel(e.target.value)}
                      placeholder="Cargo del nodo raíz..."
                      className="h-7 text-xs"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddNodo(null)
                        if (e.key === 'Escape') setAddingChild(null)
                      }}
                    />
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleAddNodo(null)}>
                      Agregar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAddingChild(null)}>✕</Button>
                  </div>
                )}
                {renderNodos(null, level + 1)}
                {(plantilla?.nodos ?? []).length === 0 && addingChild !== '__root__' && (
                  <div className="text-xs text-muted-foreground italic py-1" style={{ paddingLeft: `${8 + (level + 1) * 16}px` }}>
                    Sin nodos de plantilla
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })
    }

    return renderGysLevel(null, 0)
  }

  function renderNodos(parentId: string | null, level: number): React.ReactNode {
    const hijos = (plantilla?.nodos ?? [])
      .filter(n => n.parentId === parentId)
      .sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id))

    return hijos.map((nodo, idx) => (
      <div key={nodo.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group transition-colors ${
            selectedNodoId === nodo.id
              ? 'bg-indigo-100 text-indigo-900'
              : 'hover:bg-muted/60'
          }`}
          style={{ paddingLeft: `${8 + level * 20}px` }}
          onClick={() => setSelectedNodoId(nodo.id)}
        >
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm flex-1 truncate font-medium">{nodo.cargoLabel}</span>
          {nodo.recurso && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 hidden group-hover:flex">
              {nodo.recurso.nombre}
            </Badge>
          )}
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Mover arriba"
              disabled={idx === 0}
              onClick={e => { e.stopPropagation(); handleMoveNodo(nodo.id, 'up') }}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Mover abajo"
              disabled={idx === hijos.length - 1}
              onClick={e => { e.stopPropagation(); handleMoveNodo(nodo.id, 'down') }}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              className="p-0.5 rounded text-indigo-600 hover:bg-indigo-100"
              title="Agregar hijo"
              onClick={e => { e.stopPropagation(); setAddingChild(nodo.id); setNewCargoLabel('') }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              className="p-0.5 rounded text-red-500 hover:bg-red-50"
              title="Eliminar nodo"
              onClick={e => { e.stopPropagation(); setDeleteNodoId(nodo.id) }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {addingChild === nodo.id && (
          <div className="flex items-center gap-2 pl-8 pr-2 py-1" style={{ paddingLeft: `${28 + level * 20}px` }}>
            <Input
              value={newCargoLabel}
              onChange={e => setNewCargoLabel(e.target.value)}
              placeholder="Cargo del nuevo nodo..."
              className="h-7 text-xs"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddNodo(nodo.id)
                if (e.key === 'Escape') setAddingChild(null)
              }}
            />
            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleAddNodo(nodo.id)}>
              Agregar
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAddingChild(null)}>
              ✕
            </Button>
          </div>
        )}

        {renderNodos(nodo.id, level + 1)}
      </div>
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!plantilla) return null

  const totalNodos = plantilla.nodos.length
  const previewNodos = buildPreviewNodos(plantilla.nodos)

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/configuracion/plantillas-organigrama" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-indigo-600" />
          <h1 className="text-xl font-bold">{plantilla.nombre}</h1>
        </div>
        <Badge variant="secondary">{totalNodos} nodos</Badge>
        {plantilla.descripcion && (
          <span className="text-sm text-muted-foreground">{plantilla.descripcion}</span>
        )}
      </div>

      <Tabs defaultValue="editor">
        <TabsList>
          <TabsTrigger value="editor">
            <GitBranch className="h-3.5 w-3.5 mr-1.5" />
            Estructura
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Vista previa
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Editor ───────────────────────────────────────────────── */}
        <TabsContent value="editor">
          <div className="grid grid-cols-5 gap-4 min-h-[500px]">
            {/* Árbol */}
            <div className="col-span-2 border rounded-lg bg-white overflow-auto">
              <div className="p-3 border-b flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Estructura
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => { setAddingChild('__root__'); setNewCargoLabel('') }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Nodo raíz
                </Button>
              </div>

              <div className="p-2 space-y-0.5">
                {renderGysTree()}
              </div>
            </div>

            {/* Formulario del nodo */}
            <div className="col-span-3 border rounded-lg bg-white p-4">
              {!selectedNodo ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                  <GitBranch className="h-10 w-10 opacity-30" />
                  <p className="text-sm">Selecciona un nodo para editarlo</p>
                  <p className="text-xs">o agrega uno nuevo desde el panel izquierdo</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Editar nodo
                  </h3>

                  <div className="space-y-2">
                    <Label>Cargo / Título</Label>
                    <Input
                      value={formLabel}
                      onChange={e => setFormLabel(e.target.value)}
                      placeholder="Ej: Supervisor de Proyecto"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Recurso sugerido</Label>
                    <Select value={formRecursoId || '__none__'} onValueChange={v => setFormRecursoId(v === '__none__' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin recurso sugerido" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin recurso</SelectItem>
                        {recursos.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Qué tipo de recurso ocupa este cargo (referencial)
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={formObligatorio}
                      onCheckedChange={setFormObligatorio}
                    />
                    <Label>Nodo obligatorio</Label>
                  </div>

                  <div className="pt-2">
                    <Button onClick={handleSaveNodo} disabled={saving} className="w-full">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Guardar cambios
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB: Vista previa ─────────────────────────────────────────── */}
        <TabsContent value="preview">
          <div className="border rounded-lg bg-white overflow-hidden" style={{ height: 560 }}>
            {totalNodos === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <GitBranch className="h-10 w-10 opacity-30" />
                <p className="text-sm">Agrega nodos en la pestaña Estructura para ver la vista previa</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-2 border-b bg-slate-50 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-block w-3 h-3 rounded-sm bg-[#2E4057]" />
                  <span>Nodos fijos GYS</span>
                  <span className="ml-3 inline-block w-3 h-3 rounded-sm bg-white border border-slate-300" />
                  <span>Nodos de esta plantilla (sin asignar)</span>
                  <span className="ml-auto opacity-60">Scroll para explorar</span>
                </div>
                <div style={{ height: 520, overflow: 'auto' }}>
                  <OrgChart nodos={previewNodos} compact />
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteNodoId} onOpenChange={open => { if (!open) setDeleteNodoId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar nodo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará este nodo y todos sus nodos hijos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteNodoId && handleDeleteNodo(deleteNodoId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
