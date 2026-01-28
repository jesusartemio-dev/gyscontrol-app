'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FileCheck,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Upload,
  CheckSquare,
  Square,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { Cotizacion, CotizacionCondicion } from '@/types'

interface CondicionesTabProps {
  cotizacion: Cotizacion
  onUpdated: (updatedCotizacion: Cotizacion) => void
}

export function CondicionesTab({ cotizacion, onUpdated }: CondicionesTabProps) {
  const [condiciones, setCondiciones] = useState<CotizacionCondicion[]>(cotizacion.condiciones || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newCondicion, setNewCondicion] = useState({ descripcion: '', tipo: '' })
  const [editData, setEditData] = useState({ descripcion: '', tipo: '' })

  // Estados para importar desde condiciones
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [condicionesDisponibles, setCondicionesDisponibles] = useState<any[]>([])
  const [selectedCondicion, setSelectedCondicion] = useState('')
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append')
  const [importing, setImporting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [showItemSelection, setShowItemSelection] = useState(false)

  useEffect(() => {
    setCondiciones(cotizacion.condiciones || [])
  }, [cotizacion.condiciones])

  // Cargar condiciones disponibles desde el catálogo
  const loadCondicionesDisponibles = async () => {
    try {
      const response = await fetch('/api/catalogo/condiciones?activo=true')
      if (response.ok) {
        const data = await response.json()
        setCondicionesDisponibles(data || [])
      }
    } catch (error) {
      console.error('Error loading condiciones:', error)
    }
  }

  // Importar desde condición
  const handleImportFromCondicion = async () => {
    if (!selectedCondicion) return

    setImporting(true)
    setError(null)

    try {
      const response = await fetch(`/api/cotizacion/${cotizacion.id}/condiciones/importar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogoId: selectedCondicion,
          modo: importMode,
          itemsSeleccionados: selectedItems.length > 0 ? selectedItems : undefined
        })
      })

      if (!response.ok) throw new Error('Error al importar desde condición')

      const data = await response.json()

      // Actualizar el estado local
      setCondiciones(data.data)

      // Update parent component
      onUpdated({
        ...cotizacion,
        condiciones: data.data
      })

      setShowImportDialog(false)
      setSelectedCondicion('')
      setSelectedItems([])
      setShowItemSelection(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al importar desde condición')
      console.error('Error importing from condición:', err)
    } finally {
      setImporting(false)
    }
  }

  // Abrir diálogo de importación
  const openImportDialog = () => {
    loadCondicionesDisponibles()
    setSelectedCondicion('')
    setSelectedItems([])
    setShowItemSelection(false)
    setShowImportDialog(true)
  }

  // Manejar selección de catálogo
  const handleCondicionSelect = (condicionId: string) => {
    setSelectedCondicion(condicionId)
    setSelectedItems([])
    setShowItemSelection(true)
  }

  // Manejar selección de items individuales
  const handleItemToggle = (itemIndex: number) => {
    setSelectedItems(prev =>
      prev.includes(itemIndex)
        ? prev.filter(i => i !== itemIndex)
        : [...prev, itemIndex]
    )
  }

  // Verificar si un item ya está importado
  const isItemAlreadyImported = (itemDescription: string) => {
    return condiciones.some(cond => cond.descripcion.trim() === itemDescription.trim())
  }

  const handleAddCondicion = async () => {
    if (!newCondicion.descripcion.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/cotizacion/${cotizacion.id}/condiciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: newCondicion.descripcion.trim(),
          tipo: newCondicion.tipo.trim() || null,
          orden: condiciones.length + 1
        })
      })

      if (!response.ok) throw new Error('Error al crear condición')

      const data = await response.json()
      const updatedCondiciones = [...condiciones, data.data]
      setCondiciones(updatedCondiciones)

      // Update parent component
      onUpdated({
        ...cotizacion,
        condiciones: updatedCondiciones
      })

      setNewCondicion({ descripcion: '', tipo: '' })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al agregar la condición')
      console.error('Error adding condition:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditCondicion = async (id: string) => {
    if (!editData.descripcion.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/cotizacion/${cotizacion.id}/condiciones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: editData.descripcion.trim(),
          tipo: editData.tipo.trim() || null
        })
      })

      if (!response.ok) throw new Error('Error al actualizar condición')

      const data = await response.json()
      const updatedCondiciones = condiciones.map(cond =>
        cond.id === id ? data.data : cond
      )
      setCondiciones(updatedCondiciones)

      // Update parent component
      onUpdated({
        ...cotizacion,
        condiciones: updatedCondiciones
      })

      setEditingId(null)
      setEditData({ descripcion: '', tipo: '' })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al actualizar la condición')
      console.error('Error updating condition:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCondicion = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta condición?')) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/cotizacion/${cotizacion.id}/condiciones/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al eliminar condición')

      const updatedCondiciones = condiciones.filter(cond => cond.id !== id)
      setCondiciones(updatedCondiciones)

      // Update parent component
      onUpdated({
        ...cotizacion,
        condiciones: updatedCondiciones
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al eliminar la condición')
      console.error('Error deleting condition:', err)
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (condicion: CotizacionCondicion) => {
    setEditingId(condicion.id)
    setEditData({
      descripcion: condicion.descripcion,
      tipo: condicion.tipo || ''
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditData({ descripcion: '', tipo: '' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-500" />
              Condiciones de la Cotización
              <span className="text-sm font-normal text-muted-foreground">
                ({condiciones.length})
              </span>
            </CardTitle>
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openImportDialog}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Importar Condición
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Importar desde Catálogo
                  </DialogTitle>
                  <DialogDescription>
                    Selecciona una condición del catálogo y elige qué items importar.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="condicion">Condición del Catálogo</Label>
                    <Select value={selectedCondicion} onValueChange={handleCondicionSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una condición..." />
                      </SelectTrigger>
                      <SelectContent>
                        {condicionesDisponibles.map((condicion) => (
                          <SelectItem key={condicion.id} value={condicion.id}>
                            {condicion.nombre} ({condicion._count?.items || 0} items)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {showItemSelection && selectedCondicion && (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="modo">Modo de importación</Label>
                        <Select value={importMode} onValueChange={(value: 'replace' | 'append') => setImportMode(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="append">Agregar a existentes</SelectItem>
                            <SelectItem value="replace">Reemplazar todas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Seleccionar Items a Importar</Label>
                        <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                          {(() => {
                            const selectedTemplate = condicionesDisponibles.find(c => c.id === selectedCondicion)
                            return selectedTemplate?.items?.map((item: any, index: number) => {
                              const alreadyImported = isItemAlreadyImported(item.descripcion)
                              const isSelected = selectedItems.includes(index)

                              return (
                                <div
                                  key={index}
                                  className={`flex items-start gap-3 p-2 rounded border ${
                                    alreadyImported
                                      ? 'bg-green-50 border-green-200'
                                      : isSelected
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => !alreadyImported && handleItemToggle(index)}
                                    disabled={alreadyImported}
                                    className={`mt-0.5 ${alreadyImported ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                  >
                                    {alreadyImported ? (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : isSelected ? (
                                      <CheckSquare className="h-4 w-4 text-blue-600" />
                                    ) : (
                                      <Square className="h-4 w-4 text-gray-400" />
                                    )}
                                  </button>
                                  <div className="flex-1">
                                    <p className={`text-sm ${alreadyImported ? 'text-green-800' : 'text-gray-700'}`}>
                                      {item.descripcion}
                                    </p>
                                    {item.tipo && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Tipo: {item.tipo}
                                      </p>
                                    )}
                                    {alreadyImported && (
                                      <p className="text-xs text-green-600 mt-1">✓ Ya importado</p>
                                    )}
                                  </div>
                                </div>
                              )
                            }) || []
                          })()}
                        </div>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          <span>{selectedItems.length} seleccionados</span>
                          <span>•</span>
                          <span>{(() => {
                            const selectedTemplate = condicionesDisponibles.find(c => c.id === selectedCondicion)
                            const alreadyImportedCount = selectedTemplate?.items?.filter((item: any) =>
                              isItemAlreadyImported(item.descripcion)
                            ).length || 0
                            return `${alreadyImportedCount} ya importados`
                          })()}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowImportDialog(false)}
                    disabled={importing}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleImportFromCondicion}
                    disabled={!selectedCondicion || selectedItems.length === 0 || importing}
                    className="flex items-center gap-2"
                  >
                    {importing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {importing ? 'Importando...' : `Importar ${selectedItems.length} items`}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Operación realizada exitosamente
              </AlertDescription>
            </Alert>
          )}

          {/* Agregar nueva condición */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Agregar Nueva Condición</Label>
            <div className="space-y-3">
              <Select
                value={newCondicion.tipo}
                onValueChange={(value) => setNewCondicion(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar tipo de condición (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="tecnica">Técnica</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="operativa">Operativa</SelectItem>
                  <SelectItem value="financiera">Financiera</SelectItem>
                </SelectContent>
              </Select>

              <Textarea
                value={newCondicion.descripcion}
                onChange={(e) => setNewCondicion(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Ej: Los precios están sujetos a variaciones del tipo de cambio..."
                rows={3}
              />

              <Button
                onClick={handleAddCondicion}
                disabled={loading || !newCondicion.descripcion.trim()}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Agregar Condición
              </Button>
            </div>
          </div>

          {/* Lista de condiciones */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Condiciones Configuradas</Label>

            {condiciones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay condiciones configuradas</p>
                <p className="text-sm">Agrega condiciones para mayor claridad contractual</p>
              </div>
            ) : (
              <div className="space-y-3">
                {condiciones.map((condicion, index) => (
                  <motion.div
                    key={condicion.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-start gap-3 p-4 border rounded-lg bg-blue-50/50"
                  >
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      {editingId === condicion.id ? (
                        <div className="space-y-3">
                          <Select
                            value={editData.tipo}
                            onValueChange={(value) => setEditData(prev => ({ ...prev, tipo: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Tipo (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="comercial">Comercial</SelectItem>
                              <SelectItem value="tecnica">Técnica</SelectItem>
                              <SelectItem value="legal">Legal</SelectItem>
                              <SelectItem value="operativa">Operativa</SelectItem>
                              <SelectItem value="financiera">Financiera</SelectItem>
                            </SelectContent>
                          </Select>

                          <Textarea
                            value={editData.descripcion}
                            onChange={(e) => setEditData(prev => ({ ...prev, descripcion: e.target.value }))}
                            rows={3}
                            className="w-full"
                          />

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditCondicion(condicion.id)}
                              disabled={loading}
                              className="flex items-center gap-1"
                            >
                              <Save className="h-3 w-3" />
                              Guardar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                              className="flex items-center gap-1"
                            >
                              <X className="h-3 w-3" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-medium text-gray-700">
                              {condicion.descripcion}
                            </p>
                            {condicion.tipo && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {condicion.tipo}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {editingId !== condicion.id && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(condicion)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCondicion(condicion.id)}
                          disabled={loading}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}