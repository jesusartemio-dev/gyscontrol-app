// ===================================================
// 📁 Archivo: CotizacionServicioModal.tsx
// 📌 Ubicación: src/components/cotizaciones/
// 🔧 Descripción: Modal simple para crear nuevas secciones de servicios en cotizaciones
// 🎨 Similar al modal de plantillas: solo nombre y categoría
// ✍️ Autor: Sistema GYS
// 📅 Fecha: 2025-01-27
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Loader2, AlertCircle, Settings } from 'lucide-react'
import { createCotizacionServicio } from '@/lib/services/cotizacionServicio'
import { getCategoriasServicio } from '@/lib/services/categoriaServicio'
import type { CotizacionServicio, CategoriaServicio } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Props {
  cotizacionId: string
  onCreated: (nuevo: CotizacionServicio) => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function CotizacionServicioModal({
  cotizacionId,
  onCreated,
  trigger,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingCategorias, setLoadingCategorias] = useState(false)
  const [errors, setErrors] = useState<{ nombre?: string; categoriaId?: string }>({})

  // ✅ Use external control if provided, otherwise internal
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen
  const setIsOpen = externalOnOpenChange || setInternalOpen

  // ✅ Load categorias when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategorias()
    }
  }, [isOpen])

  const loadCategorias = async () => {
    setLoadingCategorias(true)
    try {
      const data = await getCategoriasServicio()
      setCategorias(data)
    } catch (error) {
      console.error('Error loading categorias:', error)
      toast.error('Error al cargar categorías')
    } finally {
      setLoadingCategorias(false)
    }
  }

  // ✅ Reset form when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    if (!newOpen) {
      setNombre('')
      setCategoriaId('')
      setError(null)
      setErrors({})
    }
  }

  // ✅ Form validation
  const validateForm = () => {
    const newErrors: { nombre?: string; categoriaId?: string } = {}

    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    } else if (nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres'
    } else if (nombre.trim().length > 100) {
      newErrors.nombre = 'El nombre no puede exceder 100 caracteres'
    }

    if (!categoriaId) {
      newErrors.categoriaId = 'Debe seleccionar una categoría de servicios'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ✅ Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    const payload = {
      cotizacionId,
      nombre: nombre.trim(),
      categoria: categorias.find(c => c.id === categoriaId)?.nombre || '',
      subtotalInterno: 0,
      subtotalCliente: 0
    }

    try {
      setLoading(true)
      const nuevo = await createCotizacionServicio(payload)

      // ✅ Success feedback
      toast.success('✅ Sección de servicio creada exitosamente', {
        description: `Se creó la sección "${nuevo.nombre}"`
      })

      onCreated(nuevo)
      handleOpenChange(false)
    } catch (err) {
      console.error('❌ Error al crear sección de servicio:', err)
      setError('Error al crear la sección. Inténtalo nuevamente.')
      toast.error('❌ Error al crear la sección de servicio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Nueva Sección de Servicios
          </DialogTitle>
          <DialogDescription>
            Crea una nueva sección para agrupar servicios relacionados en la cotización
          </DialogDescription>
        </DialogHeader>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Nombre Field */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la sección *</Label>
            <Input
              id="nombre"
              type="text"
              placeholder="Ej: Servicios Eléctricos, Instalación..."
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                if (errors.nombre) {
                  setErrors(prev => ({ ...prev, nombre: undefined }))
                }
              }}
              className={errors.nombre ? 'border-red-500 focus:border-red-500' : ''}
              disabled={loading}
              autoComplete="off"
            />
            {errors.nombre && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600"
              >
                {errors.nombre}
              </motion.p>
            )}
          </div>

          {/* Categoria Field */}
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría de Servicios *</Label>
            <Select
              value={categoriaId}
              onValueChange={(value) => {
                setCategoriaId(value)
                if (errors.categoriaId) {
                  setErrors(prev => ({ ...prev, categoriaId: undefined }))
                }
              }}
              disabled={loading || loadingCategorias}
            >
              <SelectTrigger className={errors.categoriaId ? 'border-red-500 focus:border-red-500' : ''}>
                <SelectValue placeholder={loadingCategorias ? "Cargando categorías..." : "Selecciona una categoría"} />
              </SelectTrigger>
              <SelectContent>
                {categorias.map(categoria => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoriaId && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600"
              >
                {errors.categoriaId}
              </motion.p>
            )}
          </div>

          {/* Info about service section */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Sección de Servicios por Categoría</span>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              Esta sección solo permitirá agregar servicios de la categoría seleccionada. Podrás elegir múltiples items del catálogo de servicios para crear una sección especializada.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !nombre.trim() || !categoriaId}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Sección
                </>
              )}
            </Button>
          </DialogFooter>
        </motion.form>
      </DialogContent>
    </Dialog>
  )
}