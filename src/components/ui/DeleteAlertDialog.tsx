// src/components/ui/DeleteAlertDialog.tsx
"use client"

import { Trash2 } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface Props {
  onConfirm: () => void
}

export function DeleteAlertDialog({ onConfirm }: Props) {
  const [open, setOpen] = useState(false)

  const handleDelete = () => {
    onConfirm()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <h3 className="text-lg font-semibold">¿Eliminar ítem?</h3>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
