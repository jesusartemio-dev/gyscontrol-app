'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface Props {
  valor: string
  onSave: (v: string) => Promise<void>
  onCancel: () => void
}

export function ObjetivoEditor({ valor, onSave, onCancel }: Props) {
  const [texto, setTexto] = useState(valor)
  const [guardando, setGuardando] = useState(false)

  const handleSave = async () => {
    setGuardando(true)
    try {
      await onSave(texto)
      toast.success('Objetivo guardado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="right" className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Editar Objetivo</SheetTitle>
        </SheetHeader>
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Descripción del objetivo del proyecto..."
          className="mt-4 min-h-[400px] resize-none"
        />
        <SheetFooter className="mt-4">
          <Button variant="outline" onClick={onCancel} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={guardando}>
            {guardando ? (
              <><Loader2 className="animate-spin h-4 w-4 mr-2" />Guardando...</>
            ) : 'Guardar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
