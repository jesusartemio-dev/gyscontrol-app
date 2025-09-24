'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'
import CotizacionForm from './CotizacionForm'
import type { Cotizacion } from '@/types'

interface CotizacionModalProps {
  onCreated: (nueva: Cotizacion) => void
  trigger?: React.ReactNode
}

export default function CotizacionModal({ onCreated, trigger }: CotizacionModalProps) {
  const [open, setOpen] = useState(false)

  const handleCreated = (nueva: Cotizacion) => {
    onCreated(nueva)
    setOpen(false)
  }

  const defaultTrigger = (
    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
      <Plus className="h-4 w-4 mr-2" />
      Nueva Cotización
    </Button>
  )

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger || defaultTrigger}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-blue-600" />
              Crear Nueva Cotización
            </DialogTitle>
            <DialogDescription>
              Completa el formulario para crear una nueva cotización desde cero
            </DialogDescription>
          </DialogHeader>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="py-4"
          >
            <CotizacionForm onCreated={handleCreated} />
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  )
}