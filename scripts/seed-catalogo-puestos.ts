/**
 * Siembra el catálogo de puestos y reapunta lo existente.
 *
 * Los organigramas traían 31 cargoLabel distintos para ~18 puestos reales. Este
 * script crea el catálogo y mapea cada variante encontrada en producción a su
 * puesto, sin borrar `cargoLabel` (queda como respaldo y evidencia).
 *
 * Idempotente: se puede correr varias veces.
 * Uso:  npx dotenv -e .env.production -o -- npx tsx scripts/seed-catalogo-puestos.ts [--aplicar]
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APLICAR = process.argv.includes('--aplicar')

/** rolFuncional null = el puesto no responde por ningún EDT (técnicos, gerencia). */
const CATALOGO: Array<{
  nombre: string
  rolFuncional: string | null
  categoria: string
  vaACampo: boolean
  /** Variantes vistas en producción que se reapuntan a este puesto. */
  alias: string[]
}> = [
  // ── Dirección (no va a campo, solo jerarquía) ───────────────────────────
  { nombre: 'Gerencia General', rolFuncional: null, categoria: 'direccion', vaACampo: false,
    alias: ['GERENCIA GENERAL', 'Gerente General'] },
  { nombre: 'Gerencia de Proyectos', rolFuncional: null, categoria: 'direccion', vaACampo: false,
    alias: ['GERENCIA DE PROYECTOS'] },
  { nombre: 'Comercial', rolFuncional: 'comercial', categoria: 'gestion', vaACampo: false,
    alias: ['COMERCIAL'] },

  // ── Gestión ────────────────────────────────────────────────────────────
  { nombre: 'Gestor de Proyectos', rolFuncional: 'gestor', categoria: 'gestion', vaACampo: true,
    alias: ['GESTOR DE PROYECTOS', 'Gestor de Proyecto', 'Gestor de Proyectos',
            'Gerente de Proyectos', 'Jefe de Proyectos', 'Lider de Proyectos'] },
  { nombre: 'Supervisor de Proyecto', rolFuncional: 'residente', categoria: 'gestion', vaACampo: true,
    alias: ['RESIDENTE'] },

  // ── Ingeniería de oficina ──────────────────────────────────────────────
  // Coordinador de Ingeniería es el responsable de ingeniería en oficina, así que
  // comparte rolFuncional con Supervisor de Proyecto (EDTs ING/PLA/HMI/TAB/PLC).
  { nombre: 'Coordinador de Ingeniería', rolFuncional: 'residente', categoria: 'ingenieria', vaACampo: false,
    alias: ['COORDINADOR DE INGENIERIA', 'Coordinador de Ingeniería'] },
  { nombre: 'Programador', rolFuncional: 'residente', categoria: 'ingenieria', vaACampo: true,
    alias: ['PROGRAMADOR', 'Ingeniero Programador'] },
  { nombre: 'Cadista', rolFuncional: 'cadista', categoria: 'ingenieria', vaACampo: false,
    alias: ['CADISTA', 'Cadista'] },

  // ── Campo ──────────────────────────────────────────────────────────────
  { nombre: 'Supervisor de Campo', rolFuncional: 'supervisor', categoria: 'campo', vaACampo: true,
    alias: ['SUPERVISOR', 'Supervisor de Construccion', 'Supervisor de Campo'] },
  // Andamiero es un puesto propio, no una variante del de campo. rolFuncional
  // null a propósito: si también fuera 'supervisor' competiría con el de campo
  // por los EDT CON/CMM y la derivación quedaría ambigua.
  { nombre: 'Supervisor Andamiero', rolFuncional: null, categoria: 'campo', vaACampo: true,
    alias: ['Supervisor Andamiero'] },
  { nombre: 'Ingeniero de Seguridad', rolFuncional: 'ssoma', categoria: 'seguridad', vaACampo: true,
    alias: ['SSOMA', 'HSEQ', 'Supervisor de Seguridad (HSEQ)', 'Supervisor Seguridad (SSMA)',
            'Ingeniero de Seguridad'] },
  { nombre: 'Logística', rolFuncional: 'logistica', categoria: 'soporte', vaACampo: false,
    alias: ['LOGISTICA'] },

  // ── Técnicos: no responden por EDTs, pero sí van a planta ──────────────
  { nombre: 'Técnico Instrumentista', rolFuncional: null, categoria: 'campo', vaACampo: true,
    alias: ['TECNICO INSTRUMENTISTA'] },
  { nombre: 'Técnico Eléctrico', rolFuncional: null, categoria: 'campo', vaACampo: true,
    alias: ['Técnico Eléctrico-Instrumentista', 'Técnico Electrónico'] },
  { nombre: 'Técnico Operativo', rolFuncional: null, categoria: 'campo', vaACampo: true,
    alias: ['TECNICO OPERARIO'] },
  { nombre: 'Técnico Electrotecnia', rolFuncional: null, categoria: 'campo', vaACampo: true,
    alias: ['TECNICO AYUDANTE'] },
  { nombre: 'Técnico Oficial', rolFuncional: null, categoria: 'campo', vaACampo: true,
    alias: ['TECNICO OFICIAL'] },
  { nombre: 'Técnico Auxiliar Mecánico', rolFuncional: null, categoria: 'campo', vaACampo: true,
    alias: ['Técnico Auxiliar Mecánico'] },
]

function normalizar(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
}

async function main() {
  console.log(APLICAR ? '*** APLICANDO CAMBIOS ***\n' : '*** SIMULACION (usa --aplicar para escribir) ***\n')

  // 1. Catálogo
  const porAlias = new Map<string, string>()
  let creados = 0
  for (const [i, p] of CATALOGO.entries()) {
    let puesto = await prisma.puesto.findUnique({ where: { nombre: p.nombre } })
    if (!puesto && APLICAR) {
      puesto = await prisma.puesto.create({
        data: {
          nombre: p.nombre,
          rolFuncional: p.rolFuncional,
          categoria: p.categoria,
          vaACampo: p.vaACampo,
          orden: (i + 1) * 10,
          updatedAt: new Date(),
        },
      })
      creados++
    }
    if (!puesto) console.log(`  [nuevo] ${p.nombre.padEnd(28)} rolFuncional=${p.rolFuncional ?? '-'}`)
    // El nombre propio también es alias: hay organigramas que ya lo escriben igual.
    for (const a of [p.nombre, ...p.alias]) porAlias.set(normalizar(a), puesto?.id ?? '(pendiente)')
  }
  console.log(`\nCatalogo: ${CATALOGO.length} puestos (${creados} creados ahora)\n`)

  // 2. Reapuntar nodos de organigramas de proyecto
  const nodos = await prisma.proyectoOrgNodo.findMany({ select: { id: true, cargoLabel: true, puestoId: true } })
  const sinMapa = new Map<string, number>()
  let mapeados = 0
  for (const n of nodos) {
    if (n.puestoId) continue
    const id = porAlias.get(normalizar(n.cargoLabel))
    if (!id || id === '(pendiente)') {
      sinMapa.set(n.cargoLabel, (sinMapa.get(n.cargoLabel) ?? 0) + 1)
      continue
    }
    if (APLICAR) await prisma.proyectoOrgNodo.update({ where: { id: n.id }, data: { puestoId: id } })
    mapeados++
  }
  console.log(`Organigramas de proyecto: ${mapeados}/${nodos.length} nodos mapeados`)

  // 3. Reapuntar nodos de plantillas
  const pNodos = await prisma.plantillaOrgNodo.findMany({ select: { id: true, cargoLabel: true, puestoId: true } })
  let pMapeados = 0
  for (const n of pNodos) {
    if (n.puestoId) continue
    const id = porAlias.get(normalizar(n.cargoLabel))
    if (!id || id === '(pendiente)') {
      sinMapa.set(n.cargoLabel, (sinMapa.get(n.cargoLabel) ?? 0) + 1)
      continue
    }
    if (APLICAR) await prisma.plantillaOrgNodo.update({ where: { id: n.id }, data: { puestoId: id } })
    pMapeados++
  }
  console.log(`Plantillas: ${pMapeados}/${pNodos.length} nodos mapeados`)

  if (sinMapa.size > 0) {
    console.log('\nSIN MAPEAR (quedan con cargoLabel, hay que agregarlos al catalogo):')
    for (const [label, n] of [...sinMapa].sort((a, b) => b[1] - a[1])) {
      console.log(`   ${String(n).padStart(3)}x  "${label}"`)
    }
  } else {
    console.log('\nTodos los cargoLabel quedaron mapeados.')
  }
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
