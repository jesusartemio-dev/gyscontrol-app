'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Cotizacion, CotizacionExclusion } from '@/types'

interface ExclusionesTabProps {
  cotizacion: Cotizacion
  onUpdated: (updatedCotizacion: Cotizacion) => void
}

export function ExclusionesTab({ cotizacion, onUpdated }: ExclusionesTabProps) {
  const [exclusiones, setExclusiones] = useState<CotizacionExclusion[]>(cotizacion.exclusiones || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newExclusion, setNewExclusion] = useState('')
  const [editText, setEditText] = useState('')

  // Estados para importar desde exclusiones
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [exclusionesDisponibles, setExclusionesDisponibles] = useState<any[]>([])
  const [selectedExclusion, setSelectedExclusion] = useState('')
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append')
  const [importing, setImporting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [showItemSelection, setShowItemSelection] = useState(false)

  useEffect(() => {
    setExclusiones(cotizacion.exclusiones || [])
  }, [cotizacion.exclusiones])

  // Cargar exclusiones disponibles desde el catálogo
  const loadExclusionesDisponibles = async () => {
    try {
      const response = await fetch('/api/catalogo/exclusiones?activo=true')
      if (response.ok) {
        const data = await response.json()
        setExclusionesDisponibles(data || [])
      }
    } catch (error) {
      console.error('Error loading exclusiones:', error)
    }
  }

  // Importar desde exclusión
  const handleImportFromExclusion = async () => {
    if (!selectedExclusion) return

    setImporting(true)
    setError(null)

    try {
      const response = await fetch(`/api/cotizacion/${cotizacion.id}/exclusiones/importar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogoId: selectedExclusion,
          modo: importMode,
          itemsSeleccionados: selectedItems.length > 0 ? selectedItems : undefined
        })
      })

      if (!response.ok) throw new Error('Error al importar desde exclusión')

      const data = await response.json()

      // Actualizar el estado local
      setExclusiones(data.data)

      // Update parent component
      onUpdated({
        ...cotizacion,
        exclusiones: data.data
      })

      setShowImportDialog(false)
      setSelectedExclusion('')
      setSelectedItems([])
      setShowItemSelection(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al importar desde exclusión')
      console.error('Error importing from exclusión:', err)
    } finally {
      setImporting(false)
    }
  }

  // Abrir diálogo de importación
  const openImportDialog = () => {
    loadExclusionesDisponibles()
    setSelectedExclusion('')
    setSelectedItems([])
    setShowItemSelection(false)
    setShowImportDialog(true)
  }

  // Manejar selección de catálogo
  const handleExclusionSelect = (exclusionId: string) => {
    setSelectedExclusion(exclusionId)
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
    return exclusiones.some(exc => exc.descripcion.trim() === itemDescription.trim())
  }

  const handleAddExclusion = async () => {
    if (!newExclusion.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/cotizacion/${cotizacion.id}/exclusiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: newExclusion.trim(),
          orden: exclusiones.length + 1
        })
      })

      if (!response.ok) throw new Error('Error al crear exclusión')

      const data = await response.json()
      const updatedExclusiones = [...exclusiones, data.data]
      setExclusiones(updatedExclusiones)

      // Update parent component
      onUpdated({
        ...cotizacion,
        exclusiones: updatedExclusiones
      })

      setNewExclusion('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al agregar la exclusión')
      console.error('Error adding exclusion:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditExclusion = async (id: string) => {
    if (!editText.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/cotizacion/${cotizacion.id}/exclusiones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: editText.trim()
        })
      })

      if (!response.ok) throw new Error('Error al actualizar exclusión')

      const data = await response.json()
      const updatedExclusiones = exclusiones.map(exc =>
        exc.id === id ? data.data : exc
      )
      setExclusiones(updatedExclusiones)

      // Update parent component
      onUpdated({
        ...cotizacion,
        exclusiones: updatedExclusiones
      })

      setEditingId(null)
      setEditText('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al actualizar la exclusión')
      console.error('Error updating exclusion:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteExclusion = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta exclusión?')) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/cotizacion/${cotizacion.id}/exclusiones/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al eliminar exclusión')

      const updatedExclusiones = exclusiones.filter(exc => exc.id !== id)
      setExclusiones(updatedExclusiones)

      // Update parent component
      onUpdated({
        ...cotizacion,
        exclusiones: updatedExclusiones
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al eliminar la exclusión')
      console.error('Error deleting exclusion:', err)
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (exclusion: CotizacionExclusion) => {
    setEditingId(exclusion.id)
    setEditText(exclusion.descripcion)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditText('')
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
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Exclusiones de la Cotización
              <span className="text-sm font-normal text-muted-foreground">
                ({exclusiones.length})
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
                  Importar Exclusión
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Importar desde Catálogo
                  </DialogTitle>
                  <DialogDescription>
                    Selecciona una exclusión del catálogo y elige qué items importar.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="exclusion">Exclusión del Catálogo</Label>
                    <Select value={selectedExclusion} onValueChange={handleExclusionSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una exclusión..." />
                      </SelectTrigger>
                      <SelectContent>
                        {exclusionesDisponibles.map((exclusion) => (
                          <SelectItem key={exclusion.id} value={exclusion.id}>
                            {exclusion.nombre} ({exclusion._count?.items || 0} items)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {showItemSelection && selectedExclusion && (
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
                            const selectedTemplate = exclusionesDisponibles.find(e => e.id === selectedExclusion)
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
                            const selectedTemplate = exclusionesDisponibles.find(e => e.id === selectedExclusion)
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
                    onClick={handleImportFromExclusion}
                    disabled={!selectedExclusion || selectedItems.length === 0 || importing}
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

          {/* Agregar nueva exclusión */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Agregar Nueva Exclusión</Label>
            <div className="flex gap-2">
              <Textarea
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                placeholder="Ej: No incluye obras civiles ni permisos municipales..."
                className="flex-1"
                rows={2}
              />
              <Button
                onClick={handleAddExclusion}
                disabled={loading || !newExclusion.trim()}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Agregar
              </Button>
            </div>
          </div>

          {/* Lista de exclusiones */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Exclusiones Configuradas</Label>

            {exclusiones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay exclusiones configuradas</p>
                <p className="text-sm">Agrega exclusiones para mayor claridad en tu propuesta</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exclusiones.map((exclusion, index) => (
                  <motion.div
                    key={exclusion.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-start gap-3 p-4 border rounded-lg bg-orange-50/50"
                  >
                    <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs font-medium text-orange-700">
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      {editingId === exclusion.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={2}
                            className="w-full"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditExclusion(exclusion.id)}
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
                        <p className="text-sm text-gray-700">{exclusion.descripcion}</p>
                      )}
                    </div>

                    {editingId !== exclusion.id && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(exclusion)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteExclusion(exclusion.id)}
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