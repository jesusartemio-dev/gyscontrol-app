/**
 * Migra todas las HojaDeGastos en estado 'validado' a 'revisado'.
 *
 * Motivo: se introdujo el nuevo estado 'revisado' entre 'rendido' y 'validado'.
 * Las hojas que hoy están en 'validado' deben pasar por el nuevo paso de validación
 * del coordinador (revisado → validado).
 *
 * Preserva fechaValidacion como fechaRevision para conservar el historial.
 *
 * Por defecto corre en modo DRY-RUN.
 * Para aplicar: pasá --apply.
 *
 * Uso:
 *   dotenv -e .env -o -- npx tsx scripts/migrar-estado-revisado.ts          # dry-run local
 *   dotenv -e .env -o -- npx tsx scripts/migrar-estado-revisado.ts --apply  # aplica local
 *   dotenv -e .env.production -o -- npx tsx scripts/migrar-estado-revisado.ts          # dry-run prod
 *   dotenv -e .env.production -o -- npx tsx scripts/migrar-estado-revisado.ts --apply  # aplica prod
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

async function main() {
  console.log(APPLY ? '🔄 MODO APLICAR (se modificarán datos)' : '🔍 MODO DRY-RUN (sin cambios)')
  console.log('─'.repeat(60))

  const hojas = await prisma.hojaDeGastos.findMany({
    where: { estado: 'validado' },
    select: {
      id: true,
      numero: true,
      fechaValidacion: true,
      empleado: { select: { name: true } },
      saldo: true,
    },
    orderBy: { fechaValidacion: 'asc' },
  })

  if (hojas.length === 0) {
    console.log('✅ No hay hojas en estado validado para migrar')
    return
  }

  console.log(`Encontradas ${hojas.length} hojas en estado 'validado':\n`)
  for (const h of hojas) {
    const emp = h.empleado?.name ?? '—'
    const fv = h.fechaValidacion?.toISOString().slice(0, 10) ?? 'sin fecha'
    console.log(
      `  • ${h.numero}  empleado=${emp.padEnd(28)} validada=${fv}  saldo=S/ ${h.saldo.toFixed(2)}`
    )
  }

  if (!APPLY) {
    console.log('\n💡 Para aplicar: pasá --apply')
    return
  }

  // Buscar usuario sistema para los eventos de auditoría
  const sistema = await prisma.user.findFirst({
    where: { OR: [{ email: 'sistema@gyscontrol.com' }, { role: 'admin' }] },
    select: { id: true, name: true },
  })
  if (!sistema) {
    console.error('❌ No se encontró usuario admin/sistema para registrar los eventos')
    process.exit(1)
  }

  console.log(`\n🔄 Migrando ${hojas.length} hojas (eventos atribuidos a ${sistema.name})...`)

  let migradas = 0
  for (const h of hojas) {
    await prisma.$transaction(async (tx) => {
      await tx.hojaDeGastos.update({
        where: { id: h.id },
        data: {
          estado: 'revisado',
          fechaRevision: h.fechaValidacion,
          fechaValidacion: null,
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: h.id,
          tipo: 'comentario',
          descripcion: 'Migración: estado validado → revisado por nuevo flujo (introducción del paso revisado)',
          estadoAnterior: 'validado',
          estadoNuevo: 'revisado',
          usuarioId: sistema.id,
          metadata: { migracion: 'estado_revisado_introducido', fechaValidacionPrevia: h.fechaValidacion },
        },
      })
    })
    migradas++
  }

  console.log(`✅ Migradas: ${migradas}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
