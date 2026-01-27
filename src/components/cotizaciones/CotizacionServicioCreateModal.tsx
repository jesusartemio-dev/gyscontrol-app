// ===================================================
// 📁 Archivo: CotizacionServicioCreateModal.tsx
// 📌 Ubicación: src/components/cotizaciones/
// 🔧 Descripción: Modal para crear una sección de servicios en la cotización
//
// 🧠 Uso: Modal que se abre desde el botón "+ Nuevo Servicio"
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-10-03
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { createCotizacionServicio } from '@/lib/services/cotizacionServicio'
import { getEdts } from '@/lib/services/edt'
import type { CotizacionServicioPayload, Edt } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Props {
  cotizacionId: string
  isOpen: boolean
  onClose: () => void
  onCreated: (nuevo: any) => void
}

export default function CotizacionServicioCreateModal({
  cotizacionId,
  isOpen,
  onClose,
  onCreated
}: Props) {
  const [nombre, setNombre] = useState('')
  const [edt, setEdt] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [edts, setEdts] = useState<Edt[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingEdts, setLoadingEdts] = useState(false)

  // ✅ Load EDTs when modal opens
  useEffect(() => {
    if (isOpen && edts.length === 0) {
      setLoadingEdts(true)
      getEdts()
        .then((cats) => {
          setEdts(cats)
          if (cats.length > 0) {
            setEdt(cats[0].id)
          }
        })
        .catch(() => {
          toast.error('Error al cargar EDTs')
        })
        .finally(() => {
          setLoadingEdts(false)
        })
    }
  }, [isOpen, edts.length])

  // ✅ Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNombre('')
      setEdt('')
      setDescripcion('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (!edt) {
      toast.error('El EDT es obligatorio')
      return
    }

    const payload: CotizacionServicioPayload = {
      cotizacionId,
      nombre: nombre.trim(),
      edtId: edt,
      subtotalInterno: 0,
      subtotalCliente: 0
    }

    try {
      setLoading(true)
      const nuevo = await createCotizacionServicio(payload)
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

  const selectedEdtName = edts.find(c => c.id === edt)?.nombre || ''

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

          {/* 🏷️ EDT Field */}
           <div className="space-y-2">
             <Label htmlFor="edt">EDT *</Label>
             {loadingEdts ? (
               <div className="flex items-center space-x-2 p-2 border rounded">
                 <Loader2 className="h-4 w-4 animate-spin" />
                 <span className="text-sm text-gray-500">Cargando EDTs...</span>
               </div>
             ) : (
               <Select value={edt} onValueChange={setEdt} disabled={loading}>
                 <SelectTrigger>
                   <SelectValue placeholder="Selecciona un EDT" />
                 </SelectTrigger>
                 <SelectContent>
                   {edts.map((cat) => (
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
              disabled={loading || !nombre.trim() || !edt}
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