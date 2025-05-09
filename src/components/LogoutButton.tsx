'use client'

import { signOut } from 'next-auth/react'
import { useState } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {}

export default function LogoutButton({ className, ...props }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={className || 'w-full mt-6 flex items-center gap-2 justify-center'}
          {...props}
        >
          <LogOut size={16} className="text-gray-600" />
          <span>Cerrar sesión</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Deseas cerrar sesión?</DialogTitle>
        </DialogHeader>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setOpen(false)
              signOut()
            }}
          >
            Cerrar sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
