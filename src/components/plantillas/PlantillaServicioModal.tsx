// ===================================================
// 📁 Archivo: PlantillaServicioModal.tsx
// 📌 Ubicación: src/components/plantillas/
// 🔧 Descripción: Modal para crear una sección de servicios en la plantilla
//
// 🧠 Uso: Modal que se abre desde el botón "+ Nuevo Servicio"
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-21
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { createPlantillaServicio } from '@/lib/services/plantillaServicio'
import { getCategoriasServicio } from '@/lib/services/categoriaServicio'
import type { PlantillaServicioPayload, CategoriaServicio } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Props {
  plantillaId: string
  isOpen: boolean
  onClose: () => void
  onCreated: (nuevo: any) => void
}

export default function PlantillaServicioModal({ 
  plantillaId, 
  isOpen, 
  onClose, 
  onCreated 
}: Props) {
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingCategorias, setLoadingCategorias] = useState(false)

  // ✅ Load categories when modal opens
  useEffect(() => {
    if (isOpen && categorias.length === 0) {
      setLoadingCategorias(true)
      getCategoriasServicio()
        .then((cats) => {
          setCategorias(cats)
          if (cats.length > 0) {
            setCategoria(cats[0].id)
          }
        })
        .catch(() => {
          toast.error('Error al cargar categorías')
        })
        .finally(() => {
          setLoadingCategorias(false)
        })
    }
  }, [isOpen, categorias.length])

  // ✅ Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNombre('')
      setCategoria('')
      setDescripcion('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (!categoria) {
      toast.error('La categoría es obligatoria')
      return
    }

    // Find the category name from the selected category ID
    const selectedCategoria = categorias.find(c => c.id === categoria)
    const categoriaNombre = selectedCategoria?.nombre || ''

    const payload: PlantillaServicioPayload = {
      plantillaId,
      nombre: nombre.trim(),
      categoria: categoriaNombre, // Save category name, not ID
      descripcion: descripcion.trim(),
      subtotalInterno: 0,
      subtotalCliente: 0
    }

    try {
      setLoading(true)
      const nuevo = await createPlantillaServicio(payload)
      onCreated(nuevo)
      onClose()
      toast.success('Sección de servicio creada exitosamente')
    } catch (error) {
      console.error('Error creating service section:', error)
      toast.error('Error al crear la sección de servicio')
    } finally {
      setLoading(false)
    }
  }

  const selectedCategoriaName = categorias.find(c => c.id === categoria)?.nombre || ''

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nueva Sección de Servicio</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 📝 Nombre Field */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del Servicio *</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Programación PLC"
              disabled={loading}
              required
            />
          </div>

          {/* 🏷️ Categoría Field */}
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría *</Label>
            {loadingCategorias ? (
              <div className="flex items-center space-x-2 p-2 border rounded">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-500">Cargando categorías...</span>
              </div>
            ) : (
              <Select value={categoria} onValueChange={setCategoria} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 📄 Descripción Field */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción adicional del servicio..."
              disabled={loading}
              rows={3}
            />
          </div>

          {/* 🎯 Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !nombre.trim() || !categoria}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Sección'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}