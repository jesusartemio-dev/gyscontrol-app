/**
 * Seed de saldos iniciales de vacaciones para todos los empleados activos.
 * Ejecutar UNA sola vez al desplegar el módulo en producción.
 * Después el cron anual de reseteo (anio_servicio / anio_calendario) se encarga.
 *
 * Uso: npm run db:seed:saldos-iniciales
 * Producción: npm run db:prod:seed:saldos-iniciales
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const anioActual = new Date().getFullYear()
  console.log(`🌱 Seeding SaldoAusencia inicial — VAC ${anioActual}...`)

  const tipoVac = await prisma.tipoAusencia.findUnique({ where: { codigo: 'VAC' } })
  if (!tipoVac) {
    console.error('❌ TipoAusencia VAC no encontrado. Ejecuta db:seed:ausencias primero.')
    process.exit(1)
  }

  const adminUser = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true },
  })
  if (!adminUser) {
    console.error('❌ No se encontró usuario con role=admin para registrar movimientos de auditoría.')
    process.exit(1)
  }

  const empleados = await prisma.empleado.findMany({
    where: { activo: true },
    select: {
      id: true,
      userId: true,
      user: { select: { name: true, email: true } },
    },
  })

  console.log(`  Empleados activos encontrados: ${empleados.length}`)

  let created = 0
  let skipped = 0

  for (const empleado of empleados) {
    const existing = await prisma.saldoAusencia.findUnique({
      where: {
        userId_tipoAusenciaId_anio: {
          userId: empleado.userId,
          tipoAusenciaId: tipoVac.id,
          anio: anioActual,
        },
      },
    })

    if (existing) {
      skipped++
      continue
    }

    const diasAsignados = tipoVac.diasPorDefecto ?? 15

    await prisma.$transaction(async (tx) => {
      const saldo = await tx.saldoAusencia.create({
        data: {
          userId: empleado.userId,
          tipoAusenciaId: tipoVac.id,
          anio: anioActual,
          diasAsignados,
          diasGozados: 0,
          diasPendientes: 0,
          diasDisponibles: diasAsignados,
        },
      })

      await tx.movimientoSaldoAusencia.create({
        data: {
          saldoId: saldo.id,
          tipo: 'asignacion_anual',
          dias: diasAsignados,
          motivo: `Asignación inicial VAC ${anioActual} — régimen MYPE (${diasAsignados} días)`,
          creadoPorId: adminUser.id,
        },
      })
    })

    created++
    console.log(`  ✅ ${empleado.user.name ?? empleado.user.email} — ${diasAsignados} días VAC`)
  }

  console.log(`\n✅ SaldoAusencia: ${created} creados, ${skipped} ya existían`)
}

main()
  .catch((e) => {
    console.error('❌ Error en seed saldos-ausencia-inicial:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
