// 📁 Archivo: scripts/backfill-montos-pago-terceros.ts
// 🔧 Descripción: Corrige montoAnticipo/montoGastado/saldo=0 en hojas de
//                 "pago a terceros" creadas antes del fix — recalcula desde
//                 la suma real de sus líneas (misma fórmula que ya usa
//                 gasto-linea/route.ts al agregar una línea normal).
//                 No borra ni crea nada, solo sincroniza campos derivados.
//
// Uso:
//   npx dotenv -e .env.production -o -- npx tsx scripts/backfill-montos-pago-terceros.ts --dry
//   npx dotenv -e .env.production -o -- npx tsx scripts/backfill-montos-pago-terceros.ts --apply
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

async function main() {
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (solo lectura)'}`)

  const hojas = await prisma.hojaDeGastos.findMany({
    where: { tipoPropósito: 'honorarios_terceros' },
    select: {
      id: true, numero: true, montoAnticipo: true, montoGastado: true,
      saldo: true, montoDepositado: true,
      empleado: { select: { name: true } },
      lineas: { select: { monto: true } },
    },
  })

  let corregidas = 0
  for (const h of hojas) {
    const totalLineas = h.lineas.reduce((s, l) => s + l.monto, 0)
    const saldoCorrecto = h.montoDepositado - totalLineas
    const yaCorrecto = h.montoGastado === totalLineas && h.montoAnticipo === totalLineas && h.saldo === saldoCorrecto
    if (yaCorrecto) {
      console.log(`  = ${h.numero}  ${h.empleado?.name}  ya está correcto (S/ ${totalLineas.toFixed(2)})`)
      continue
    }
    console.log(
      `  ${APPLY ? '✔' : '→'} ${h.numero}  ${h.empleado?.name}  ` +
      `montoAnticipo ${h.montoAnticipo}→${totalLineas}  montoGastado ${h.montoGastado}→${totalLineas}  saldo ${h.saldo}→${saldoCorrecto}`
    )
    corregidas++
    if (APPLY) {
      await prisma.hojaDeGastos.update({
        where: { id: h.id },
        data: { montoAnticipo: totalLineas, montoGastado: totalLineas, saldo: saldoCorrecto, updatedAt: new Date() },
      })
    }
  }

  console.log(`\n${APPLY ? 'Corregidas' : 'A corregir'}: ${corregidas} de ${hojas.length} hojas`)
  if (!APPLY) console.log('(dry-run: no se escribió nada. Repetir con --apply)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
