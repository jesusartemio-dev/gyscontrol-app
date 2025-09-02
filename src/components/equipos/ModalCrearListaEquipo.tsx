'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import ListaEquipoForm from './ListaEquipoForm'
import type { ListaEquipoPayload } from '@/types'

/**
 * ✅ Modal para crear nueva lista de equipos
 * Convierte el formulario siempre visible en un botón que abre modal
 */
interface ModalCrearListaEquipoProps {
  proyectoId: string
  onCreated: (payload: ListaEquipoPayload) => void
  triggerClassName?: string
}

export default function ModalCrearListaEquipo({
  proyectoId,
  onCreated,
  triggerClassName = ''
}: ModalCrearListaEquipoProps) {
  const [isOpen, setIsOpen] = useState(false)

  // ✅ Handle successful creation
  const handleCreated = (payload: ListaEquipoPayload) => {
    onCreated(payload)
    setIsOpen(false) // Close modal after creation
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className={`flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white ${triggerClassName}`}
        >
          <Plus className="h-4 w-4" />
          Nueva Lista Técnica
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Plus className="h-5 w-5 text-green-600" />
            Nueva Lista Técnica
          </DialogTitle>
        </DialogHeader>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4"
        >
          <ListaEquipoForm
            proyectoId={proyectoId}
            onCreated={handleCreated}
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}