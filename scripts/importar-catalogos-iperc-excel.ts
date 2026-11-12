/**
 * Importa los catálogos del IPERC desde las hojas del propio Excel:
 * "Peli-Ries-Consec", "controles" y "Matriz".
 *
 * Con esto el Excel deja de ser una copia paralela del código y pasa a ser el
 * origen. Al copiarlo a mano a los .ts en su momento se perdió bastante: la
 * descripción del peligro y sus riesgos en la hoja de controles, y 18 de las
 * 168 medidas.
 *
 * Sirve cualquier IPERC exportado desde la app: el render solo escribe la hoja
 * "IPERC" y las otras tres viajan intactas.
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/importar-catalogos-iperc-excel.ts <archivo.xlsx> --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/importar-catalogos-iperc-excel.ts <archivo.xlsx>
 */
import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry')
const archivo = process.argv.slice(2).find(a => !a.startsWith('--'))

/** ELI/SUS/CI/CA/EPP → la jerarquía como la guarda la app. */
const JERARQUIA_POR_COLUMNA = ['eliminar', 'sustituir', 'ingenieria', 'administrativo', 'epp'] as const

const limpiar = (v: unknown) =>
  String(v ?? '').replace(/^[\s•*\-–—]+/, '').replace(/\s+/g, ' ').trim()

const limpiarLineas = (v: unknown) =>
  String(v ?? '')
    .split(/\r?\n/)
    .map(l => l.replace(/^[\s•*\-–—]+/, '').trim())
    .filter(Boolean)
    .join('\n')

/** Una hoja como matriz de celdas, respetando las combinadas (se rellenan). */
function hojaAMatriz(wb: XLSX.WorkBook, nombre: string): string[][] {
  const ws = wb.Sheets[nombre]
  if (!ws) throw new Error(`La hoja "${nombre}" no está en el archivo`)
  const filas = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: '' })
  // Las celdas combinadas solo traen valor en la de arriba a la izquierda:
  // se propaga hacia abajo para que cada fila sepa a qué grupo pertenece.
  for (const m of ws['!merges'] ?? []) {
    const valor = filas[m.s.r]?.[m.s.c]
    if (valor === undefined) continue
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (!filas[r]) filas[r] = []
        filas[r][c] = valor
      }
    }
  }
  return filas
}

async function main() {
  if (!archivo) throw new Error('Uso: importar-catalogos-iperc-excel.ts <archivo.xlsx> [--dry]')
  const wb = XLSX.read(readFileSync(archivo), { type: 'buffer' })
  console.log(`${DRY ? '[DRY RUN] ' : ''}${archivo}`)
  console.log(`Hojas: ${wb.SheetNames.join(', ')}\n`)

  // ─── Peligros ───
  const peligros = hojaAMatriz(wb, 'Peli-Ries-Consec')
  let categoria = ''
  const nuevosPeligros: Array<{ categoria: string; peligro: string; riesgo: string; consecuencia: string }> = []
  for (const fila of peligros) {
    const a = limpiar(fila[0])
    // Encabezado de categoría: "I.    MECANICOS"
    const m = /^[IVX]+\.\s+(.+)$/.exec(a)
    if (m) { categoria = normalizarCategoria(m[1]); continue }
    if (!/^\d+$/.test(a)) continue
    const peligro = limpiar(fila[1])
    if (!peligro) continue
    nuevosPeligros.push({
      categoria,
      peligro,
      riesgo: limpiar(fila[2]),
      consecuencia: limpiar(fila[3]),
    })
  }
  console.log(`Peligros en el Excel: ${nuevosPeligros.length}`)

  // ─── Grupos de control ───
  const controles = hojaAMatriz(wb, wb.SheetNames.find(n => n.toLowerCase() === 'controles') ?? 'controles')
  const grupos = new Map<number, {
    numero: number; tipoPeligro: string; descripcionPeligro: string; riesgosConsecuencias: string
    medidas: Array<{ jerarquia: string; texto: string }>
  }>()

  for (const fila of controles) {
    const numero = Number(limpiar(fila[0]))
    if (!Number.isInteger(numero) || numero <= 0) continue
    const medida = limpiar(fila[4])
    if (!medida) continue
    // Marcador de la plantilla, no un control.
    if (/^otras sugerencias/i.test(medida)) continue

    if (!grupos.has(numero)) {
      grupos.set(numero, {
        numero,
        tipoPeligro: limpiar(fila[1]),
        descripcionPeligro: limpiar(fila[2]),
        riesgosConsecuencias: limpiarLineas(fila[3]),
        medidas: [],
      })
    }
    const grupo = grupos.get(numero)!
    // Una X por columna de jerarquía; una medida puede marcar más de una.
    JERARQUIA_POR_COLUMNA.forEach((jerarquia, i) => {
      const celda = limpiar(fila[5 + i]).toUpperCase()
      if (celda === 'X') grupo.medidas.push({ jerarquia, texto: medida })
    })
  }
  const totalMedidas = [...grupos.values()].reduce((s, g) => s + g.medidas.length, 0)
  console.log(`Grupos de control: ${grupos.size} · medidas: ${totalMedidas}`)

  // ─── Matriz ───
  const matriz = hojaAMatriz(wb, 'Matriz')
  const celdas: Array<{ severidad: number; probabilidad: string; valor: number; nivel: string }> = []
  for (const fila of matriz) {
    const sev = Number(limpiar(fila[1]))
    const prob = limpiar(fila[2]).toUpperCase()
    const valor = Number(limpiar(fila[3]))
    const nivel = limpiar(fila[4]).toUpperCase()
    if (!Number.isInteger(sev) || !/^[A-E]$/.test(prob) || !Number.isInteger(valor)) continue
    if (!['ALTO', 'MEDIO', 'BAJO'].includes(nivel)) continue
    celdas.push({ severidad: sev, probabilidad: prob, valor, nivel })
  }
  console.log(`Celdas de matriz: ${celdas.length}\n`)

  // ─── Comparar con lo que hay ───
  const [enBdPeligros, enBdControles, enBdMatriz] = await Promise.all([
    prisma.ipercCatalogoPeligro.count(),
    prisma.ipercCatalogoControl.count(),
    prisma.ipercCatalogoMatriz.count(),
  ])
  console.log(`En BD hoy: ${enBdPeligros} peligros · ${enBdControles} controles · ${enBdMatriz} celdas`)
  console.log(`El Excel trae: ${nuevosPeligros.length} · ${totalMedidas} · ${celdas.length}`)
  if (totalMedidas > enBdControles) {
    console.log(`→ ${totalMedidas - enBdControles} medidas de control que no estaban\n`)
  }

  if (DRY) {
    console.log('Ejemplo del primer grupo:')
    const g = grupos.get(1)
    if (g) {
      console.log(`  #${g.numero} ${g.tipoPeligro} — ${g.descripcionPeligro}`)
      console.log(`  riesgos: ${g.riesgosConsecuencias.split('\n').length} líneas`)
      for (const m of g.medidas.slice(0, 3)) console.log(`    [${m.jerarquia}] ${m.texto}`)
    }
    console.log('\nNada escrito.')
    return
  }

  // ─── Escribir ───
  for (const g of grupos.values()) {
    const grupo = await prisma.ipercCatalogoGrupoControl.upsert({
      where: { numero: g.numero },
      create: {
        numero: g.numero,
        tipoPeligro: g.tipoPeligro,
        descripcionPeligro: g.descripcionPeligro,
        riesgosConsecuencias: g.riesgosConsecuencias,
        updatedAt: new Date(),
      },
      update: {
        tipoPeligro: g.tipoPeligro,
        descripcionPeligro: g.descripcionPeligro,
        riesgosConsecuencias: g.riesgosConsecuencias,
      },
    })
    for (const [i, m] of g.medidas.entries()) {
      await prisma.ipercCatalogoControl.upsert({
        where: {
          tipoPeligro_jerarquia_texto: {
            tipoPeligro: g.tipoPeligro, jerarquia: m.jerarquia, texto: m.texto,
          },
        },
        create: {
          grupoId: grupo.id,
          tipoPeligro: g.tipoPeligro,
          jerarquia: m.jerarquia,
          texto: m.texto,
          orden: i,
          updatedAt: new Date(),
        },
        // Lo ya existente se enlaza a su grupo sin pisar nada más.
        update: { grupoId: grupo.id, orden: i },
      })
    }
  }

  for (const p of nuevosPeligros) {
    await prisma.ipercCatalogoPeligro.upsert({
      where: { categoria_peligro_riesgo: { categoria: p.categoria, peligro: p.peligro, riesgo: p.riesgo } },
      create: { ...p, updatedAt: new Date() },
      update: { consecuencia: p.consecuencia },
    })
  }

  for (const c of celdas) {
    await prisma.ipercCatalogoMatriz.upsert({
      where: { severidad_probabilidad: { severidad: c.severidad, probabilidad: c.probabilidad } },
      create: { ...c, updatedAt: new Date() },
      update: { valor: c.valor, nivel: c.nivel },
    })
  }

  const [p2, c2, m2, g2] = await Promise.all([
    prisma.ipercCatalogoPeligro.count(),
    prisma.ipercCatalogoControl.count(),
    prisma.ipercCatalogoMatriz.count(),
    prisma.ipercCatalogoGrupoControl.count(),
  ])
  console.log(`\nListo. En BD: ${p2} peligros · ${c2} controles en ${g2} grupos · ${m2} celdas`)
}

/** "MECANICOS" → "MECÁNICO", como lo usa el resto de la app. */
function normalizarCategoria(txt: string): string {
  const t = txt.toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
  const mapa: Record<string, string> = {
    MECANICOS: 'MECÁNICO', LOCATIVOS: 'LOCATIVO', ELECTRICOS: 'ELÉCTRICO',
    FISICOQUIMICOS: 'FISICOQUÍMICO', FISICOS: 'FÍSICO', QUIMICOS: 'QUÍMICO',
    ERGONOMICOS: 'ERGONÓMICO', PSICOSOCIAL: 'PSICOSOCIAL', BIOLOGICO: 'BIOLÓGICO',
  }
  return mapa[t] ?? txt.trim()
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
