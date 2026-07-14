'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { CATEGORIAS_CATALOGO_IMAGEN } from '@/lib/validators/catalogoImagen'
import type { CatalogoImagen } from '@prisma/client'

interface Props {
  imagen: CatalogoImagen | null
  onClose: () => void
  onSaved: () => Promise<void>
}

const CATEGORIA_LABEL: Record<string, string> = {
  EQUIPO: 'Equipo',
  HERRAMIENTA: 'Herramienta',
  EPP: 'EPP',
  OTRO: 'Otro',
}

export function CatalogoImagenModal({ imagen, onClose, onSaved }: Props) {
  const esEdicion = imagen !== null
  const [nombre, setNombre] = useState(imagen?.nombre ?? '')
  const [categoria, setCategoria] = useState(imagen?.categoria ?? 'EQUIPO')
  const [keywordsTexto, setKeywordsTexto] = useState((imagen?.keywords ?? []).join(', '))
  const [file, setFile] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    if (!esEdicion && !file) {
      toast.error('Selecciona una imagen para subir')
      return
    }

    setGuardando(true)
    try {
      const keywords = keywordsTexto.split(',').map(k => k.trim()).filter(Boolean)

      if (esEdicion) {
        const res = await fetch(`/api/catalogo-imagenes/${imagen!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, categoria, keywords }),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e.error ?? 'Error al guardar')
        }
      } else {
        const formData = new FormData()
        formData.append('file', file!)
        formData.append('nombre', nombre)
        formData.append('categoria', categoria)
        formData.append('keywords', JSON.stringify(keywords))
        const res = await fetch('/api/catalogo-imagenes', { method: 'POST', body: formData })
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e.error ?? 'Error al subir la imagen')
        }
      }

      toast.success(esEdicion ? 'Imagen actualizada' : 'Imagen agregada al catálogo')
      await onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Editar imagen' : 'Nueva imagen del catálogo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {!esEdicion && (
            <div>
              <Label className="text-xs">Archivo (jpg/png)</Label>
              <Input type="file" accept="image/jpeg,image/png" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
          )}
          <div>
            <Label className="text-xs">Nombre</Label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Roscadora automática" />
          </div>
          <div>
            <Label className="text-xs">Categoría</Label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="w-full h-9 text-sm border rounded-md px-2 bg-white"
            >
              {CATEGORIAS_CATALOGO_IMAGEN.map(cat => (
                <option key={cat} value={cat}>{CATEGORIA_LABEL[cat]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Keywords (separadas por coma)</Label>
            <Input value={keywordsTexto} onChange={e => setKeywordsTexto(e.target.value)} placeholder="roscadora, rosca automática" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={guardando}>
            {guardando ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            {esEdicion ? 'Guardar' : 'Subir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
