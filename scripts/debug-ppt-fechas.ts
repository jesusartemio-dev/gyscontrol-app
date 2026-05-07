import { PrismaClient } from '@prisma/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

async function main() {
  const prisma = new PrismaClient()

  const registros = await prisma.registroSeguridad.findMany({
    take: 5,
    include: {
      evidencia: {
        select: {
          id: true,
          estado: true,
          jornada: {
            select: {
              id: true,
              fechaTrabajo: true,
              estado: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  for (const r of registros) {
    console.log('---')
    console.log('registro.id:', r.id)
    console.log('registro.tipo:', r.tipo)
    console.log('evidencia:', r.evidencia ? r.evidencia.id : 'NULL ❌')
    console.log('evidencia.jornada:', r.evidencia?.jornada ? 'ok' : 'NULL ❌')
    const fecha = r.evidencia?.jornada?.fechaTrabajo
    console.log('fechaTrabajo raw:', fecha)
    console.log('fechaTrabajo type:', typeof fecha, fecha instanceof Date ? '(Date)' : '(not Date)')
    if (fecha) {
      try {
        const formatted = format(fecha, 'dd/MM/yyyy', { locale: es })
        console.log('formatearFechaCorta result:', formatted)
      } catch (e) {
        console.error('format() threw:', e)
      }
    }
  }

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
