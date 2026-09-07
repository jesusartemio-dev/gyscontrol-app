/**
 * 📁 scripts/importar-saldo-banco-horas.ts
 *
 * Import único del saldo de arrastre del Banco de Horas (ver
 * src/lib/services/bancoHoras.ts), tomado del registro manual en Excel que
 * llevaba el coordinador de construcción. fechaCorte = hoy: el sistema
 * calcula solo desde ese punto en adelante usando RegistroHoras aprobado.
 *
 * Emails confirmados contra producción (scripts/tmp-buscar-nombres.ts) —
 * el patrón corto del Excel ("TitoA") coincide exactamente con el prefijo
 * del email real (tito.a@gyscontrol.com), y eso desambigua el caso
 * "Jhonatan" (hay dos: Molocho y Flores — el Excel es jhonatan.m).
 *
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/importar-saldo-banco-horas.ts --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/importar-saldo-banco-horas.ts --apply
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// email exacto → saldo en horas (positivo = a favor, negativo = debe)
const SALDOS: Array<{ email: string; saldoInicial: number }> = [
  { email: 'tito.a@gyscontrol.com', saldoInicial: 53.5 },
  { email: 'jhonatan.m@gyscontrol.com', saldoInicial: -29 },
  { email: 'angel.p@gyscontrol.com', saldoInicial: -2 },
  { email: 'nelson.l@gyscontrol.com', saldoInicial: -147.5 },
  { email: 'antony.v@gyscontrol.com', saldoInicial: -86 },
  { email: 'roly.s@gyscontrol.com', saldoInicial: -61.5 },
  { email: 'benjamin.a@gyscontrol.com', saldoInicial: -44.5 },
]

const APPLY = process.argv.includes('--apply')

async function main() {
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (solo lectura)'}`)
  console.log('DB:', process.env.DATABASE_URL?.slice(0, 40), '\n')

  // Se necesita un usuario "creador" para el campo obligatorio creadoPorId.
  // Usamos el primer admin activo — solo para auditoría, no cambia nada más.
  const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true, name: true } })
  if (!admin) {
    console.log('⚠ No se encontró ningún usuario con rol admin — no se puede setear creadoPorId')
    return
  }
  console.log(`creadoPorId: ${admin.name} (${admin.id})\n`)

  const fechaCorte = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z')

  for (const { email, saldoInicial } of SALDOS) {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } })

    if (!u) {
      console.log(`⚠ "${email}": NO ENCONTRADO`)
      continue
    }

    console.log(`✔ ${u.name} <${u.email}>`)
    console.log(`    saldoInicial=${saldoInicial >= 0 ? '+' : ''}${saldoInicial}h  fechaCorte=${fechaCorte.toISOString().slice(0, 10)}`)

    if (!APPLY) continue

    await prisma.bancoHorasSaldoInicial.upsert({
      where: { userId: u.id },
      update: { saldoInicial, fechaCorte, creadoPorId: admin.id },
      create: { userId: u.id, saldoInicial, fechaCorte, creadoPorId: admin.id },
    })
    console.log('    ✔ guardado')
  }

  if (!APPLY) {
    console.log('\n(dry-run: no se escribió nada. Repetir con --apply)')
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
