'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Plus, Trash2, Save, Loader2, GitBranch, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

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

export default function PlantillaEditorPage() {
  const params = useParams()
  const router = useRouter()
  const plantillaId = params.id as string

  const [plantilla, setPlantilla] = useState<Plantilla | null>(null)
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNodoId, setSelectedNodoId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [addingChild, setAddingChild] = useState<string | null>(null) // parentId del nuevo nodo
  const [newCargoLabel, setNewCargoLabel] = useState('')

  // Form del nodo seleccionado
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
      setRecursos(Array.isArray(r) ? r.filter((x: any) => x.tipo === 'individual') : [])
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

  const handleAddNodo = async (parentId: string | null) => {
    const label = newCargoLabel.trim()
    if (!label) { toast.error('Escribe el cargo del nodo'); return }
    try {
      const res = await fetch(
        `/api/configuracion/plantillas-organigrama/${plantillaId}/nodos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cargoLabel: label, parentId, orden: 0 }),
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
    if (!confirm('¿Eliminar este nodo y todos sus hijos?')) return
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
    }
  }

  // Renderizar árbol recursivamente
  function renderNodos(parentId: string | null, level: number): React.ReactNode {
    const hijos = (plantilla?.nodos ?? [])
      .filter(n => n.parentId === parentId)
      .sort((a, b) => a.orden - b.orden)

    return hijos.map(nodo => (
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
          <div className="hidden group-hover:flex items-center gap-1">
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
              onClick={e => { e.stopPropagation(); handleDeleteNodo(nodo.id) }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Mini-form para agregar hijo */}
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

        {/* Hijos recursivos */}
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

      <div className="grid grid-cols-5 gap-4 min-h-[500px]">
        {/* ── Izquierda: árbol de nodos ────────────────────────────────── */}
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
            {/* Input para agregar nodo raíz */}
            {addingChild === '__root__' && (
              <div className="flex items-center gap-2 px-2 py-1">
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
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAddingChild(null)}>
                  ✕
                </Button>
              </div>
            )}
            {renderNodos(null, 0)}
            {totalNodos === 0 && addingChild !== '__root__' && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Sin nodos. Agrega un nodo raíz para comenzar.
              </div>
            )}
          </div>
        </div>

        {/* ── Derecha: formulario del nodo seleccionado ─────────────────── */}
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
    </div>
  )
}
