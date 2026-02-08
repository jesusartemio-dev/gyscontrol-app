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
  CheckCircle,
  Package
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import type { Cotizacion, CotizacionCondicion } from '@/types'

interface CondicionesTabProps {
  cotizacion: Cotizacion
  onUpdated: (updatedCotizacion: Cotizacion) => void
  isLocked?: boolean
}

export function CondicionesTab({ cotizacion, onUpdated, isLocked = false }: CondicionesTabProps) {
  const [condiciones, setCondiciones] = useState<CotizacionCondicion[]>(cotizacion.condiciones || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newCondicion, setNewCondicion] = useState({ descripcion: '', tipo: '' })
  const [editData, setEditData] = useState({ descripcion: '', tipo: '' })

  // Estados para importar
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importTab, setImportTab] = useState<'catalogo' | 'plantilla'>('catalogo')
  const [catalogoItems, setCatalogoItems] = useState<any[]>([])
  const [plantillas, setPlantillas] = useState<any[]>([])
  const [selectedPlantilla, setSelectedPlantilla] = useState('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    setCondiciones(cotizacion.condiciones || [])
  }, [cotizacion.condiciones])

  // Cargar datos para importacion
  const loadImportData = async () => {
    try {
      const [catalogoRes, plantillasRes] = await Promise.all([
        fetch('/api/catalogo/condiciones?activo=true'),
        fetch('/api/plantillas/condiciones-independiente?activo=true')
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
    return condiciones.some(cond => cond.descripcion.trim() === descripcion.trim())
  }

  // Importar items seleccionados
  const handleImport = async () => {
    if (selectedItems.length === 0) return

    setImporting(true)
    setError(null)

    try {
      let itemsToImport: Array<{ descripcion: string; tipo?: string }> = []

      if (importTab === 'catalogo') {
        itemsToImport = catalogoItems
          .filter(item => selectedItems.includes(item.id))
          .map(item => ({ descripcion: item.descripcion, tipo: item.tipo }))
      } else {
        const plantilla = plantillas.find(p => p.id === selectedPlantilla)
        if (plantilla?.plantillaCondicionItemIndependiente) {
          itemsToImport = plantilla.plantillaCondicionItemIndependiente
            .filter((item: any) => selectedItems.includes(item.id))
            .map((item: any) => ({ descripcion: item.descripcion, tipo: item.tipo }))
        }
      }

      // Crear cada condicion
      const newCondiciones: CotizacionCondicion[] = []
      for (let i = 0; i < itemsToImport.length; i++) {
        const item = itemsToImport[i]
        const response = await fetch(`/api/cotizacion/${cotizacion.id}/condiciones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            descripcion: item.descripcion,
            tipo: item.tipo || null,
            orden: condiciones.length + i + 1
          })
        })

        if (response.ok) {
          const data = await response.json()
          newCondiciones.push(data.data)
        }
      }

      const updatedCondiciones = [...condiciones, ...newCondiciones]
      setCondiciones(updatedCondiciones)

      onUpdated({
        ...cotizacion,
        condiciones: updatedCondiciones
      })

      setShowImportDialog(false)
      setSelectedItems([])
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al importar condiciones')
      console.error('Error importing:', err)
    } finally {
      setImporting(false)
    }
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

      if (!response.ok) throw new Error('Error al crear condicion')

      const data = await response.json()
      const updatedCondiciones = [...condiciones, data.data]
      setCondiciones(updatedCondiciones)

      onUpdated({
        ...cotizacion,
        condiciones: updatedCondiciones
      })

      setNewCondicion({ descripcion: '', tipo: '' })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al agregar la condicion')
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

      if (!response.ok) throw new Error('Error al actualizar condicion')

      const data = await response.json()
      const updatedCondiciones = condiciones.map(cond =>
        cond.id === id ? data.data : cond
      )
      setCondiciones(updatedCondiciones)

      onUpdated({
        ...cotizacion,
        condiciones: updatedCondiciones
      })

      setEditingId(null)
      setEditData({ descripcion: '', tipo: '' })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al actualizar la condicion')
      console.error('Error updating condition:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCondicion = async (id: string) => {
    if (!confirm('Estas seguro de que deseas eliminar esta condicion?')) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/cotizacion/${cotizacion.id}/condiciones/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al eliminar condicion')

      const updatedCondiciones = condiciones.filter(cond => cond.id !== id)
      setCondiciones(updatedCondiciones)

      onUpdated({
        ...cotizacion,
        condiciones: updatedCondiciones
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Error al eliminar la condicion')
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

  // Get items for selected plantilla
  const getPlantillaItems = () => {
    if (!selectedPlantilla) return []
    const plantilla = plantillas.find(p => p.id === selectedPlantilla)
    return plantilla?.plantillaCondicionItemIndependiente || []
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
              Condiciones de la Cotizacion
              <span className="text-sm font-normal text-muted-foreground">
                ({condiciones.length})
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
                    Importar Condiciones
                  </DialogTitle>
                  <DialogDescription>
                    Selecciona condiciones del catalogo o de una plantilla.
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
                          No hay condiciones en el catalogo
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
                                    ? 'bg-blue-50 border-blue-200'
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                              onClick={() => !alreadyImported && handleItemToggle(item.id)}
                            >
                              {alreadyImported ? (
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                              ) : isSelected ? (
                                <CheckSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                              ) : (
                                <Square className="h-4 w-4 text-gray-400 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className={`text-sm ${alreadyImported ? 'text-green-800' : 'text-gray-700'}`}>
                                  {item.descripcion}
                                </p>
                                <div className="flex gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">{item.codigo}</span>
                                  {item.tipo && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded">
                                      {item.tipo}
                                    </span>
                                  )}
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
                              {plantilla.nombre} ({plantilla._count?.plantillaCondicionItemIndependiente || 0} items)
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
                                      ? 'bg-blue-50 border-blue-200'
                                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                }`}
                                onClick={() => !alreadyImported && handleItemToggle(item.id)}
                              >
                                {alreadyImported ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                                ) : isSelected ? (
                                  <CheckSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                                ) : (
                                  <Square className="h-4 w-4 text-gray-400 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <p className={`text-sm ${alreadyImported ? 'text-green-800' : 'text-gray-700'}`}>
                                    {item.descripcion}
                                  </p>
                                  {item.tipo && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded mt-1 inline-block">
                                      {item.tipo}
                                    </span>
                                  )}
                                  {alreadyImported && (
                                    <span className="text-xs text-green-600 ml-2">Ya importado</span>
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

          {/* Agregar nueva condicion */}
          {!isLocked && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Agregar Nueva Condicion</Label>
            <div className="space-y-3">
              <Select
                value={newCondicion.tipo}
                onValueChange={(value) => setNewCondicion(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar tipo de condicion (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="tecnica">Tecnica</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="operativa">Operativa</SelectItem>
                  <SelectItem value="financiera">Financiera</SelectItem>
                </SelectContent>
              </Select>

              <Textarea
                value={newCondicion.descripcion}
                onChange={(e) => setNewCondicion(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Ej: Los precios estan sujetos a variaciones del tipo de cambio..."
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
                Agregar Condicion
              </Button>
            </div>
          </div>
          )}

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
                              <SelectItem value="tecnica">Tecnica</SelectItem>
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

                    {editingId !== condicion.id && !isLocked && (
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
