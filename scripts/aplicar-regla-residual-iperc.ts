/**
 * Aplica a los IPERC ya generados la regla del SSOMA para el riesgo residual
 * (ingeniería sube la severidad residual, administrativo sube la probabilidad)
 * y normaliza los controles a un ítem por línea.
 *
 * Hace falta porque esas filas las valoró la IA: sobre CJM52, 101 de 150
 * incumplían la regla, casi siempre bajando de más la probabilidad residual —
 * o sea mostrando el riesgo residual menor de lo que el criterio del SSOMA
 * diría.
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/aplicar-regla-residual-iperc.ts --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/aplicar-regla-residual-iperc.ts            (todos)
 *   npx dotenv -e .env.production -o -- npx tsx scripts/aplicar-regla-residual-iperc.ts <proyectoId>
 */
import { PrismaClient } from '@prisma/client'
import { calcularResidual, normalizarControl } from '../src/lib/iperc/riesgoResidual'

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry')
const proyectoId = process.argv.slice(2).find(a => !a.startsWith('--'))

async function main() {
  const iperes = await prisma.iperc.findMany({
    where: proyectoId ? { proyectoId } : {},
    include: { filas: { orderBy: { numero: 'asc' } } },
  })
  if (iperes.length === 0) throw new Error('No se encontró ningún IPERC')

  let totalFilas = 0
  let totalResidual = 0
  let totalControles = 0

  for (const iperc of iperes) {
    const cambios: Array<{
      id: string
      numero: number
      data: Record<string, unknown>
      detalle: string[]
    }> = []

    for (const f of iperc.filas) {
      totalFilas++
      const data: Record<string, unknown> = {}
      const detalle: string[] = []

      const ing = normalizarControl(f.controlIngenieria)
      const adm = normalizarControl(f.controlAdministrativo)
      const epp = normalizarControl(f.controlReceptor)
      if (ing !== f.controlIngenieria) { data.controlIngenieria = ing; detalle.push('ING') }
      if (adm !== f.controlAdministrativo) { data.controlAdministrativo = adm; detalle.push('ADM') }
      if (epp !== f.controlReceptor) { data.controlReceptor = epp; detalle.push('EPP') }
      if (detalle.length > 0) totalControles++

      const r = calcularResidual(f.severidad, f.probabilidad, ing, adm)
      if (r.severidadResidual !== f.severidadResidual || r.probabilidadResidual !== f.probabilidadResidual) {
        data.severidadResidual = r.severidadResidual
        data.probabilidadResidual = r.probabilidadResidual
        detalle.push(
          `S${f.severidadResidual}${f.probabilidadResidual} → S${r.severidadResidual}${r.probabilidadResidual}`,
        )
        totalResidual++
      }

      if (Object.keys(data).length > 0) cambios.push({ id: f.id, numero: f.numero, data, detalle })
    }

    console.log(
      `${DRY ? '[DRY] ' : ''}${iperc.codigoDocumento}: ${iperc.filas.length} filas · ${cambios.length} cambian`,
    )
    for (const c of cambios.slice(0, 6)) {
      console.log(`    #${String(c.numero).padStart(3)} ${c.detalle.join(' · ')}`)
    }
    if (cambios.length > 6) console.log(`    …y ${cambios.length - 6} más`)

    if (!DRY && cambios.length > 0) {
      // En tandas: un $transaction con 180 updates es innecesariamente pesado.
      for (let i = 0; i < cambios.length; i += 50) {
        await prisma.$transaction(
          cambios.slice(i, i + 50).map(c =>
            prisma.ipercFila.update({ where: { id: c.id }, data: c.data }),
          ),
        )
      }
    }
  }

  console.log(
    `\n${DRY ? 'Cambiarían' : 'Cambiados'}: residual en ${totalResidual} filas, controles en ${totalControles}, de ${totalFilas}.`,
  )
  if (DRY) console.log('Nada escrito.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
