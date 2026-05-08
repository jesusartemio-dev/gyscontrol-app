'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Loader2, GitBranch, Plus, Trash2, Save, Lock, Download,
  X, Eye, Pencil, Users, Building2, Phone, Hash, RefreshCw,
  ChevronUp, ChevronDown, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import OrgChart, { OrgNodoCompleto } from '@/components/organigrama/OrgChart'

interface Plantilla { id: string; nombre: string; _count?: { nodos: number } }
interface UserOption { id: string; name: string; email: string }

export default function OrganigramaProyectoPage() {
  const { id: proyectoId } = useParams<{ id: string }>()

  const [nodos, setNodos] = useState<OrgNodoCompleto[]>([])
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [usuarios, setUsuarios] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedPlantillaId, setSelectedPlantillaId] = useState('')

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Panel lateral de edición (Vista tab)
  const [panelNodo, setPanelNodo] = useState<OrgNodoCompleto | null>(null)
  const [panelSaving, setPanelSaving] = useState(false)
  const [panelUserId, setPanelUserId] = useState('')
  const [panelCargo, setPanelCargo] = useState('')
  const [panelTelefono, setPanelTelefono] = useState('')
  const [panelCip, setPanelCip] = useState('')
  const [panelEmpresa, setPanelEmpresa] = useState('')

  // Edición inline en tabla (Editar tab)
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [rowUserId, setRowUserId] = useState('')
  const [rowCargo, setRowCargo] = useState('')
  const [rowTelefono, setRowTelefono] = useState('')
  const [rowCip, setRowCip] = useState('')
  const [rowEmpresa, setRowEmpresa] = useState('')
  const [rowSaving, setRowSaving] = useState(false)

  // Agregar nodo
  const [addingNodo, setAddingNodo] = useState(false)
  const [newCargo, setNewCargo] = useState('')
  const [newParentId, setNewParentId] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  const loadNodos = useCallback(async () => {
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/organigrama`)
      if (res.ok) setNodos(await res.json())
    } catch {
      toast.error('Error al cargar organigrama')
    } finally {
      setLoading(false)
    }
  }, [proyectoId])

  useEffect(() => {
    const init = async () => {
      const [pRes, uRes] = await Promise.all([
        fetch('/api/configuracion/plantillas-organigrama'),
        fetch('/api/admin/usuarios'),
      ])
      if (pRes.ok) setPlantillas(await pRes.json())
      if (uRes.ok) {
        const data = await uRes.json()
        setUsuarios(Array.isArray(data) ? data : (data.users ?? []))
      }
      await loadNodos()
    }
    init()
  }, [loadNodos])

  // ── GENERAR ────────────────────────────────────────────────────────────────

  const handleGenerar = async (plantillaId: string | null) => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/organigrama`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantillaId: plantillaId || null }),
      })
      if (!res.ok) throw new Error()
      setNodos(await res.json())
      toast.success('Organigrama generado')
    } catch {
      toast.error('Error al generar organigrama')
    } finally {
      setGenerating(false)
    }
  }

  // ── PANEL LATERAL ──────────────────────────────────────────────────────────

  const openPanel = (nodo: OrgNodoCompleto) => {
    setPanelNodo(nodo)
    setPanelCargo(nodo.cargoLabel)
    setPanelUserId(nodo.user?.id ?? '')
    setPanelTelefono(nodo.telefonoOverride ?? '')
    setPanelCip(nodo.cipOverride ?? '')
    setPanelEmpresa(nodo.empresaOverride ?? '')
  }

  const handlePanelSave = async () => {
    if (!panelNodo) return
    setPanelSaving(true)
    try {
      const res = await fetch(
        `/api/proyectos/${proyectoId}/organigrama/nodos/${panelNodo.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cargoLabel: panelCargo.trim() || undefined,
            userId: panelUserId || null,
            telefonoOverride: panelTelefono.trim() || null,
            cipOverride: panelCip.trim() || null,
            empresaOverride: panelEmpresa.trim() || null,
          }),
        }
      )
      if (!res.ok) throw new Error()
      toast.success('Nodo actualizado')
      await loadNodos()
      setPanelNodo(null)
    } catch {
      toast.error('Error al guardar')
    } finally {
      setPanelSaving(false)
    }
  }

  // ── EDICIÓN INLINE ─────────────────────────────────────────────────────────

  const startEditRow = (nodo: OrgNodoCompleto) => {
    setEditingRowId(nodo.id)
    setRowCargo(nodo.cargoLabel)
    setRowUserId(nodo.user?.id ?? '')
    setRowTelefono(nodo.telefonoOverride ?? '')
    setRowCip(nodo.cipOverride ?? '')
    setRowEmpresa(nodo.empresaOverride ?? '')
  }

  const handleRowSave = async (nodoId: string) => {
    setRowSaving(true)
    try {
      const res = await fetch(
        `/api/proyectos/${proyectoId}/organigrama/nodos/${nodoId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cargoLabel: rowCargo.trim() || undefined,
            userId: rowUserId || null,
            telefonoOverride: rowTelefono.trim() || null,
            cipOverride: rowCip.trim() || null,
            empresaOverride: rowEmpresa.trim() || null,
          }),
        }
      )
      if (!res.ok) throw new Error()
      toast.success('Guardado')
      setEditingRowId(null)
      await loadNodos()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setRowSaving(false)
    }
  }

  const handleDeleteNodo = async (nodoId: string) => {
    if (!confirm('¿Eliminar este nodo?')) return
    try {
      const res = await fetch(
        `/api/proyectos/${proyectoId}/organigrama/nodos/${nodoId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Error al eliminar')
        return
      }
      toast.success('Nodo eliminado')
      await loadNodos()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  // ── REORDENAR NODO ─────────────────────────────────────────────────────────

  const handleMoveNodo = async (nodoId: string, direction: 'up' | 'down') => {
    const nodo = nodos.find(n => n.id === nodoId)
    if (!nodo) return

    const siblings = nodos
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
        fetch(`/api/proyectos/${proyectoId}/organigrama/nodos/${u.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orden: u.newOrden }),
        })
      ))
      await loadNodos()
    } catch {
      toast.error('Error al reordenar')
    }
  }

  // ── AGREGAR NODO ───────────────────────────────────────────────────────────

  const handleAddNodo = async () => {
    const label = newCargo.trim()
    if (!label) { toast.error('Escribe el cargo'); return }
    const parentId = newParentId || null
    const siblings = nodos.filter(n => n.parentId === parentId)
    const nextOrden = siblings.length * 10
    setAddSaving(true)
    try {
      const res = await fetch(
        `/api/proyectos/${proyectoId}/organigrama/nodos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cargoLabel: label, parentId, orden: nextOrden }),
        }
      )
      if (!res.ok) throw new Error()
      toast.success('Nodo agregado')
      setAddingNodo(false)
      setNewCargo('')
      setNewParentId('')
      await loadNodos()
    } catch {
      toast.error('Error al agregar nodo')
    } finally {
      setAddSaving(false)
    }
  }

  // ── ELIMINAR ORGANIGRAMA ───────────────────────────────────────────────────

  const handleEliminarOrganigrama = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/organigrama`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error ?? 'Error al eliminar')
        return
      }
      setNodos([])
      setShowDeleteDialog(false)
      toast.success('Organigrama eliminado')
    } catch {
      setDeleteError('Error de conexión')
    } finally {
      setDeleting(false)
    }
  }

  // ── EXPORTAR PNG ───────────────────────────────────────────────────────────

  const handleExportPng = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default
      const container = document.getElementById('org-chart-container')
      if (!container) { toast.error('No se encontró el organigrama'); return }
      const canvas = await html2canvas(container, { backgroundColor: '#F8FAFC', scale: 2 })
      const link = document.createElement('a')
      link.download = `organigrama-${proyectoId}.png`
      link.href = canvas.toDataURL()
      link.click()
      toast.success('Imagen exportada')
    } catch {
      toast.error('Error al exportar imagen')
    }
  }

  // ── LOADING ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  // ── ESTADO A: Sin organigrama ──────────────────────────────────────────────

  if (nodos.length === 0) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-indigo-50 rounded-2xl">
              <GitBranch className="h-10 w-10 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Sin organigrama</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Genera la estructura del equipo desde una plantilla o crea desde cero
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4 text-left">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Usar plantilla
              </Label>
              <Select value={selectedPlantillaId} onValueChange={setSelectedPlantillaId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Seleccionar plantilla..." />
                </SelectTrigger>
                <SelectContent>
                  {plantillas.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span>{p.nombre}</span>
                      {p._count && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({p._count.nodos} nodos)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full h-10"
              disabled={!selectedPlantillaId || generating}
              onClick={() => handleGenerar(selectedPlantillaId)}
            >
              {generating
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <GitBranch className="h-4 w-4 mr-2" />}
              Generar desde plantilla
            </Button>

            <div className="relative flex items-center">
              <div className="flex-1 border-t" />
              <span className="px-3 text-xs text-muted-foreground">o</span>
              <div className="flex-1 border-t" />
            </div>

            <Button
              variant="outline"
              className="w-full h-10"
              disabled={generating}
              onClick={() => handleGenerar(null)}
            >
              {generating
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Plus className="h-4 w-4 mr-2" />}
              Crear desde cero (solo nodos GYS)
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── ESTADO B: Organigrama existe ───────────────────────────────────────────

  const nodosGys = nodos.filter(n => n.esFijoGys)
  const nodosProyecto = nodos.filter(n => !n.esFijoGys)
  const vacantes = nodos.filter(n => !n.user).length

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-indigo-500" />
            <span className="font-semibold text-gray-800">Organigrama</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-mono">
              {nodos.length} nodos
            </span>
            {vacantes > 0 && (
              <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded-full text-xs font-medium">
                {vacantes} vacante{vacantes > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground gap-1.5"
            onClick={handleExportPng}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar PNG
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5"
            onClick={() => { setDeleteError(null); setShowDeleteDialog(true) }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 gap-1.5"
            onClick={() => {
              if (confirm('¿Regenerar el organigrama? Se perderán los cambios actuales.')) {
                handleGenerar(selectedPlantillaId || null)
              }
            }}
          >
            {generating
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerar
          </Button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="vista" className="flex flex-col flex-1 min-h-0">
        <div className="px-6 pt-3 pb-0 border-b bg-white">
          <TabsList className="h-9 bg-gray-100/80 p-0.5 gap-0.5">
            <TabsTrigger value="vista" className="h-8 px-4 text-sm gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Eye className="h-3.5 w-3.5" />
              Vista
            </TabsTrigger>
            <TabsTrigger value="editar" className="h-8 px-4 text-sm gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Pencil className="h-3.5 w-3.5" />
              Editar nodos
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── TAB VISTA ──────────────────────────────────────────────────── */}
        <TabsContent value="vista" className="flex-1 flex min-h-0 m-0">
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Chart area */}
            <div className="flex-1 min-w-0 overflow-auto bg-slate-50">
              <OrgChart nodos={nodos} onNodoClick={openPanel} />
            </div>

            {/* Panel de edición lateral */}
            {panelNodo && (
              <div className="w-72 border-l bg-white flex flex-col flex-shrink-0 overflow-y-auto">
                {/* Panel header */}
                <div className={`px-4 py-3 border-b flex items-center justify-between ${panelNodo.esFijoGys ? 'bg-[#2E4057]' : 'bg-white'}`}>
                  <div className={`text-sm font-semibold ${panelNodo.esFijoGys ? 'text-white' : 'text-gray-800'}`}>
                    {panelNodo.esFijoGys ? '🔒 Nodo GYS' : 'Editar nodo'}
                  </div>
                  <button
                    onClick={() => setPanelNodo(null)}
                    className={`${panelNodo.esFijoGys ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4 space-y-4 flex-1">
                  {panelNodo.esFijoGys && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      Cargo no editable. Solo puedes cambiar la persona asignada y datos de contacto.
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Cargo</Label>
                    <Input
                      value={panelCargo}
                      onChange={e => setPanelCargo(e.target.value)}
                      disabled={panelNodo.esFijoGys}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Persona asignada
                    </Label>
                    <Select
                      value={panelUserId || '__none__'}
                      onValueChange={v => setPanelUserId(v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Sin asignar</SelectItem>
                        {usuarios.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> Empresa (override)
                    </Label>
                    <Input
                      value={panelEmpresa}
                      onChange={e => setPanelEmpresa(e.target.value)}
                      placeholder="GYS CONTROL INDUSTRIAL SAC"
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Teléfono
                      </Label>
                      <Input
                        value={panelTelefono}
                        onChange={e => setPanelTelefono(e.target.value)}
                        placeholder="Override"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Hash className="h-3 w-3" /> CIP
                      </Label>
                      <Input
                        value={panelCip}
                        onChange={e => setPanelCip(e.target.value)}
                        placeholder="Override"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t">
                  <Button onClick={handlePanelSave} disabled={panelSaving} className="w-full h-9">
                    {panelSaving
                      ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      : <Save className="h-4 w-4 mr-2" />}
                    Guardar cambios
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── TAB EDITAR ─────────────────────────────────────────────────── */}
        <TabsContent value="editar" className="flex-1 overflow-auto m-0 p-6 space-y-4 bg-slate-50">
          {(() => {
            // Sort nodes depth-first so siblings appear together in order
            const byId = Object.fromEntries(nodos.map(n => [n.id, n]))
            const childrenMap: Record<string, OrgNodoCompleto[]> = {}
            for (const n of nodos) {
              const pid = n.parentId ?? '__root__'
              if (!childrenMap[pid]) childrenMap[pid] = []
              childrenMap[pid].push(n)
            }
            for (const pid of Object.keys(childrenMap)) {
              childrenMap[pid].sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id))
            }
            const sortedNodos: OrgNodoCompleto[] = []
            const depthMap: Record<string, number> = {}
            function walk(pid: string, depth: number) {
              for (const n of (childrenMap[pid] ?? [])) {
                depthMap[n.id] = depth
                sortedNodos.push(n)
                walk(n.id, depth + 1)
              }
            }
            walk('__root__', 0)

            // Sibling position info for ↑/↓ disabled state
            const posMap: Record<string, { isFirst: boolean; isLast: boolean }> = {}
            for (const pid of Object.keys(childrenMap)) {
              const sorted = childrenMap[pid]
              sorted.forEach((n, i) => {
                posMap[n.id] = { isFirst: i === 0, isLast: i === sorted.length - 1 }
              })
            }
            void byId

            return (
          <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-8 pl-4"></TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Persona asignada</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>CIP</TableHead>
                  <TableHead className="w-[140px] text-right pr-4">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedNodos.map(nodo => {
                  const isEditing = editingRowId === nodo.id
                  const depth = depthMap[nodo.id] ?? 0
                  const pos = posMap[nodo.id]
                  return (
                    <TableRow
                      key={nodo.id}
                      className={isEditing ? 'bg-indigo-50/70' : nodo.esFijoGys ? 'bg-slate-50/50' : ''}
                    >
                      <TableCell className="pl-4 py-2">
                        {nodo.esFijoGys && (
                          <Lock className="h-3.5 w-3.5 text-amber-400" aria-label="Nodo corporativo GYS" />
                        )}
                      </TableCell>
                      <TableCell className="py-2 font-medium text-sm">
                        <div style={{ paddingLeft: `${depth * 16}px` }}>
                        {isEditing ? (
                          <Input
                            value={rowCargo}
                            onChange={e => setRowCargo(e.target.value)}
                            disabled={nodo.esFijoGys}
                            className="h-7 text-xs w-44"
                          />
                        ) : (
                          <span className={nodo.esFijoGys ? 'text-[#2E4057] font-semibold text-xs uppercase tracking-wide' : 'text-sm'}>
                            {nodo.cargoLabel}
                          </span>
                        )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {isEditing ? (
                          <Select
                            value={rowUserId || '__none__'}
                            onValueChange={v => setRowUserId(v === '__none__' ? '' : v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-44">
                              <SelectValue placeholder="Sin asignar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— Sin asignar</SelectItem>
                              {usuarios.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : nodo.user ? (
                          <div>
                            <div className="text-sm font-medium">{nodo.user.name}</div>
                            <div className="text-xs text-muted-foreground">{nodo.user.email}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-red-400 italic font-medium">Vacante</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">
                        {isEditing ? (
                          <Input
                            value={rowEmpresa}
                            onChange={e => setRowEmpresa(e.target.value)}
                            placeholder="GYS CONTROL..."
                            className="h-7 text-xs w-40"
                          />
                        ) : (
                          <span className="truncate max-w-[160px] block" title={nodo._empresa}>
                            {nodo._empresa}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-xs">
                        {isEditing ? (
                          <Input
                            value={rowTelefono}
                            onChange={e => setRowTelefono(e.target.value)}
                            placeholder="Override"
                            className="h-7 text-xs w-32"
                          />
                        ) : (
                          nodo._telefono ?? <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-xs">
                        {isEditing ? (
                          <Input
                            value={rowCip}
                            onChange={e => setRowCip(e.target.value)}
                            placeholder="Override"
                            className="h-7 text-xs w-28"
                          />
                        ) : (
                          nodo._cip ?? <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 pr-4">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button size="sm" className="h-7 px-2" disabled={rowSaving} onClick={() => handleRowSave(nodo.id)}>
                                {rowSaving
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Save className="h-3.5 w-3.5" />}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingRowId(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {!nodo.esFijoGys && (
                                <>
                                  <Button
                                    size="sm" variant="ghost"
                                    className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                                    disabled={pos?.isFirst}
                                    onClick={() => handleMoveNodo(nodo.id, 'up')}
                                    title="Mover arriba"
                                  >
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm" variant="ghost"
                                    className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                                    disabled={pos?.isLast}
                                    onClick={() => handleMoveNodo(nodo.id, 'down')}
                                    title="Mover abajo"
                                  >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditRow(nodo)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {!nodo.esFijoGys && (
                                <Button
                                  size="sm" variant="ghost"
                                  className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteNodo(nodo.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
            )
          })()}

          {/* Agregar nodo */}
          {addingNodo ? (
            <div className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Nuevo nodo</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Cargo *</Label>
                  <Input
                    value={newCargo}
                    onChange={e => setNewCargo(e.target.value)}
                    placeholder="Ej: Técnico Electricista"
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddNodo()
                      if (e.key === 'Escape') setAddingNodo(false)
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nodo padre (opcional)</Label>
                  <Select value={newParentId || '__none__'} onValueChange={v => setNewParentId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Sin padre (raíz)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin padre</SelectItem>
                      {nodos.map(n => (
                        <SelectItem key={n.id} value={n.id}>{n.cargoLabel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddNodo} disabled={addSaving}>
                  {addSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Agregar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingNodo(false); setNewCargo(''); setNewParentId('') }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingNodo(true)}
              className="gap-2 bg-white"
            >
              <Plus className="h-4 w-4" />
              Agregar nodo
            </Button>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={open => { setShowDeleteDialog(open); if (!open) setDeleteError(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el organigrama?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los nodos y asignaciones de personal. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <div className="flex gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction
                onClick={e => { e.preventDefault(); handleEliminarOrganigrama() }}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Sí, eliminar
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
