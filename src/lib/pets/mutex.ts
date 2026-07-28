import { prisma } from '@/lib/prisma'

// Alineado al maxDuration=300s de las rutas de generación/regeneración —
// un lock más viejo que eso es de una función que Vercel ya mató (murió sin
// llegar al finally que libera el lock), no una generación real en curso.
// Antes era 10 min; eso dejaba al usuario esperando el doble de lo necesario
// para poder reintentar tras un corte.
const MAX_DURACION_MS = 6 * 60 * 1000

export interface LockResult {
  ok: boolean
  conflicto?: { iniciadaEn: Date; expiraEn: Date }
}

export async function adquirirLockPets(petsId: string): Promise<LockResult> {
  const expiracionMinima = new Date(Date.now() - MAX_DURACION_MS)

  const pets = await prisma.pets.findFirst({
    where: {
      id: petsId,
      iaEnCurso: true,
      iaExpiraEn: { gt: expiracionMinima },
    },
    select: { id: true, iaExpiraEn: true },
  })

  if (pets?.iaExpiraEn) {
    return {
      ok: false,
      conflicto: {
        iniciadaEn: new Date(pets.iaExpiraEn.getTime() - MAX_DURACION_MS),
        expiraEn: pets.iaExpiraEn,
      },
    }
  }

  const nuevaExpiracion = new Date(Date.now() + MAX_DURACION_MS)
  await prisma.pets.update({
    where: { id: petsId },
    data: { iaEnCurso: true, iaExpiraEn: nuevaExpiracion },
  })

  return { ok: true }
}

export async function liberarLockPets(petsId: string): Promise<void> {
  await prisma.pets.update({
    where: { id: petsId },
    data: { iaEnCurso: false, iaExpiraEn: null },
  })
}
