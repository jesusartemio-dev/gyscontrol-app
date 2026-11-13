/**
 * Importa las actividades fijas del IPERC desde la hoja "IPERC" de un Excel
 * del SSOMA.
 *
 * Son las que no salen del cronograma y van en todo trabajo: ACTIVIDADES
 * GENERALES (movilización, COVID/dengue, orden y limpieza, desplazamiento en
 * planta, izaje), SISTEMA DE CONTROL DE ENERGIAS (bloqueo y etiquetado) y
 * CIERRE (retiro de herramientas). En el IPERC real de CJM50 son nueve filas,
 * y ninguna de nuestras IPERC generadas las tenía: todas arrancaban directo en
 * construcción.
 *
 * Se guardan con la fila escrita entera porque son siempre las mismas: no hay
 * nada que la IA deba redactar ahí.
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/importar-actividades-fijas-iperc.ts <archivo.xlsx> --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/importar-actividades-fijas-iperc.ts <archivo.xlsx>
 */
import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'
import { normalizarControl } from '../src/lib/iperc/riesgoResidual'

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry')
const archivo = process.argv.slice(2).find(a => !a.startsWith('--'))

/** Los procesos que no vienen del cronograma. */
const PROCESOS_FIJOS = [
  'ACTIVIDADES GENERALES',
  'SISTEMA DE CONTROL DE ENERGIAS',
  'CIERRE',
]

/** Columnas de la hoja IPERC, 0-based (A=0). La cabecera está en la fila 20. */
const COL = {
  proceso: 2,
  actividad: 3,
  tarea: 4,
  puestoTrabajo: 5,
  factorRiesgo: 6,
  condicionActividad: 7,
  peligro: 8,
  riesgo: 9,
  consecuencia: 10,
  severidad: 11,
  probabilidad: 12,
  eliminar: 16,
  sustituir: 17,
  controlIngenieria: 18,
  controlAdministrativo: 19,
  controlReceptor: 20,
  accionesMejora: 27,
  responsables: 28,
}

const texto = (v: unknown) => String(v ?? '').replace(/ /g, ' ').trim()

/** Los factores de riesgo que usan las IPERC. */
const FACTORES = [
  'FÍSICO', 'QUÍMICO', 'BIOLÓGICO', 'ERGONÓMICO', 'PSICOSOCIAL',
  'MECÁNICO', 'ELÉCTRICO', 'LOCATIVO', 'FISICOQUÍMICO',
]

/**
 * El factor tal como lo escribe el SSOMA, corrigiendo lo que en la hoja quedó
 * ilegible: la fila de cierre de CJM50 trae "QM0X" donde dice QUÍMICO. Un
 * factor que no se reconozca se avisa en vez de entrar así al catálogo.
 */
function normalizarFactor(v: unknown): string {
  const bruto = texto(v).toUpperCase()
  if (FACTORES.includes(bruto)) return bruto
  if (/^Q[MU]/.test(bruto)) return 'QUÍMICO'
  const sinTilde = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const casi = FACTORES.find(f => sinTilde(f) === sinTilde(bruto))
  if (casi) return casi
  console.warn(`⚠ Factor de riesgo no reconocido: "${bruto}"`)
  return bruto
}

/** La hoja con las celdas combinadas rellenadas hacia abajo y a la derecha. */
function hojaAMatriz(wb: XLSX.WorkBook, nombre: string): string[][] {
  const ws = wb.Sheets[nombre]
  if (!ws) throw new Error(`La hoja "${nombre}" no está en el archivo`)

  const matriz = XLSX.utils.sheet_to_json<string[]>(ws, {
    header: 1, raw: false, defval: '',
  })

  for (const m of ws['!merges'] ?? []) {
    const valor = matriz[m.s.r]?.[m.s.c] ?? ''
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (!matriz[r]) matriz[r] = []
        matriz[r][c] = valor
      }
    }
  }
  return matriz
}

/**
 * El control de EPP del SSOMA abre con "Matriz de EPP's" y una línea de
 * guiones antes del equipo concreto. Esa primera línea y el separador se
 * guardan igual: es la convención de sus IPERC y así sale en el Excel.
 */
function limpiarControl(v: unknown): string {
  return normalizarControl(
    texto(v)
      .split(/\r?\n/)
      .map(l => l.replace(/^[\s•*\-–—_]+/, '').trim())
      .filter(l => l !== '' && !/^[-–—_]{3,}$/.test(l))
      .join('\n')
  )
}

async function main() {
  if (!archivo) {
    console.error('Falta el archivo .xlsx')
    process.exit(1)
  }

  const wb = XLSX.read(readFileSync(archivo), { type: 'buffer' })
  const matriz = hojaAMatriz(wb, 'IPERC')

  const filas: Array<Record<string, string | number>> = []
  for (const fila of matriz) {
    const proceso = texto(fila[COL.proceso]).toUpperCase()
    if (!PROCESOS_FIJOS.includes(proceso)) continue

    const peligro = texto(fila[COL.peligro])
    if (!peligro) continue

    const severidad = Number.parseInt(texto(fila[COL.severidad]), 10)
    const probabilidad = texto(fila[COL.probabilidad]).toUpperCase()
    if (!Number.isFinite(severidad) || !/^[A-E]$/.test(probabilidad)) {
      console.warn(`⚠ "${peligro.slice(0, 50)}" sin severidad/probabilidad válidas, se omite`)
      continue
    }

    filas.push({
      proceso,
      actividad: texto(fila[COL.actividad]),
      tarea: texto(fila[COL.tarea]),
      orden: filas.length + 1,
      puestoTrabajo: texto(fila[COL.puestoTrabajo]) || 'Todo el personal de GYS',
      factorRiesgo: normalizarFactor(fila[COL.factorRiesgo]),
      condicionActividad: texto(fila[COL.condicionActividad]) || 'Rutinaria',
      peligro,
      riesgo: texto(fila[COL.riesgo]),
      consecuencia: texto(fila[COL.consecuencia]),
      severidad,
      probabilidad,
      eliminar: limpiarControl(fila[COL.eliminar]) || 'NA',
      sustituir: limpiarControl(fila[COL.sustituir]) || 'NA',
      controlIngenieria: limpiarControl(fila[COL.controlIngenieria]),
      controlAdministrativo: limpiarControl(fila[COL.controlAdministrativo]),
      controlReceptor: limpiarControl(fila[COL.controlReceptor]),
      accionesMejora: texto(fila[COL.accionesMejora]).replace(/^_+$/, ''),
      responsables: texto(fila[COL.responsables]),
    })
  }

  console.log(`${DRY ? '[DRY] ' : ''}Filas fijas encontradas: ${filas.length}\n`)
  let procesoActual = ''
  for (const f of filas) {
    if (f.proceso !== procesoActual) {
      procesoActual = String(f.proceso)
      console.log(`\n[${procesoActual}]`)
    }
    console.log(`  ${f.actividad}`)
    console.log(`    tarea:   ${f.tarea}`)
    console.log(`    peligro: ${String(f.peligro).slice(0, 80)}`)
    console.log(`    ${f.factorRiesgo} · S${f.severidad}${f.probabilidad} · ` +
      `ELI:${f.eliminar !== 'NA' ? 'sí' : '—'} SUS:${f.sustituir !== 'NA' ? 'sí' : '—'} ` +
      `ING:${f.controlIngenieria ? 'sí' : '—'} ADM:${f.controlAdministrativo ? 'sí' : '—'} ` +
      `EPP:${f.controlReceptor ? 'sí' : '—'}`)
  }

  if (filas.length === 0) {
    console.error('\n✗ No se encontró ninguna fila de los procesos fijos.')
    process.exit(1)
  }

  if (DRY) {
    console.log('\nSimulación. Para aplicar, quita --dry')
    return
  }

  let creadas = 0
  let actualizadas = 0
  for (const f of filas) {
    const clave = {
      proceso_actividad_tarea_peligro: {
        proceso: String(f.proceso),
        actividad: String(f.actividad),
        tarea: String(f.tarea),
        peligro: String(f.peligro),
      },
    }
    const existente = await prisma.ipercCatalogoActividadFija.findUnique({ where: clave })
    await prisma.ipercCatalogoActividadFija.upsert({
      where: clave,
      create: { ...(f as never), updatedAt: new Date() },
      update: { ...(f as never), updatedAt: new Date() },
    })
    if (existente) actualizadas++
    else creadas++
  }

  const total = await prisma.ipercCatalogoActividadFija.count()
  console.log(`\nListo. Creadas ${creadas}, actualizadas ${actualizadas}. Total en catálogo: ${total}.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
