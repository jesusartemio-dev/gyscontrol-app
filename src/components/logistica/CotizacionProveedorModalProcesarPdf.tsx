// ===================================================
// 📁 Archivo: CotizacionProveedorModalProcesarPdf.tsx
// 📌 Descripción: Modal para subir un PDF y enviarlo al backend para procesar datos de cotización
// 🧠 Uso: Abierto desde CotizacionProveedorAccordion para importar datos automáticamente
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Última actualización: 2025-05-30
// ===================================================

'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { buildApiUrl } from '@/lib/utils'

interface Props {
  cotizacionId: string
  onClose: () => void
}

export default function CotizacionProveedorModalProcesarPdf({ cotizacionId, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async () => {
    if (!file) {
      toast.warning('Selecciona un archivo PDF')
      return
    }

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('cotizacionId', cotizacionId)

      const res = await fetch(buildApiUrl('/api/procesar-pdf'), {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()
      if (res.ok) {
        toast.success('✅ PDF procesado exitosamente')
        onClose()
      } else {
        toast.error(`❌ Error: ${result.error || 'No se pudo procesar el PDF'}`)
      }
    } catch (error) {
      console.error('❌ Error al procesar PDF:', error)
      toast.error('❌ Error inesperado al procesar PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>📄 Procesar PDF para Cotización</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input type="file" accept="application/pdf" onChange={handleFileChange} />

          <Button
            onClick={handleSubmit}
            disabled={loading || !file}
            className="w-full bg-blue-600 text-white"
          >
            {loading ? 'Procesando...' : 'Procesar PDF'}
          </Button>

          <Button variant="outline" onClick={onClose} className="w-full">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
