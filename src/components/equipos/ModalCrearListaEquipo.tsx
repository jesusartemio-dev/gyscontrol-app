'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, Loader2, ListPlus, FileText, Calendar } from 'lucide-react'

interface ModalCrearListaEquipoProps {
  proyectoId: string
  onCreated: (payload: any) => void
  triggerClassName?: string
}

export default function ModalCrearListaEquipo({
  proyectoId,
  onCreated,
  triggerClassName = ''
}: ModalCrearListaEquipoProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ nombre?: string }>({})

  const resetForm = () => {
    setNombre('')
    setFechaNecesaria('')
    setErrors({})
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim()) {
      setErrors({ nombre: 'El nombre es obligatorio' })
      return
    }
    if (nombre.trim().length < 3) {
      setErrors({ nombre: 'Mínimo 3 caracteres' })
      return
    }

    try {
      setLoading(true)

      const payload: Record<string, string> = {
        proyectoId,
        nombre: nombre.trim(),
      }
      if (fechaNecesaria) payload.fechaNecesaria = fechaNecesaria

      const response = await fetch('/api/listas-equipo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        let errorMessage = 'Error al crear la lista'
        try {
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          }
        } catch {}

        if (response.status === 401) {
          throw new Error('No tienes autorización. Inicia sesión nuevamente.')
        }
        throw new Error(errorMessage)
      }

      const nuevaLista = await response.json()
      onCreated(nuevaLista)
      setIsOpen(false)
      resetForm()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al crear la lista'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={`bg-green-600 hover:bg-green-700 text-white ${triggerClassName}`}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Nueva Lista
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-green-100">
              <ListPlus className="h-4 w-4 text-green-700" />
            </div>
            Nueva Lista Técnica
          </DialogTitle>
          <DialogDescription>
            Crea una lista para organizar los equipos del proyecto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="lista-nombre" className="text-sm font-medium">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="lista-nombre"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value)
                  if (errors.nombre) setErrors({})
                }}
                placeholder="Ej: Equipos Eléctricos Sala 1"
                className={`pl-9 ${errors.nombre ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                disabled={loading}
                autoFocus
              />
            </div>
            {errors.nombre && (
              <p className="text-xs text-red-600">{errors.nombre}</p>
            )}
          </div>

          {/* Fecha necesaria */}
          <div className="space-y-1.5">
            <Label htmlFor="lista-fecha" className="text-sm font-medium">
              Fecha necesaria <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="lista-fecha"
                type="date"
                value={fechaNecesaria}
                onChange={(e) => setFechaNecesaria(e.target.value)}
                className="pl-9"
                disabled={loading}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
              className="h-9"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !nombre.trim()}
              className="h-9 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Crear Lista
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
