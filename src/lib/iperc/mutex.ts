import { prisma } from '@/lib/prisma'
import { MODELS } from '@/lib/agente/models'

const MAX_DURACION_MS = 10 * 60 * 1000

export interface LockResult {
  ok: boolean
  generacionId?: string
  conflicto?: { iniciadaEn: Date; expiraEn: Date }
}

/**
 * Adquiere el lock de generación IA para un IPERC.
 * Usa IpercGeneracion con estado='en_progreso' como mecanismo de mutex.
 * Expira automáticamente a los 10 minutos.
 */
export async function adquirirLock(ipercId: string): Promise<LockResult> {
  const expiracion = new Date(Date.now() - MAX_DURACION_MS)

  const lockActivo = await prisma.ipercGeneracion.findFirst({
    where: {
      ipercId,
      estado: 'en_progreso',
      createdAt: { gt: expiracion },
    },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  if (lockActivo) {
    return {
      ok: false,
      conflicto: {
        iniciadaEn: lockActivo.createdAt,
        expiraEn: new Date(lockActivo.createdAt.getTime() + MAX_DURACION_MS),
      },
    }
  }

  const generacion = await prisma.ipercGeneracion.create({
    data: {
      ipercId,
      estado: 'en_progreso',
      modeloUsado: `${MODELS.haiku}+${MODELS.sonnet}`,
      snapshotFilas: [],
    },
  })

  return { ok: true, generacionId: generacion.id }
}

export async function completarLock(
  generacionId: string,
  datos: {
    snapshotFilas: unknown[]
    tokens: number
    costoUsd: number
    duracionMs: number
  }
): Promise<void> {
  await prisma.ipercGeneracion.update({
    where: { id: generacionId },
    data: {
      estado: 'completada',
      snapshotFilas: datos.snapshotFilas,
      tokens: datos.tokens,
      costoUsd: datos.costoUsd,
      duracionMs: datos.duracionMs,
    },
  })
}

export async function fallarLock(generacionId: string, errorMensaje: string): Promise<void> {
  await prisma.ipercGeneracion.update({
    where: { id: generacionId },
    data: { estado: 'fallida', errorMensaje },
  })
}
