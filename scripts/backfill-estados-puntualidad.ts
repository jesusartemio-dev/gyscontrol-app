// Script de backfill: migra los estados 'fuera_zona' y 'dispositivo_nuevo'
// al concepto separado de puntualidad + banderas.
//
// Antes: estado='dispositivo_nuevo' (mezclaba puntualidad y alerta)
// Ahora: estado='a_tiempo' + banderas+='dispositivo_nuevo'
//
// Uso:
//   npx tsx scripts/backfill-estados-puntualidad.ts                 # local (.env)
//   npx dotenv -e .env.production -- npx tsx scripts/backfill-estados-puntualidad.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const afectados = await prisma.asistencia.findMany({
    where: { estado: { in: ['fuera_zona', 'dispositivo_nuevo'] } },
    select: { id: true, estado: true, banderas: true },
  })

  console.log(`📋 ${afectados.length} marcajes con estados a migrar`)

  if (afectados.length === 0) {
    console.log('✅ Nada que hacer.')
    return
  }

  let actualizados = 0
  const conteo = { fuera_zona: 0, dispositivo_nuevo: 0 }

  for (const a of afectados) {
    const bandera = a.estado // 'fuera_zona' o 'dispositivo_nuevo'
    const banderasNuevas = a.banderas.includes(bandera)
      ? a.banderas
      : [...a.banderas, bandera]

    await prisma.asistencia.update({
      where: { id: a.id },
      data: {
        estado: 'a_tiempo',
        banderas: banderasNuevas,
      },
    })
    actualizados++
    conteo[a.estado as 'fuera_zona' | 'dispositivo_nuevo']++
  }

  console.log(`\n✅ Backfill completado:`)
  console.log(`   ${actualizados} marcajes migrados a estado 'a_tiempo' con su bandera correspondiente`)
  console.log(`   - ${conteo.fuera_zona} venían de 'fuera_zona'`)
  console.log(`   - ${conteo.dispositivo_nuevo} venían de 'dispositivo_nuevo'`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
