/**
 * Puebla actividadTag/filtroAlcance/notaCantidad de CatalogoServicio a partir
 * de `descripcion`, usando el parser puro de
 * src/lib/cronogramaIA/parseCatalogoServicioEstructura.ts. Idempotente: cada
 * corrida recalcula todo desde `descripcion` (nunca acumula, nunca modifica
 * `descripcion`). NO puebla `reglasDificultad` — queda pendiente de carga
 * manual (ver reporte).
 *
 * Dry-run por defecto, --apply para escribir de verdad.
 *
 * Uso local:
 *   npx tsx scripts/backfill-catalogo-servicio-estructura.ts
 *   npx tsx scripts/backfill-catalogo-servicio-estructura.ts --apply
 *
 * Uso en producción (manual, cuando se decida desplegar la migración allá):
 *   npx dotenv -e .env.production -o -- npx tsx scripts/backfill-catalogo-servicio-estructura.ts
 *   npx dotenv -e .env.production -o -- npx tsx scripts/backfill-catalogo-servicio-estructura.ts --apply
 */

import fs from 'fs'
import path from 'path'
import { prisma } from '../src/lib/prisma'
import { parsearEstructuraCatalogoServicio } from '../src/lib/cronogramaIA/parseCatalogoServicioEstructura'

interface FilaReporte {
  id: string
  nombre: string
  motivo: string
}

async function main() {
  const apply = process.argv.includes('--apply')

  const servicios = await prisma.catalogoServicio.findMany({
    select: { id: true, nombre: true, descripcion: true, nivelDificultad: true },
  })

  console.log(`🔎 ${servicios.length} servicios del catálogo a procesar`)
  console.log(apply ? '\n🚀 Modo APLICAR — se van a escribir los campos estructurados\n' : '\n🔎 Modo DRY-RUN — no se modifica nada\n')

  const filasAmbiguas: FilaReporte[] = []
  let conTags = 0
  let conAlcanceEspecifico = 0
  let conNotaCantidad = 0
  let dificultadPendienteManual = 0
  let actualizados = 0

  for (const servicio of servicios) {
    const resultado = parsearEstructuraCatalogoServicio(servicio.descripcion)

    if (resultado.actividadTag.length > 0) conTags++
    if (resultado.filtroAlcance !== 'general') conAlcanceEspecifico++
    if (resultado.notaCantidad) conNotaCantidad++
    if ((servicio.nivelDificultad ?? 1) > 1) dificultadPendienteManual++

    if (resultado.advertencia) {
      filasAmbiguas.push({ id: servicio.id, nombre: servicio.nombre, motivo: resultado.advertencia })
    }

    if (apply) {
      await prisma.catalogoServicio.update({
        where: { id: servicio.id },
        data: {
          actividadTag: resultado.actividadTag,
          filtroAlcance: resultado.filtroAlcance,
          notaCantidad: resultado.notaCantidad,
          // reglasDificultad NUNCA se toca acá — carga manual.
        },
      })
      actualizados++
    }
  }

  console.log('📊 Resumen:')
  console.log(`   - Con al menos 1 tag: ${conTags}/${servicios.length}`)
  console.log(`   - Con filtroAlcance ≠ general: ${conAlcanceEspecifico}/${servicios.length}`)
  console.log(`   - Con notaCantidad detectada: ${conNotaCantidad}/${servicios.length}`)
  console.log(`   - Filas ambiguas (revisión manual): ${filasAmbiguas.length}/${servicios.length}`)
  console.log(`   - nivelDificultad>1 sin reglasDificultad (carga manual pendiente): ${dificultadPendienteManual}/${servicios.length}`)
  if (apply) console.log(`   - Actualizados: ${actualizados}/${servicios.length}`)

  if (filasAmbiguas.length > 0) {
    const reportDir = path.join(process.cwd(), 'scripts', 'reports')
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const reportFile = path.join(reportDir, `backfill-catalogo-servicio-${timestamp}.json`)
    fs.writeFileSync(reportFile, JSON.stringify(filasAmbiguas, null, 2))

    console.log(`\n⚠️  ${filasAmbiguas.length} filas necesitan revisión manual — detalle en: ${reportFile}`)
  } else {
    console.log('\n✅ Ninguna fila ambigua.')
  }

  if (!apply) {
    console.log('\nNada modificado (dry-run). Para aplicar de verdad, vuelve a correr con --apply')
  }
}

main()
  .catch(e => {
    console.error('❌ Error:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
