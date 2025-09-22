// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/catalogo/plantillas-exclusiones/
// 🔧 Página moderna de plantillas de exclusiones con UX/UI mejorada
// 🎨 Mejoras aplicadas: Framer Motion, Shadcn/UI, Estados de carga, Breadcrumb navigation
// ===================================================

'use client'

import { useEffect, useState } from 'react'
// import { motion } from 'framer-motion'
import { toast } from 'sonner'
// Temporarily disabled due to import issues
import { exportarPlantillasExclusionesAExcel } from '@/lib/utils/plantillasExclusionesExcel'
// import { leerPlantillasExclusionesDesdeExcel, validarPlantillasExclusiones } from '@/lib/utils/plantillasExclusionesImportUtils'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, FileText, TrendingUp, Package, Home, Settings, Loader2 } from 'lucide-react'

// Tipos para plantillas de exclusiones
interface PlantillaExclusionItem {
  id: string
  descripcion: string
  orden: number
  activo: boolean
}

interface PlantillaExclusion {
  id: string
  nombre: string
  descripcion?: string
  categoria?: string
  activo: boolean
  orden: number
  createdAt: Date
  updatedAt: Date
  items: PlantillaExclusionItem[]
  _count: { items: number }
}

// Animation variants removed - using static layout

export default function ExclusionesPage() {
  const [exclusiones, setExclusiones] = useState<PlantillaExclusion[]>([])
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const cargarExclusiones = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/plantillas/exclusiones')
      if (!response.ok) throw new Error('Error al cargar exclusiones')

      const data = await response.json()
      setExclusiones(data.data || [])
    } catch (err) {
      const errorMessage = 'Error al cargar las exclusiones'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Error loading exclusiones:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarExclusiones()
  }, [])

  const handleEdit = (plantilla: PlantillaExclusion) => {
    setEditingId(plantilla.id)
    // The form will be populated with the editing data
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta exclusión?')) return

    try {
      const response = await fetch(`/api/plantillas/exclusiones/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al eliminar exclusión')

      toast.success('Exclusión eliminada exitosamente')
      cargarExclusiones()
    } catch (error) {
      toast.error('Error al eliminar exclusión')
      console.error('Error deleting exclusión:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleExportar = async () => {
    try {
      if (exclusiones.length === 0) {
        toast.error('No hay exclusiones para exportar')
        return
      }

      console.log('📊 Exportando exclusiones...', exclusiones.length)
      const result = exportarPlantillasExclusionesAExcel(exclusiones)

      if (result) {
        toast.success('Exclusiones exportadas exitosamente')
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
      console.error('Error al importar exclusiones:', err)
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
                  <FileText className="h-4 w-4" />
                  Exclusiones
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
              <FileText className="h-8 w-8 text-orange-600" />
              Exclusiones
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestiona exclusiones reutilizables para cotizaciones
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
              <CardTitle className="text-sm font-medium">Total Exclusiones</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{exclusiones.length}</div>
              <p className="text-xs text-muted-foreground">
                Exclusiones registradas
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
                {exclusiones.length > 0
                  ? Math.round(exclusiones.reduce((sum, p) => sum + p._count.items, 0) / exclusiones.length)
                  : '0'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Por exclusión
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {exclusiones.reduce((sum, p) => sum + p._count.items, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Items en todas las exclusiones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estado</CardTitle>
              <Badge variant={exclusiones.length > 0 ? "default" : "secondary"}>
                {exclusiones.length > 0 ? "Activo" : "Vacío"}
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
                  <FileText className="h-5 w-5" />
                  {editingId ? 'Editar Exclusión' : 'Nueva Exclusión'}
                </CardTitle>
                <CardDescription>
                  {editingId ? 'Modifica la exclusión existente' : 'Crea una nueva exclusión'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PlantillaExclusionForm
                  onCreated={cargarExclusiones}
                  editingPlantilla={editingId ? exclusiones.find(e => e.id === editingId) : null}
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
                  Lista de Exclusiones
                </CardTitle>
                <CardDescription>
                  Gestiona las exclusiones existentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {exclusiones.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay exclusiones registradas</h3>
                    <p className="text-muted-foreground mb-4">
                      Comienza creando tu primera exclusión usando el formulario
                    </p>
                    <Badge variant="outline">Sistema listo para usar</Badge>
                  </div>
                ) : (
                  <PlantillasExclusionesList
                    data={exclusiones}
                    onUpdate={cargarExclusiones}
                    onDelete={cargarExclusiones}
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
function PlantillaExclusionForm({
  onCreated,
  editingPlantilla,
  onCancelEdit
}: {
  onCreated: () => void
  editingPlantilla?: PlantillaExclusion | null
  onCancelEdit?: () => void
}) {
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    items: [] as string[]
  })

  // Initialize form when editingPlantilla changes
  useEffect(() => {
    if (editingPlantilla) {
      setFormData({
        nombre: editingPlantilla.nombre,
        descripcion: editingPlantilla.descripcion || '',
        categoria: editingPlantilla.categoria || '',
        items: editingPlantilla.items.map(item => item.descripcion)
      })
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        categoria: '',
        items: []
      })
    }
  }, [editingPlantilla])

  const handleAddItem = () => {
    if (newItem.trim()) {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, newItem.trim()]
      }))
      setNewItem('')
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

    const dataToSend = {
      nombre: formData.nombre?.trim() || '',
      descripcion: formData.descripcion?.trim() || '',
      categoria: formData.categoria?.trim() || '',
      items: formData.items?.map((item, index) => ({
        descripcion: item?.trim() || '',
        orden: index + 1
      })) || []
    }

    if (!dataToSend.nombre || dataToSend.items.length === 0) {
      toast.error('Nombre y al menos un item son requeridos')
      return
    }

    setLoading(true)
    try {
      const isEditing = !!editingPlantilla
      const url = isEditing ? `/api/plantillas/exclusiones/${editingPlantilla.id}` : '/api/plantillas/exclusiones'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) throw new Error(`Error al ${isEditing ? 'actualizar' : 'crear'} exclusión`)

      toast.success(`Exclusión ${isEditing ? 'actualizada' : 'creada'} exitosamente`)
      setFormData({ nombre: '', descripcion: '', categoria: '', items: [] })
      onCancelEdit?.()
      onCreated()
    } catch (error) {
      toast.error(`Error al ${editingPlantilla ? 'actualizar' : 'crear'} exclusión`)
      console.error('Error saving exclusión:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Nombre de la Exclusión</label>
        <input
          type="text"
          value={formData.nombre}
          onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
          className="w-full mt-1 px-3 py-2 border rounded-md"
          placeholder="Ej: Exclusiones Generales"
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

      <div>
        <label className="text-sm font-medium">Categoría</label>
        <select
          value={formData.categoria}
          onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
          className="w-full mt-1 px-3 py-2 border rounded-md"
        >
          <option value="">Sin categoría</option>
          <option value="general">General</option>
          <option value="industrial">Industrial</option>
          <option value="comercial">Comercial</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">Items de Exclusión</label>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md"
            placeholder="Ej: Suministro de licencias..."
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
          />
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={!newItem.trim()}
          >
            +
          </button>
        </div>

        {formData.items.length > 0 && (
          <div className="mt-2 space-y-1">
            {formData.items.map((item, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="flex-1 text-sm">{item}</span>
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
          {loading ? (editingPlantilla ? 'Actualizando...' : 'Creando...') : (editingPlantilla ? 'Actualizar Exclusión' : 'Crear Exclusión')}
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
function PlantillasExclusionesList({
  data,
  onUpdate,
  onDelete,
  onEdit,
  onDeleteConfirm
}: {
  data: PlantillaExclusion[]
  onUpdate: () => void
  onDelete: () => void
  onEdit: (plantilla: PlantillaExclusion) => void
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
              <h4 className="text-sm font-medium text-muted-foreground">Items de exclusión:</h4>
              <div className="space-y-1">
                {plantilla.items.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm">
                    <span className="text-muted-foreground w-6">{item.orden}.</span>
                    <span className="flex-1">{item.descripcion}</span>
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