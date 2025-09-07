'use client'

import React from 'react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DialogClose } from '@radix-ui/react-dialog'

interface ConfirmDialogProps {
  title: string
  description: string
  onConfirm: () => void
  // Props for external control
  open?: boolean
  onOpenChange?: (open: boolean) => void
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  // Props for trigger pattern
  trigger?: React.ReactNode
}

export default function ConfirmDialog({
  title,
  description,
  onConfirm,
  open,
  onOpenChange,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'destructive',
  trigger,
}: ConfirmDialogProps) {
  // If trigger is provided, use internal state pattern
  if (trigger) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                {cancelText}
              </Button>
            </DialogClose>
            <Button variant={variant} onClick={onConfirm}>
              {confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // External control pattern
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            type="button"
            onClick={() => onOpenChange?.(false)}
          >
            {cancelText}
          </Button>
          <Button 
            variant={variant} 
            onClick={() => {
              onConfirm()
              onOpenChange?.(false)
            }}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
