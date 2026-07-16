/**
 * PROPUESTO — NO EJECUTADO. Ver docs/analisis-composicion-recursos.md y el
 * reporte de la sesión que agregó RecursoPerfil (prisma/migrations/
 * 20260715200000_add_recurso_perfil). Correr SOLO después de:
 *   1) aplicar la migración de schema (prisma migrate deploy) — no incluida acá.
 *   2) que el usuario recargue a mano la composición por perfiles de las 8
 *      cuadrillas en /catalogo/recursos (no hay backfill automático — ver el
 *      análisis: los empleados de RecursoComposicion eran solo una referencia
 *      de costo repetida N veces, no dotación real, no hay forma confiable de
 *      inferir automáticamente a qué perfil corresponde cada uno).
 *
 * Este script SOLO marca `activo=false` en las filas de RecursoComposicion de
 * recursos tipo='cuadrilla' — nunca las borra (es el único registro de qué
 * empleado se usó de referencia de costo, y no hay versionado; borrar es lo
 * único irreversible de esta migración, ver el análisis).
 *
 * Uso (después de dar luz verde):
 *   npx dotenv -e .env.production -o -- npx tsx scripts/migrar-recurso-composicion-a-perfil.ts --dry-run   (por defecto)
 *   npx dotenv -e .env.production -o -- npx tsx scripts/migrar-recurso-composicion-a-perfil.ts --aplicar   (recién ahí escribe)
 */
import { prisma } from '@/lib/prisma'

const APLICAR = process.argv.includes('--aplicar')

async function main() {
  // Nota: `perfiles` (RecursoPerfil) requiere que la migración de schema ya
  // esté aplicada (prisma migrate deploy) — antes de eso, esta select falla
  // con P2021 "table does not exist". Verificado en esta sesión: sin aplicar
  // la migración, correr este script comentando el bloque `perfiles` de abajo
  // sigue dando el Σcantidad de referencia igual (es lo único que hace falta
  // antes de aprobar la migración).
  const cuadrillas = await prisma.recurso.findMany({
    where: { tipo: 'cuadrilla' },
    select: {
      id: true,
      nombre: true,
      composiciones: {
        where: { activo: true },
        select: { cantidad: true, empleado: { select: { user: { select: { name: true } } } } },
      },
      perfiles: { where: { activo: true }, select: { cantidad: true } },
    },
    orderBy: { nombre: 'asc' },
  })

  console.log(`${APLICAR ? '=== APLICANDO ===' : '=== DRY RUN (nada se escribe) ==='}\n`)
  console.log('Referencia — Σcantidad actual (RecursoComposicion) de cada cuadrilla, para recargar en la UI:\n')

  let totalFilasAMarcar = 0
  for (const c of cuadrillas) {
    const sumaActual = c.composiciones.reduce((s, comp) => s + comp.cantidad, 0)
    const sumaPerfiles = c.perfiles.reduce((s, p) => s + p.cantidad, 0)
    const nombres = c.composiciones.map(comp => comp.empleado.user.name).join(', ')
    console.log(`"${c.nombre}": Σcantidad(composición vieja)=${sumaActual} [${nombres}] | Σcantidad(perfiles ya cargados)=${sumaPerfiles}`)
    totalFilasAMarcar += c.composiciones.length

    if (sumaPerfiles === 0) {
      console.log(`  ⚠ "${c.nombre}" todavía NO tiene perfiles cargados — recargar antes o después de correr esto, no bloquea.`)
    }

    if (APLICAR && c.composiciones.length > 0) {
      await prisma.recursoComposicion.updateMany({
        where: { recursoId: c.id, activo: true },
        data: { activo: false },
      })
      console.log(`  -> marcadas ${c.composiciones.length} fila(s) de composición vieja como activo=false`)
    }
  }

  console.log(`\nTotal filas de composición-por-empleado a marcar inactivas: ${totalFilasAMarcar}`)
  if (!APLICAR) {
    console.log('\nEsto fue un dry-run. Nada se escribió. Correr con --aplicar para marcar activo=false (nunca borra).')
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
