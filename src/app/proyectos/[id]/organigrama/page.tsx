'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Loader2, GitBranch, Plus, Trash2, Save, Lock, Download,
  X, Eye, Pencil, Users, Building2, Phone, Hash, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
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

  // ── GENERAR ORGANIGRAMA ────────────────────────────────────────────────────

  const handleGenerar = async (plantillaId: string | null) => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/organigrama`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantillaId: plantillaId || null }),
      })
      if (!res.ok) throw new Error()
      const creados: OrgNodoCompleto[] = await res.json()
      setNodos(creados)
      toast.success('Organigrama generado')
    } catch {
      toast.error('Error al generar organigrama')
    } finally {
      setGenerating(false)
    }
  }

  // ── PANEL LATERAL (Vista tab) ──────────────────────────────────────────────

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

  // ── EDICIÓN INLINE (Editar tab) ────────────────────────────────────────────

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

  // ── AGREGAR NODO ───────────────────────────────────────────────────────────

  const handleAddNodo = async () => {
    const label = newCargo.trim()
    if (!label) { toast.error('Escribe el cargo'); return }
    setAddSaving(true)
    try {
      const res = await fetch(
        `/api/proyectos/${proyectoId}/organigrama/nodos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cargoLabel: label,
            parentId: newParentId || null,
            orden: 0,
          }),
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

  // ── EXPORTAR PNG ───────────────────────────────────────────────────────────

  const handleExportPng = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default
      const container = document.getElementById('org-chart-container')
      if (!container) { toast.error('No se encontró el organigrama'); return }
      const canvas = await html2canvas(container, { backgroundColor: '#F9FAFB', scale: 2 })
      const link = document.createElement('a')
      link.download = `organigrama-${proyectoId}.png`
      link.href = canvas.toDataURL()
      link.click()
      toast.success('Imagen exportada')
    } catch {
      toast.error('Error al exportar imagen')
    }
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  // ── ESTADO A: Sin organigrama ──────────────────────────────────────────────

  if (nodos.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 rounded-xl">
            <GitBranch className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Organigrama del Proyecto</h2>
            <p className="text-sm text-muted-foreground">Este proyecto no tiene organigrama aún</p>
          </div>
        </div>

        <div className="max-w-lg space-y-5 bg-white rounded-xl border p-6">
          <div className="space-y-2">
            <Label>Usar plantilla</Label>
            <Select value={selectedPlantillaId} onValueChange={setSelectedPlantillaId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar plantilla..." />
              </SelectTrigger>
              <SelectContent>
                {plantillas.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                    {p._count && (
                      <span className="ml-2 text-xs text-muted-foreground">({p._count.nodos} nodos)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={!selectedPlantillaId || generating}
            onClick={() => handleGenerar(selectedPlantillaId)}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <GitBranch className="h-4 w-4 mr-2" />}
            Generar desde plantilla
          </Button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t" />
            <span className="text-xs text-muted-foreground">o</span>
            <div className="flex-1 border-t" />
          </div>

          <Button
            variant="outline"
            className="w-full"
            disabled={generating}
            onClick={() => handleGenerar(null)}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Crear desde cero (solo nodos GYS)
          </Button>
        </div>
      </div>
    )
  }

  // ── ESTADO B: Organigrama existe ───────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <GitBranch className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Organigrama del Proyecto</h2>
            <p className="text-sm text-muted-foreground">{nodos.length} nodos</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
          onClick={() => {
            if (confirm('¿Regenerar el organigrama? Se perderán los cambios actuales.')) {
              handleGenerar(selectedPlantillaId || null)
            }
          }}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Regenerar
        </Button>
      </div>

      <Tabs defaultValue="vista">
        <TabsList>
          <TabsTrigger value="vista" className="gap-2">
            <Eye className="h-4 w-4" />
            Vista Organigrama
          </TabsTrigger>
          <TabsTrigger value="editar" className="gap-2">
            <Pencil className="h-4 w-4" />
            Editar Nodos
          </TabsTrigger>
        </TabsList>

        {/* ── TAB VISTA ──────────────────────────────────────────────────── */}
        <TabsContent value="vista" className="mt-4">
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <OrgChart nodos={nodos} onNodoClick={openPanel} />
              <div className="flex justify-end mt-3">
                <Button variant="outline" size="sm" onClick={handleExportPng} className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar PNG
                </Button>
              </div>
            </div>

            {/* Panel de edición lateral */}
            {panelNodo && (
              <div className="w-72 border rounded-xl bg-white p-4 space-y-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Editar nodo
                  </h3>
                  <button onClick={() => setPanelNodo(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {panelNodo.esFijoGys && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                    Nodo corporativo GYS
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Cargo</Label>
                  <Input
                    value={panelCargo}
                    onChange={e => setPanelCargo(e.target.value)}
                    disabled={panelNodo.esFijoGys}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Persona asignada</Label>
                  <Select value={panelUserId || '__none__'} onValueChange={v => setPanelUserId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin asignar</SelectItem>
                      {usuarios.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Empresa (override)</Label>
                  <Input
                    value={panelEmpresa}
                    onChange={e => setPanelEmpresa(e.target.value)}
                    placeholder="GYS CONTROL INDUSTRIAL SAC"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Teléfono (override)</Label>
                  <Input
                    value={panelTelefono}
                    onChange={e => setPanelTelefono(e.target.value)}
                    placeholder="Vacío = usar del empleado"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> CIP (override)</Label>
                  <Input
                    value={panelCip}
                    onChange={e => setPanelCip(e.target.value)}
                    placeholder="Vacío = usar del empleado"
                    className="h-8 text-sm"
                  />
                </div>

                <Button onClick={handlePanelSave} disabled={panelSaving} className="w-full h-8 text-sm">
                  {panelSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── TAB EDITAR ─────────────────────────────────────────────────── */}
        <TabsContent value="editar" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>CIP</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodos.map(nodo => {
                  const isEditing = editingRowId === nodo.id
                  return (
                    <React.Fragment key={nodo.id}>
                      <TableRow className={isEditing ? 'bg-indigo-50' : ''}>
                        <TableCell className="p-2">
                          {nodo.esFijoGys && (
                            <Lock className="h-3.5 w-3.5 text-amber-500" aria-label="Nodo corporativo GYS" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {isEditing ? (
                            <Input
                              value={rowCargo}
                              onChange={e => setRowCargo(e.target.value)}
                              disabled={nodo.esFijoGys}
                              className="h-7 text-xs w-40"
                            />
                          ) : (
                            <span className={nodo.esFijoGys ? 'text-indigo-800 font-semibold' : ''}>
                              {nodo.cargoLabel}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {isEditing ? (
                            <Select value={rowUserId || '__none__'} onValueChange={v => setRowUserId(v === '__none__' ? '' : v)}>
                              <SelectTrigger className="h-7 text-xs w-40">
                                <SelectValue placeholder="Sin asignar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Sin asignar</SelectItem>
                                {usuarios.map(u => (
                                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : nodo.user ? (
                            <div>
                              <div className="font-medium text-xs">{nodo.user.name}</div>
                              <div className="text-[10px] text-muted-foreground">{nodo.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-red-400 italic">Vacante</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {isEditing ? (
                            <Input
                              value={rowEmpresa}
                              onChange={e => setRowEmpresa(e.target.value)}
                              placeholder="GYS CONTROL..."
                              className="h-7 text-xs w-40"
                            />
                          ) : (
                            <span className="text-muted-foreground">{nodo._empresa}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
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
                        <TableCell className="text-xs">
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
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  disabled={rowSaving}
                                  onClick={() => handleRowSave(nodo.id)}
                                >
                                  {rowSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => setEditingRowId(null)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => startEditRow(nodo)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                {!nodo.esFijoGys && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
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
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Agregar nodo */}
          {addingNodo ? (
            <div className="border rounded-lg bg-white p-4 space-y-3">
              <h4 className="text-sm font-semibold">Nuevo nodo</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Cargo *</Label>
                  <Input
                    value={newCargo}
                    onChange={e => setNewCargo(e.target.value)}
                    placeholder="Ej: Técnico Electricista"
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleAddNodo(); if (e.key === 'Escape') setAddingNodo(false) }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nodo padre (opcional)</Label>
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
                  {addSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Agregar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingNodo(false); setNewCargo(''); setNewParentId('') }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAddingNodo(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Agregar nodo
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
