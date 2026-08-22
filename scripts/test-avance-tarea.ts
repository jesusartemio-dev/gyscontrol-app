import { prisma } from '@/lib/prisma'
import { registrarAvanceTarea, revertirAvanceJornada, diaUTC } from '@/lib/services/avanceTarea'
import { randomUUID } from 'crypto'

/**
 * Prueba funcional del helper de avance contra la base LOCAL (nunca producción).
 * Crea una tarea de usar y tirar, ejercita los casos que importan, y la borra.
 *
 *   npx dotenv -e .env -o -- npx tsx scripts/test-avance-tarea.ts
 */

let fallos = 0
function check(nombre: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado)
  if (!ok) fallos++
  console.log(`${ok ? '✅' : '❌'} ${nombre}${ok ? '' : `  → esperado ${JSON.stringify(esperado)}, obtuve ${JSON.stringify(real)}`}`)
}

async function main() {
  if ((process.env.DATABASE_URL ?? '').includes('neon.tech')) {
    throw new Error('Este test escribe: NO correrlo contra producción.')
  }

  const edt = await prisma.proyectoEdt.findFirst({
    select: { id: true, proyectoId: true, proyectoCronogramaId: true },
  })
  if (!edt) { console.log('⚠️  La base local no tiene ProyectoEdt; no se puede probar.'); return }

  const tarea = await prisma.proyectoTarea.create({
    data: {
      id: randomUUID(),
      proyectoEdtId: edt.id,
      proyectoCronogramaId: edt.proyectoCronogramaId,
      nombre: '__test avance fechado__',
      fechaInicio: new Date('2026-08-01T00:00:00Z'),
      fechaFin: new Date('2026-08-31T00:00:00Z'),
      horasEstimadas: 10,
      updatedAt: new Date(),
    },
    select: { id: true },
  })
  const id = tarea.id
  const pct = async () =>
    (await prisma.proyectoTarea.findUnique({ where: { id }, select: { porcentajeCompletado: true } }))!.porcentajeCompletado
  const estadoDe = async () =>
    (await prisma.proyectoTarea.findUnique({ where: { id }, select: { estado: true } }))!.estado
  const finReal = async () =>
    (await prisma.proyectoTarea.findUnique({ where: { id }, select: { fechaFinReal: true } }))!.fechaFinReal

  try {
    // 1. Avance normal
    await registrarAvanceTarea(prisma, {
      proyectoTareaId: id, porcentaje: 30,
      fechaEfecto: new Date('2026-08-18T00:00:00Z'), origen: 'oficina',
    })
    check('avance simple deja el % en 30', await pct(), 30)
    check('estado pasa a en_progreso', await estadoDe(), 'en_progreso')

    // 2. Jornada atrasada: fecha ANTERIOR con % menor. NO debe pisar el caché.
    await registrarAvanceTarea(prisma, {
      proyectoTareaId: id, porcentaje: 15,
      fechaEfecto: new Date('2026-08-05T00:00:00Z'), origen: 'campo',
    })
    check('jornada atrasada NO pisa el avance más reciente', await pct(), 30)
    check('...pero sí queda el asiento del pasado',
      await prisma.proyectoTareaAvance.count({ where: { proyectoTareaId: id } }), 2)

    // 3. Avance posterior: sí manda.
    await registrarAvanceTarea(prisma, {
      proyectoTareaId: id, porcentaje: 100,
      fechaEfecto: new Date('2026-08-20T00:00:00Z'), origen: 'oficina',
    })
    check('avance más reciente sí manda', await pct(), 100)
    check('estado pasa a completada', await estadoDe(), 'completada')
    check('fechaFinReal = fecha del avance, no hoy',
      (await finReal())?.toISOString().slice(0, 10), '2026-08-20')

    // 4. Corrección a la baja el mismo día: el último gana.
    await registrarAvanceTarea(prisma, {
      proyectoTareaId: id, porcentaje: 80,
      fechaEfecto: new Date('2026-08-20T12:34:56Z'), origen: 'oficina',
    })
    check('mismo día = un solo asiento (clave única)',
      await prisma.proyectoTareaAvance.count({ where: { proyectoTareaId: id } }), 3)
    check('corrección a la baja se aplica', await pct(), 80)
    check('deja de estar completada', await estadoDe(), 'en_progreso')
    check('fechaFinReal se limpia al bajar del 100%', await finReal(), null)

    // 5. La hora del día no crea asientos duplicados (normalización UTC).
    const fechas = await prisma.proyectoTareaAvance.findMany({
      where: { proyectoTareaId: id }, select: { fecha: true }, orderBy: { fecha: 'asc' },
    })
    check('todas las fechas son medianoche UTC',
      fechas.every((f) => f.fecha.getTime() === diaUTC(f.fecha).getTime()), true)

    // 6. Reversión de jornada rechazada.
    const jornada = await prisma.registroHorasCampo.create({
      data: {
        id: randomUUID(),
        proyectoId: edt.proyectoId,
        supervisorId: (await prisma.user.findFirst({ select: { id: true } }))!.id,
        fechaTrabajo: new Date('2026-08-22T00:00:00Z'),
        estado: 'iniciado',
        updatedAt: new Date(),
      },
      select: { id: true },
    })
    await prisma.registroHorasCampoTarea.create({
      data: { id: randomUUID(), registroCampoId: jornada.id, proyectoTareaId: id },
    })
    await registrarAvanceTarea(prisma, {
      proyectoTareaId: id, porcentaje: 95,
      fechaEfecto: new Date('2026-08-22T00:00:00Z'), origen: 'campo',
    })
    check('la jornada aplica su avance', await pct(), 95)

    await revertirAvanceJornada(prisma, jornada.id)
    check('al rechazar la jornada se borra su asiento',
      await prisma.proyectoTareaAvance.count({ where: { proyectoTareaId: id } }), 3)
    check('y el % vuelve al valor anterior', await pct(), 80)

    await prisma.registroHorasCampo.delete({ where: { id: jornada.id } })
  } finally {
    await prisma.proyectoTareaAvance.deleteMany({ where: { proyectoTareaId: id } })
    await prisma.proyectoTarea.delete({ where: { id } })
    console.log('\n🧹 tarea de prueba eliminada')
  }

  console.log(fallos === 0 ? '\n✅ Todo correcto' : `\n❌ ${fallos} fallo(s)`)
  if (fallos > 0) process.exitCode = 1
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
