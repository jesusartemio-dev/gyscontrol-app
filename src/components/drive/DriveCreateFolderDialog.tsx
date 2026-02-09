'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FolderPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface DriveCreateFolderDialogProps {
  open: boolean
  onClose: () => void
  parentId: string
  onFolderCreated: () => void
}

export function DriveCreateFolderDialog({ open, onClose, parentId, onFolderCreated }: DriveCreateFolderDialogProps) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, name: name.trim() }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Error al crear carpeta')
      }

      toast.success(`Carpeta "${name.trim()}" creada`)
      setName('')
      onClose()
      onFolderCreated()
    } catch (error: any) {
      console.error('Create folder error:', error)
      toast.error(error.message || 'Error al crear carpeta')
    } finally {
      setCreating(false)
    }
  }

  const handleClose = () => {
    if (!creating) {
      setName('')
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) handleCreate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nueva carpeta</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="folder-name">Nombre</Label>
          <Input
            id="folder-name"
            placeholder="Nombre de la carpeta"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={creating}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || creating}>
            {creating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FolderPlus className="h-4 w-4 mr-2" />
            )}
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
