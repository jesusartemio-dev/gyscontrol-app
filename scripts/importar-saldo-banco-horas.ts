/**
 * 📁 scripts/importar-saldo-banco-horas.ts
 *
 * Import único del saldo de arrastre del Banco de Horas (ver
 * src/lib/services/bancoHoras.ts), tomado del registro manual en Excel que
 * llevaba el coordinador de construcción. fechaCorte = hoy: el sistema
 * calcula solo desde ese punto en adelante usando RegistroHoras aprobado.
 *
 * Los nombres de abajo son fragmentos cortos (como aparecen en el Excel,
 * ej. "TitoA"), no el nombre completo — el script busca por
 * `User.name` insensible a mayúsculas y EXIGE exactamente un match; si
 * encuentra 0 o más de 1, lo reporta y no aplica nada para esa persona
 * (no adivina). Revisar el reporte del --dry antes de correr --apply.
 *
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/importar-saldo-banco-horas.ts --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/importar-saldo-banco-horas.ts --apply
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// email o fragmento de nombre → saldo en horas (positivo = a favor, negativo = debe)
const SALDOS: Array<{ nombreFragmento: string; saldoInicial: number }> = [
  { nombreFragmento: 'TitoA', saldoInicial: 53.5 },
  { nombreFragmento: 'JhonatanM', saldoInicial: -29 },
  { nombreFragmento: 'AngelP', saldoInicial: -2 },
  { nombreFragmento: 'NelsonLl', saldoInicial: -147.5 },
  { nombreFragmento: 'AntonyV', saldoInicial: -86 },
  { nombreFragmento: 'RolyS', saldoInicial: -61.5 },
  { nombreFragmento: 'BenjaminA', saldoInicial: -44.5 },
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

  for (const { nombreFragmento, saldoInicial } of SALDOS) {
    const candidatos = await prisma.user.findMany({
      where: { name: { contains: nombreFragmento, mode: 'insensitive' } },
      select: { id: true, name: true, email: true },
    })

    if (candidatos.length === 0) {
      console.log(`⚠ "${nombreFragmento}": NO ENCONTRADO — revisa el fragmento de nombre`)
      continue
    }
    if (candidatos.length > 1) {
      console.log(`⚠ "${nombreFragmento}": ${candidatos.length} coincidencias, ambiguo:`)
      candidatos.forEach((c) => console.log(`    - ${c.name} <${c.email}>`))
      continue
    }

    const u = candidatos[0]
    console.log(`✔ "${nombreFragmento}" → ${u.name} <${u.email}>`)
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
