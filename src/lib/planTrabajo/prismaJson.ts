import { Prisma } from '@prisma/client'

/**
 * Convierte un valor al tipo correcto de Prisma para campos Json nullable.
 * - undefined → no actualiza el campo
 * - null      → setea a NULL en BD (Prisma.JsonNull)
 * - cualquier otro valor → se guarda como JSON
 */
export function toPrismaJsonNullable(
  value: unknown
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined
  if (value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}
