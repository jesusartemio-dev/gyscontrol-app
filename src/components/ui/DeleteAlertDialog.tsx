// src/components/ui/DeleteAlertDialog.tsx
"use client"

import React from "react"
import { Trash2 } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface Props {
  onConfirm: () => void
  title?: string
  description?: string | React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DeleteAlertDialog({
  onConfirm,
  title = "¿Eliminar ítem?",
  description = "Esta acción no se puede deshacer.",
  open,
  onOpenChange
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = open !== undefined && onOpenChange !== undefined
  const dialogOpen = isControlled ? open : internalOpen
  const setDialogOpen = isControlled ? onOpenChange : setInternalOpen

  const handleDelete = () => {
    onConfirm()
    setDialogOpen(false)
  }

  // If controlled, don't render the trigger button
  if (isControlled) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            {typeof description === 'string' ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : (
              description
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // If uncontrolled, render with trigger
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {typeof description === 'string' ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : (
            description
          )}
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
