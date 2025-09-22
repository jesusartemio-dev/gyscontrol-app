// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/catalogo/plantillas-condiciones/
// 🔧 Página moderna de plantillas de condiciones con UX/UI mejorada
// 🎨 Mejoras aplicadas: Framer Motion, Shadcn/UI, Estados de carga, Breadcrumb navigation
// ===================================================

'use client'

import { useEffect, useState } from 'react'
// import { motion } from 'framer-motion'
import { toast } from 'sonner'
// Temporarily disabled due to import issues
import { exportarPlantillasCondicionesAExcel } from '@/lib/utils/plantillasCondicionesExcel'
// import { leerPlantillasCondicionesDesdeExcel, validarPlantillasCondiciones } from '@/lib/utils/plantillasCondicionesImportUtils'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, FileCheck, TrendingUp, Package, Home, Settings, Loader2 } from 'lucide-react'

// Tipos para plantillas de condiciones
interface PlantillaCondicionItem {
  id: string
  descripcion: string
  tipo?: string
  orden: number
  activo: boolean
}

interface PlantillaCondicion {
  id: string
  nombre: string
  descripcion?: string
  categoria?: string
  tipo?: string
  activo: boolean
  orden: number
  createdAt: Date
  updatedAt: Date
  items: PlantillaCondicionItem[]
  _count: { items: number }
}

// Animation variants removed - using static layout

export default function CondicionesPage() {
  const [condiciones, setCondiciones] = useState<PlantillaCondicion[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const cargarCondiciones = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/plantillas/condiciones')
      if (!response.ok) throw new Error('Error al cargar condiciones')

      const data = await response.json()
      setCondiciones(data.data || [])
    } catch (err) {
      const errorMessage = 'Error al cargar las condiciones'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Error loading condiciones:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarCondiciones()
  }, [])

  const handleEdit = (plantilla: PlantillaCondicion) => {
    setEditingId(plantilla.id)
    // The form will be populated with the editing data
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta condición?')) return

    try {
      const response = await fetch(`/api/plantillas/condiciones/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al eliminar condición')

      toast.success('Condición eliminada exitosamente')
      cargarCondiciones()
    } catch (error) {
      toast.error('Error al eliminar condición')
      console.error('Error deleting condición:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleExportar = async () => {
    try {
      if (condiciones.length === 0) {
        toast.error('No hay condiciones para exportar')
        return
      }

      console.log('📊 Exportando condiciones...', condiciones.length)
      const result = exportarPlantillasCondicionesAExcel(condiciones)

      if (result) {
        toast.success('Condiciones exportadas exitosamente')
      } else {
        throw new Error('La función de exportar no retornó éxito')
      }
    } catch (err) {
      console.error('❌ Error en handleExportar:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al exportar'
      toast.error(`Error al exportar: ${errorMessage}`)
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      // Temporarily disabled due to import utility issues
      toast.error('La funcionalidad de importación está temporalmente deshabilitada')
      setErrores(['La funcionalidad de importación está temporalmente deshabilitada debido a problemas técnicos'])
    } catch (err) {
      const errorMessage = 'Error inesperado en la importación'
      setError(errorMessage)
      console.error('Error al importar condiciones:', err)
      toast.error(errorMessage)
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  // Estado de carga
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Skeleton Breadcrumb */}
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />

          {/* Skeleton Header */}
          <div className="flex justify-between items-center">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
            <div className="h-10 bg-gray-200 rounded w-48 animate-pulse" />
          </div>

          {/* Skeleton Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>

          {/* Skeleton Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
            </div>
            <div className="lg:col-span-2">
              <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="container mx-auto px-4 py-8 max-w-7xl"
    >
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <div >
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Inicio
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/catalogo" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Catálogo
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Condiciones
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header Section */}
        <div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FileCheck className="h-8 w-8 text-blue-600" />
              Condiciones
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestiona condiciones reutilizables para cotizaciones
            </p>
          </div>
          <BotonesImportExport
            onExportar={handleExportar}
            onImportar={handleImportar}
            importando={importando}
          />
        </div>

        {/* Quick Stats */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Condiciones</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{condiciones.length}</div>
              <p className="text-xs text-muted-foreground">
                Condiciones registradas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {condiciones.length > 0
                  ? Math.round(condiciones.reduce((sum, p) => sum + p._count.items, 0) / condiciones.length)
                  : '0'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Por condición
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {condiciones.reduce((sum, p) => sum + p._count.items, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Items en todas las condiciones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estado</CardTitle>
              <Badge variant={condiciones.length > 0 ? "default" : "secondary"}>
                {condiciones.length > 0 ? "Activo" : "Vacío"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {importando ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Importando...</span>
                  </div>
                ) : (
                  "✓"
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Sistema operativo
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Error State */}
        {error && (
          <div >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Import Errors */}
        {errores.length > 0 && (
          <div >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errores de Importación</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {errores.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1" >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  {editingId ? 'Editar Condición' : 'Nueva Condición'}
                </CardTitle>
                <CardDescription>
                  {editingId ? 'Modifica la condición existente' : 'Crea una nueva condición'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PlantillaCondicionForm
                  onCreated={cargarCondiciones}
                  editingPlantilla={editingId ? condiciones.find(c => c.id === editingId) : null}
                  onCancelEdit={handleCancelEdit}
                />
              </CardContent>
            </Card>
          </div>

          {/* List Section */}
          <div className="lg:col-span-2" >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Lista de Condiciones
                </CardTitle>
                <CardDescription>
                  Gestiona las condiciones existentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {condiciones.length === 0 ? (
                  <div className="text-center py-12">
                    <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay condiciones registradas</h3>
                    <p className="text-muted-foreground mb-4">
                      Comienza creando tu primera condición usando el formulario
                    </p>
                    <Badge variant="outline">Sistema listo para usar</Badge>
                  </div>
                ) : (
                  <PlantillasCondicionesList
                    data={condiciones}
                    onUpdate={cargarCondiciones}
                    onDelete={cargarCondiciones}
                    onEdit={handleEdit}
                    onDeleteConfirm={handleDelete}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente para el formulario de plantillas
function PlantillaCondicionForm({
  onCreated,
  editingPlantilla,
  onCancelEdit
}: {
  onCreated: () => void
  editingPlantilla?: PlantillaCondicion | null
  onCancelEdit?: () => void
}) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    tipo: '',
    items: [] as Array<{ descripcion: string; tipo: string }>
  })
  const [newItem, setNewItem] = useState({ descripcion: '', tipo: '' })
  const [loading, setLoading] = useState(false)

  // Initialize form with editing data
  useEffect(() => {
    if (editingPlantilla) {
      setFormData({
        nombre: editingPlantilla.nombre,
        descripcion: editingPlantilla.descripcion || '',
        categoria: editingPlantilla.categoria || '',
        tipo: editingPlantilla.tipo || '',
        items: editingPlantilla.items.map(item => ({
          descripcion: item.descripcion,
          tipo: item.tipo || 'comercial'
        }))
      })
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        categoria: '',
        tipo: '',
        items: []
      })
    }
  }, [editingPlantilla])

  const handleAddItem = () => {
    if (newItem.descripcion.trim()) {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, {
          descripcion: newItem.descripcion.trim(),
          tipo: newItem.tipo || 'comercial'
        }]
      }))
      setNewItem({ descripcion: '', tipo: '' })
    }
  }

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre || formData.items.length === 0) return

    setLoading(true)
    try {
      const isEditing = !!editingPlantilla
      const url = isEditing ? `/api/plantillas/condiciones/${editingPlantilla.id}` : '/api/plantillas/condiciones'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          categoria: formData.categoria,
          tipo: formData.tipo,
          items: formData.items.map((item, index) => ({
            id: editingPlantilla?.items[index]?.id, // Preserve existing IDs
            descripcion: item.descripcion,
            tipo: item.tipo,
            orden: index + 1
          }))
        })
      })

      if (!response.ok) throw new Error(`Error al ${isEditing ? 'actualizar' : 'crear'} condición`)

      toast.success(`Condición ${isEditing ? 'actualizada' : 'creada'} exitosamente`)
      setFormData({ nombre: '', descripcion: '', categoria: '', tipo: '', items: [] })
      onCancelEdit?.()
      onCreated()
    } catch (error) {
      toast.error(`Error al ${editingPlantilla ? 'actualizar' : 'crear'} condición`)
      console.error('Error saving condición:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Nombre de la Condición</label>
        <input
          type="text"
          value={formData.nombre}
          onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
          className="w-full mt-1 px-3 py-2 border rounded-md"
          placeholder="Ej: Condiciones Generales"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Descripción</label>
        <textarea
          value={formData.descripcion}
          onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
          className="w-full mt-1 px-3 py-2 border rounded-md"
          rows={2}
          placeholder="Descripción opcional..."
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm font-medium">Categoría</label>
          <select
            value={formData.categoria}
            onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
            className="w-full mt-1 px-3 py-2 border rounded-md"
          >
            <option value="">Sin categoría</option>
            <option value="general">General</option>
            <option value="precios">Precios</option>
            <option value="entrega">Entrega</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Tipo</label>
          <select
            value={formData.tipo}
            onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
            className="w-full mt-1 px-3 py-2 border rounded-md"
          >
            <option value="">Sin tipo</option>
            <option value="comercial">Comercial</option>
            <option value="tecnica">Técnica</option>
            <option value="legal">Legal</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Items de Condición</label>
        <div className="space-y-2 mt-1">
          <div className="flex gap-2">
            <select
              value={newItem.tipo}
              onChange={(e) => setNewItem(prev => ({ ...prev, tipo: e.target.value }))}
              className="px-2 py-2 border rounded-md text-sm"
            >
              <option value="comercial">Comercial</option>
              <option value="tecnica">Técnica</option>
              <option value="legal">Legal</option>
              <option value="operativa">Operativa</option>
            </select>
            <input
              type="text"
              value={newItem.descripcion}
              onChange={(e) => setNewItem(prev => ({ ...prev, descripcion: e.target.value }))}
              className="flex-1 px-3 py-2 border rounded-md"
              placeholder="Ej: Los precios no incluyen IGV..."
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
            />
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={!newItem.descripcion.trim()}
            >
              +
            </button>
          </div>
        </div>

        {formData.items.length > 0 && (
          <div className="mt-2 space-y-1">
            {formData.items.map((item, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <Badge variant="outline" className="text-xs">{item.tipo}</Badge>
                <span className="flex-1 text-sm">{item.descripcion}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !formData.nombre || formData.items.length === 0}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? (editingPlantilla ? 'Actualizando...' : 'Creando...') : (editingPlantilla ? 'Actualizar Condición' : 'Crear Condición')}
        </button>
        {editingPlantilla && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

// Componente para la lista de plantillas
function PlantillasCondicionesList({
  data,
  onUpdate,
  onDelete,
  onEdit,
  onDeleteConfirm
}: {
  data: PlantillaCondicion[]
  onUpdate: () => void
  onDelete: () => void
  onEdit: (plantilla: PlantillaCondicion) => void
  onDeleteConfirm: (id: string) => Promise<void>
}) {
  return (
    <div className="space-y-6">
      {data.map((plantilla) => (
        <Card key={plantilla.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{plantilla.nombre}</h3>
                {plantilla.descripcion && (
                  <p className="text-sm text-muted-foreground mt-1">{plantilla.descripcion}</p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="outline">{plantilla._count.items} items</Badge>
                  {plantilla.categoria && (
                    <Badge variant="secondary">{plantilla.categoria}</Badge>
                  )}
                  {plantilla.tipo && (
                    <Badge variant="outline">{plantilla.tipo}</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(plantilla)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDeleteConfirm(plantilla.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Items de condición:</h4>
              <div className="space-y-1">
                {plantilla.items.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm">
                    <span className="text-muted-foreground w-6">{item.orden}.</span>
                    <span className="flex-1">{item.descripcion}</span>
                    {item.tipo && (
                      <Badge variant="outline" className="text-xs">
                        {item.tipo}
                      </Badge>
                    )}
                    <Badge variant={item.activo ? "default" : "secondary"} className="text-xs">
                      {item.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}