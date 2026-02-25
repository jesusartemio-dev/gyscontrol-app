// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaLike = any

interface EventoData {
  proyectoId?: string | null
  pedidoEquipoId?: string | null
  listaEquipoId?: string | null
  entregaItemId?: string | null
  tipo: string
  descripcion: string
  usuarioId: string
  estadoAnterior?: string | null
  estadoNuevo?: string | null
  metadata?: Record<string, any> | null
}

/**
 * Crea un evento de trazabilidad en la cadena logística.
 * Puede usarse dentro o fuera de transacciones.
 */
export async function crearEvento(
  prisma: PrismaLike,
  data: EventoData
): Promise<void> {
  try {
    await (prisma as any).eventoTrazabilidad.create({
      data: {
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        proyectoId: data.proyectoId || null,
        pedidoEquipoId: data.pedidoEquipoId || null,
        listaEquipoId: data.listaEquipoId || null,
        entregaItemId: data.entregaItemId || null,
        tipo: data.tipo,
        descripcion: data.descripcion,
        usuarioId: data.usuarioId,
        estadoAnterior: data.estadoAnterior || null,
        estadoNuevo: data.estadoNuevo || null,
        metadata: data.metadata || null,
        updatedAt: new Date(),
      },
    })
  } catch (e) {
    console.error('[trazabilidad] Error creando evento:', e)
  }
}
