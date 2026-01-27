// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  const baseClient = new PrismaClient({ adapter })

  // Extension para soft delete en Proyecto
  // Filtra automáticamente registros con deletedAt != null
  // NOTA: Esta extension solo funciona completamente después de ejecutar `prisma generate`
  // Mientras tanto, el filtrado se hace manualmente en las queries o con $queryRaw
  return baseClient.$extends({
    name: 'softDelete',
    query: {
      proyecto: {
        async findMany({ args, query }) {
          // Solo filtrar si deletedAt existe en el schema (después de prisma generate)
          // y no se especifica explícitamente incluir eliminados
          try {
            if (!args.where?.deletedAt) {
              args.where = { ...args.where, deletedAt: null }
            }
          } catch {
            // Si falla, continuar sin el filtro (campo aún no existe en tipos)
          }
          return query(args)
        },
        async findFirst({ args, query }) {
          try {
            if (!args.where?.deletedAt) {
              args.where = { ...args.where, deletedAt: null }
            }
          } catch {
            // Continuar sin filtro
          }
          return query(args)
        },
        async findUnique({ args, query }) {
          const result = await query(args)
          // Solo ocultar si deletedAt tiene un valor (no undefined ni null)
          // Usa any para evitar errores de tipos hasta que se regenere Prisma
          if (result && (result as any).deletedAt) {
            return null
          }
          return result
        },
        async count({ args, query }) {
          try {
            if (!args.where?.deletedAt) {
              args.where = { ...args.where, deletedAt: null }
            }
          } catch {
            // Continuar sin filtro
          }
          return query(args)
        },
        async aggregate({ args, query }) {
          try {
            if (!args.where?.deletedAt) {
              args.where = { ...args.where, deletedAt: null }
            }
          } catch {
            // Continuar sin filtro
          }
          return query(args)
        },
        async groupBy({ args, query }) {
          try {
            if (!args.where?.deletedAt) {
              args.where = { ...args.where, deletedAt: null }
            }
          } catch {
            // Continuar sin filtro
          }
          return query(args)
        }
      }
    }
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Tipo para usar en otros archivos si se necesita acceder a registros eliminados
export type PrismaClientWithSoftDelete = typeof prisma
