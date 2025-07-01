'use client'

import { CotizacionProveedor } from '@/types'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  cotizacion: CotizacionProveedor
}

export default function CotizacionEnviarCorreoButton({ cotizacion }: Props) {
  const buildGmailLink = () => {
    const asunto = `Solicitud de Cotización: ${cotizacion.codigo}`
    const cuerpo = `Estimado proveedor,

Adjuntamos los detalles para cotizar los siguientes ítems del proyecto:

${cotizacion.items && cotizacion.items.length > 0
      ? cotizacion.items
          .map(
            (item) =>
              `• ${item.descripcion} (Catalgo: ${item.codigo}) — ${item.cantidad} unidades`
          )
          .join('\n')
      : 'No hay ítems registrados en esta cotización.'}

Por favor indicar precio unitario (USD), tiempo estimado de entrega y condiciones comerciales.

Quedamos atentos a su pronta respuesta.

Atentamente,
GYS Control Industrial`

    return `https://mail.google.com/mail/?view=cm&fs=1&to=&su=${encodeURIComponent(
      asunto
    )}&body=${encodeURIComponent(cuerpo)}`
  }

  return (
    <a href={buildGmailLink()} target="_blank" rel="noopener noreferrer">
      <Button size="sm" variant="outline">
        <Mail className="w-4 h-4 mr-1" /> Enviar desde Gmail
      </Button>
    </a>
  )
}
