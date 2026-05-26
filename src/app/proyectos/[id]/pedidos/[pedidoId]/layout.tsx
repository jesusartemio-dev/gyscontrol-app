import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aprobado: 'Aprobado',
  atendido: 'Atendido',
  parcial: 'Parcial',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; pedidoId: string }>
}): Promise<Metadata> {
  try {
    const { pedidoId } = await params
    const pedido = await prisma.pedidoEquipo.findUnique({
      where: { id: pedidoId },
      select: {
        codigo: true,
        estado: true,
        _count: { select: { pedidoEquipoItem: true } },
        proyecto: { select: { nombre: true, codigo: true } },
      },
    })

    if (!pedido) return { title: 'Pedido | GYS Control' }

    const estado = ESTADO_LABELS[pedido.estado || ''] ?? pedido.estado ?? ''
    const proyectoNombre = pedido.proyecto?.nombre || ''
    const numItems = pedido._count.pedidoEquipoItem

    const title = `Pedido ${pedido.codigo} — ${proyectoNombre}`
    const description = `${numItems} ítem(s) · Estado: ${estado}`

    return {
      title,
      description,
      openGraph: {
        title: `📦 ${pedido.codigo} — ${proyectoNombre}`,
        description,
        type: 'website',
        siteName: 'GYS Control Industrial',
      },
    }
  } catch {
    return { title: 'Pedido | GYS Control' }
  }
}

export default function PedidoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
