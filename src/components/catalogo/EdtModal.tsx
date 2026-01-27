// ===================================================
// 📁 Archivo: EdtModal.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Modal para crear EDTs
//
// 🧠 Uso: Modal que se abre desde la página de EDTs
// ✍️ Autor: Jesús Artemio
// 📅 Creación: 2025-10-15
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { FolderOpen, Save, X } from 'lucide-react'
import { Edt, EdtPayload, FaseDefault } from '@/types'
import { createEdt } from '@/lib/services/edt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated?: (edt: Edt) => void
}

export default function EdtModal({ isOpen, onClose, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [faseDefaultId, setFaseDefaultId] = useState<string>('')
  const [fasesDefault, setFasesDefault] = useState<FaseDefault[]>([])
  const [loading, setLoading] = useState(false)

  // Cargar fases por defecto
  useEffect(() => {
    const cargarFasesDefault = async () => {
      try {
        const response = await fetch('/api/configuracion/fases-default')
        if (response.ok) {
          const data = await response.json()
          setFasesDefault(data.data || [])
        }
      } catch (error) {
        console.error('Error cargando fases por defecto:', error)
      }
    }
    cargarFasesDefault()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (nombre.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres')
      return
    }

    setLoading(true)
    try {
      const payload: EdtPayload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        faseDefaultId: faseDefaultId || undefined
      }
      const nueva = await createEdt(payload)
      toast.success('EDT creado exitosamente')
      onCreated?.(nueva)
      handleClose()
    } catch (err) {
      console.error('Error creating edt:', err)
      toast.error('Error al crear el EDT')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setNombre('')
    setDescripcion('')
    setFaseDefaultId('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] p-0">
        <div className="px-6 py-4">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <FolderOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Nuevo EDT</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Crea un nuevo EDT para organizar tus servicios
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-sm font-medium">
                Nombre del EDT *
              </Label>
              <Input
                id="nombre"
                placeholder="Ej: Instalación y Montaje"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                disabled={loading}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion" className="text-sm font-medium">
                Descripción
              </Label>
              <Textarea
                id="descripcion"
                placeholder="Describe brevemente esta categoría..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={loading}
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faseDefault" className="text-sm font-medium">
                Fase por Defecto
              </Label>
              <Select value={faseDefaultId || "none"} onValueChange={(value) => setFaseDefaultId(value === "none" ? "" : value)} disabled={loading}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar fase..." />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px]">
                  <SelectItem value="none">Sin fase por defecto</SelectItem>
                  {fasesDefault.map((fase) => (
                    <SelectItem key={fase.id} value={fase.id}>
                      {fase.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Los EDTs de esta categoría se crearán en esta fase automáticamente
              </p>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 border-t bg-gray-50/50 px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
            className="h-9"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !nombre.trim()}
            className="h-9"
          >
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Crear EDT
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}