/**
 * Pasa a la base los catálogos del IPERC que hasta ahora vivían como
 * constantes en src/lib/iperc/catalogos/*.ts.
 *
 * Idempotente: no duplica (las tres tablas tienen índice único por contenido)
 * y respeta lo ya editado — solo inserta lo que falta. Para sobreescribir el
 * texto de lo existente, usar --actualizar.
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/seed-catalogos-iperc.ts --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/seed-catalogos-iperc.ts
 */
import { PrismaClient } from '@prisma/client'
import { PELIGROS_CATALOGO } from '../src/lib/iperc/catalogos/peligros'
import { CONTROLES_CATALOGO } from '../src/lib/iperc/catalogos/controles'
import { MATRIZ_RIESGO } from '../src/lib/iperc/catalogos/matrizRiesgo'

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry')

async function main() {
  console.log(DRY ? '[DRY RUN]\n' : '')

  // ─── Peligros ───
  const peligrosExistentes = await prisma.ipercCatalogoPeligro.count()
  let nuevosPeligros = 0
  for (const [i, p] of PELIGROS_CATALOGO.entries()) {
    const ya = await prisma.ipercCatalogoPeligro.findUnique({
      where: { categoria_peligro_riesgo: { categoria: p.categoria, peligro: p.peligro, riesgo: p.riesgo } },
    })
    if (ya) continue
    nuevosPeligros++
    if (!DRY) {
      await prisma.ipercCatalogoPeligro.create({
        data: { ...p, orden: i, updatedAt: new Date() },
      })
    }
  }
  console.log(`Peligros:  ${peligrosExistentes} en BD · ${nuevosPeligros} a insertar (${PELIGROS_CATALOGO.length} en código)`)

  // ─── Controles ───
  const controlesExistentes = await prisma.ipercCatalogoControl.count()
  let nuevosControles = 0
  for (const [i, c] of CONTROLES_CATALOGO.entries()) {
    const ya = await prisma.ipercCatalogoControl.findUnique({
      where: { tipoPeligro_jerarquia_texto: { tipoPeligro: c.tipoPeligro, jerarquia: c.jerarquia, texto: c.texto } },
    })
    if (ya) continue
    nuevosControles++
    if (!DRY) {
      await prisma.ipercCatalogoControl.create({
        data: { ...c, orden: i, updatedAt: new Date() },
      })
    }
  }
  console.log(`Controles: ${controlesExistentes} en BD · ${nuevosControles} a insertar (${CONTROLES_CATALOGO.length} en código)`)

  // ─── Matriz ───
  const matrizExistente = await prisma.ipercCatalogoMatriz.count()
  let nuevasCeldas = 0
  for (const [clave, ev] of Object.entries(MATRIZ_RIESGO)) {
    const severidad = Number(clave[0])
    const probabilidad = clave.slice(1)
    const ya = await prisma.ipercCatalogoMatriz.findUnique({
      where: { severidad_probabilidad: { severidad, probabilidad } },
    })
    if (ya) continue
    nuevasCeldas++
    if (!DRY) {
      await prisma.ipercCatalogoMatriz.create({
        data: { severidad, probabilidad, valor: ev.valor, nivel: ev.nivel, updatedAt: new Date() },
      })
    }
  }
  console.log(`Matriz:    ${matrizExistente} en BD · ${nuevasCeldas} a insertar (${Object.keys(MATRIZ_RIESGO).length} en código)`)

  console.log(DRY ? '\nNada escrito.' : '\nListo.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
