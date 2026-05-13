import { prisma } from '@/lib/prisma'

const MAX_DURACION_MS = 10 * 60 * 1000

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
