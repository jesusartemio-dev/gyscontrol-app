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
  CheckCircle,
  Package
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  isLocked?: boolean
}

export function ExclusionesTab({ cotizacion, onUpdated, isLocked = false }: ExclusionesTabProps) {
  const [exclusiones, setExclusiones] = useState<CotizacionExclusion[]>(cotizacion.exclusiones || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newExclusion, setNewExclusion] = useState('')
  const [editText, setEditText] = useState('')

  // Estados para importar
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importTab, setImportTab] = useState<'catalogo' | 'plantilla'>('catalogo')
  const [catalogoItems, setCatalogoItems] = useState<any[]>([])
  const [plantillas, setPlantillas] = useState<any[]>([])
  const [selectedPlantilla, setSelectedPlantilla] = useState('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    setExclusiones(cotizacion.exclusiones || [])
  }, [cotizacion.exclusiones])

  // Cargar datos para importacion
  const loadImportData = async () => {
    try {
      const [catalogoRes, plantillasRes] = await Promise.all([
        fetch('/api/catalogo/exclusiones?activo=true'),
        fetch('/api/plantillas/exclusiones-independiente?activo=true')
      ])

      if (catalogoRes.ok) {
        const data = await catalogoRes.json()
        setCatalogoItems(data || [])
      }

      if (plantillasRes.ok) {
        const data = await plantillasRes.json()
        setPlantillas(data || [])
      }
    } catch (error) {
      console.error('Error loading import data:', error)
    }
  }

  const openImportDialog = () => {
    loadImportData()
    setSelectedItems([])
    setSelectedPlantilla('')
    setImportTab('catalogo')
    setShowImportDialog(true)
  }

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(i => i !== itemId)
        : [...prev, itemId]
    )
  }

  const isItemAlreadyImported = (descripcion: string) => {
    return exclusiones.some(exc => exc.descripcion.trim() === descripcion.trim())
  }

  // Importar items seleccionados
  const handleImport = async () => {
    if (selectedItems.length === 0) return

    setImporting(true)
    setError(null)

    try {
      let itemsToImport: Array<{ descripcion: string }> = []

      if (importTab === 'catalogo') {
        itemsToImport = catalogoItems
          .filter(item => selectedItems.includes(item.id))
          .map(item => ({ descripcion: item.descripcion }))
      } else {
        const plantilla = plantillas.find(p => p.id === selectedPlantilla)
        if (plantilla?.plantillaExclusionItemIndependiente) {
          itemsToImport = plantilla.plantillaExclusionItemIndependiente
            .filter((item: any) => selectedItems.includes(item.id))
            .map((item: any) => ({ descripcion: item.descripcion }))
        }
      }

      // Crear cada exclusion
      const newExclusiones: CotizacionExclusion[] = []
      for (let i = 0; i < itemsToImport.length; i++) {
        const item = itemsToImport[i]
        const response = await fetch(`/api/cotizacion/${cotizacion.id}/exclusiones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            descripcion: item.descripcion,
            orden: exclusiones.length + i + 1
          })
        })

        if (response.ok) {
          const data = await response.json()
          newExclusiones.push(data.data)
        }
      }

      const updatedExclusiones = [...exclusiones, ...newExclusiones]
      setExclusiones(updatedExclusiones)

      onUpdated({
        ...cotizacion,
        exclusiones: updatedExclusiones
      })

      setShowImportDialog(false)
      setSelectedItems([])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al importar exclusiones')
      console.error('Error importing:', err)
    } finally {
      setImporting(false)
    }
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

      if (!response.ok) throw new Error('Error al crear exclusion')

      const data = await response.json()
      const updatedExclusiones = [...exclusiones, data.data]
      setExclusiones(updatedExclusiones)

      onUpdated({
        ...cotizacion,
        exclusiones: updatedExclusiones
      })

      setNewExclusion('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al agregar la exclusion')
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

      if (!response.ok) throw new Error('Error al actualizar exclusion')

      const data = await response.json()
      const updatedExclusiones = exclusiones.map(exc =>
        exc.id === id ? data.data : exc
      )
      setExclusiones(updatedExclusiones)

      onUpdated({
        ...cotizacion,
        exclusiones: updatedExclusiones
      })

      setEditingId(null)
      setEditText('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al actualizar la exclusion')
      console.error('Error updating exclusion:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteExclusion = async (id: string) => {
    if (!confirm('Estas seguro de que deseas eliminar esta exclusion?')) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/cotizacion/${cotizacion.id}/exclusiones/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al eliminar exclusion')

      const updatedExclusiones = exclusiones.filter(exc => exc.id !== id)
      setExclusiones(updatedExclusiones)

      onUpdated({
        ...cotizacion,
        exclusiones: updatedExclusiones
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al eliminar la exclusion')
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

  // Get items for selected plantilla
  const getPlantillaItems = () => {
    if (!selectedPlantilla) return []
    const plantilla = plantillas.find(p => p.id === selectedPlantilla)
    return plantilla?.plantillaExclusionItemIndependiente || []
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
              Exclusiones de la Cotizacion
              <span className="text-sm font-normal text-muted-foreground">
                ({exclusiones.length})
              </span>
            </CardTitle>
            {!isLocked && (
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openImportDialog}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Importar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Importar Exclusiones
                  </DialogTitle>
                  <DialogDescription>
                    Selecciona exclusiones del catalogo o de una plantilla.
                  </DialogDescription>
                </DialogHeader>

                <Tabs value={importTab} onValueChange={(v) => { setImportTab(v as any); setSelectedItems([]); setSelectedPlantilla(''); }}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="catalogo">
                      <FileText className="h-4 w-4 mr-2" />
                      Catalogo ({catalogoItems.length})
                    </TabsTrigger>
                    <TabsTrigger value="plantilla">
                      <Package className="h-4 w-4 mr-2" />
                      Plantillas ({plantillas.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="catalogo" className="space-y-4 mt-4">
                    <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                      {catalogoItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No hay exclusiones en el catalogo
                        </p>
                      ) : (
                        catalogoItems.map((item) => {
                          const alreadyImported = isItemAlreadyImported(item.descripcion)
                          const isSelected = selectedItems.includes(item.id)

                          return (
                            <div
                              key={item.id}
                              className={`flex items-start gap-3 p-2 rounded border cursor-pointer transition-colors ${
                                alreadyImported
                                  ? 'bg-green-50 border-green-200 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-orange-50 border-orange-200'
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                              onClick={() => !alreadyImported && handleItemToggle(item.id)}
                            >
                              {alreadyImported ? (
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                              ) : isSelected ? (
                                <CheckSquare className="h-4 w-4 text-orange-600 mt-0.5" />
                              ) : (
                                <Square className="h-4 w-4 text-gray-400 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className={`text-sm ${alreadyImported ? 'text-green-800' : 'text-gray-700'}`}>
                                  {item.descripcion}
                                </p>
                                <div className="flex gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">{item.codigo}</span>
                                  {alreadyImported && (
                                    <span className="text-xs text-green-600">Ya importado</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="plantilla" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Seleccionar Plantilla</Label>
                      <Select value={selectedPlantilla} onValueChange={(v) => { setSelectedPlantilla(v); setSelectedItems([]); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una plantilla..." />
                        </SelectTrigger>
                        <SelectContent>
                          {plantillas.map((plantilla) => (
                            <SelectItem key={plantilla.id} value={plantilla.id}>
                              {plantilla.nombre} ({plantilla._count?.plantillaExclusionItemIndependiente || 0} items)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedPlantilla && (
                      <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                        {getPlantillaItems().length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Esta plantilla no tiene items
                          </p>
                        ) : (
                          getPlantillaItems().map((item: any) => {
                            const alreadyImported = isItemAlreadyImported(item.descripcion)
                            const isSelected = selectedItems.includes(item.id)

                            return (
                              <div
                                key={item.id}
                                className={`flex items-start gap-3 p-2 rounded border cursor-pointer transition-colors ${
                                  alreadyImported
                                    ? 'bg-green-50 border-green-200 cursor-not-allowed'
                                    : isSelected
                                      ? 'bg-orange-50 border-orange-200'
                                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                }`}
                                onClick={() => !alreadyImported && handleItemToggle(item.id)}
                              >
                                {alreadyImported ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                                ) : isSelected ? (
                                  <CheckSquare className="h-4 w-4 text-orange-600 mt-0.5" />
                                ) : (
                                  <Square className="h-4 w-4 text-gray-400 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <p className={`text-sm ${alreadyImported ? 'text-green-800' : 'text-gray-700'}`}>
                                    {item.descripcion}
                                  </p>
                                  {alreadyImported && (
                                    <span className="text-xs text-green-600">Ya importado</span>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-muted-foreground">
                    {selectedItems.length} seleccionados
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowImportDialog(false)}
                      disabled={importing}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={selectedItems.length === 0 || importing}
                    >
                      {importing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Importar {selectedItems.length > 0 && `(${selectedItems.length})`}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            )}
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
                Operacion realizada exitosamente
              </AlertDescription>
            </Alert>
          )}

          {/* Agregar nueva exclusion */}
          {!isLocked && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Agregar Nueva Exclusion</Label>
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
          )}

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

                    {editingId !== exclusion.id && !isLocked && (
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
