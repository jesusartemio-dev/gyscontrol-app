/**
 * Seed de prueba para /admin/uso-ia.
 * Genera ~40 registros de AgenteUsage repartidos en el mes actual,
 * cubriendo todos los tipos para ver el stacked chart con varios colores.
 *
 * Ejecutar:  npx tsx scripts/seed-agente-usage.ts
 * Limpiar:   npx tsx scripts/seed-agente-usage.ts --clean
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SEED_TAG = 'seed-uso-ia'

const SONNET = 'claude-sonnet-4-5-20250929'
const HAIKU = 'claude-haiku-4-5-20251001'

const COSTS: Record<string, { input: number; output: number }> = {
  [SONNET]: { input: 3.0, output: 15.0 },
  [HAIKU]: { input: 0.8, output: 4.0 },
}

function calcCost(modelo: string, tokensInput: number, tokensOutput: number): number {
  const c = COSTS[modelo]
  return (tokensInput * c.input + tokensOutput * c.output) / 1_000_000
}

interface TipoSpec {
  tipo: string
  modelo: string
  /** rango [min,max] de input tokens */
  inputRange: [number, number]
  outputRange: [number, number]
  /** llamadas a generar */
  calls: number
}

const SPECS: TipoSpec[] = [
  { tipo: 'chat',                modelo: SONNET, inputRange: [5_000, 15_000],  outputRange: [500, 2_000],  calls: 8 },
  { tipo: 'chat-simple',         modelo: HAIKU,  inputRange: [1_000, 3_000],   outputRange: [200, 500],    calls: 10 },
  { tipo: 'pdf-preprocessing',   modelo: SONNET, inputRange: [8_000, 20_000],  outputRange: [1_000, 3_000],calls: 4 },
  { tipo: 'excel-extraction',    modelo: SONNET, inputRange: [20_000, 50_000], outputRange: [2_000, 5_000],calls: 5 },
  { tipo: 'pdf-extraction',      modelo: SONNET, inputRange: [15_000, 40_000], outputRange: [2_000, 4_000],calls: 3 },
  { tipo: 'ocr',                 modelo: HAIKU,  inputRange: [2_000, 5_000],   outputRange: [300, 800],    calls: 12 },
  { tipo: 'scan-cotizacion',     modelo: SONNET, inputRange: [10_000, 25_000], outputRange: [1_500, 3_000],calls: 4 },
  { tipo: 'import-catalogo-pdf', modelo: SONNET, inputRange: [20_000, 50_000], outputRange: [3_000, 6_000],calls: 3 },
]

function rand(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1))
}

function randomDateInCurrentMonth(): Date {
  const now = new Date()
  const day = rand(1, now.getDate()) // hasta hoy
  const hour = rand(8, 19)
  const minute = rand(0, 59)
  return new Date(now.getFullYear(), now.getMonth(), day, hour, minute)
}

/**
 * Día aleatorio del mes anterior, entre el 1 y el `dayOfMonth` actual.
 * Útil para sembrar la comparativa "vs mes anterior (mismos días)".
 */
function randomDateInPreviousMonth(): Date {
  const now = new Date()
  const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  const cap = Math.min(now.getDate(), lastDayPrev)
  const day = rand(1, cap)
  const hour = rand(8, 19)
  const minute = rand(0, 59)
  return new Date(now.getFullYear(), now.getMonth() - 1, day, hour, minute)
}

async function clean() {
  const result = await prisma.agenteUsage.deleteMany({
    where: { metadata: { path: ['source'], equals: SEED_TAG } },
  })
  console.log(`Eliminados ${result.count} registros con metadata.source = "${SEED_TAG}"`)
}

async function seed() {
  // Tomar cualquier usuario existente; preferir admin si lo hay
  const user = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true, name: true, email: true },
  }) ?? await prisma.user.findFirst({ select: { id: true, name: true, email: true } })

  if (!user) {
    console.error('No hay usuarios en la DB. Crea uno primero.')
    process.exit(1)
  }
  console.log(`Usando userId="${user.id}" (${user.name ?? user.email})`)

  const records: Array<{
    userId: string
    tipo: string
    modelo: string
    tokensInput: number
    tokensOutput: number
    costoEstimado: number
    duracionMs: number
    metadata: { source: string; seeded: true }
    createdAt: Date
  }> = []

  // Mes actual: 100% del volumen
  for (const spec of SPECS) {
    for (let i = 0; i < spec.calls; i++) {
      const ti = rand(spec.inputRange[0], spec.inputRange[1])
      const to = rand(spec.outputRange[0], spec.outputRange[1])
      records.push({
        userId: user.id,
        tipo: spec.tipo,
        modelo: spec.modelo,
        tokensInput: ti,
        tokensOutput: to,
        costoEstimado: calcCost(spec.modelo, ti, to),
        duracionMs: rand(800, 8_000),
        metadata: { source: SEED_TAG, seeded: true },
        createdAt: randomDateInCurrentMonth(),
      })
    }
  }

  // Mes anterior: ~60% del volumen — alimenta la card "Tendencia vs mes anterior"
  for (const spec of SPECS) {
    const prevCalls = Math.max(1, Math.round(spec.calls * 0.6))
    for (let i = 0; i < prevCalls; i++) {
      const ti = rand(spec.inputRange[0], spec.inputRange[1])
      const to = rand(spec.outputRange[0], spec.outputRange[1])
      records.push({
        userId: user.id,
        tipo: spec.tipo,
        modelo: spec.modelo,
        tokensInput: ti,
        tokensOutput: to,
        costoEstimado: calcCost(spec.modelo, ti, to),
        duracionMs: rand(800, 8_000),
        metadata: { source: SEED_TAG, seeded: true },
        createdAt: randomDateInPreviousMonth(),
      })
    }
  }

  const result = await prisma.agenteUsage.createMany({ data: records })
  const totalCost = records.reduce((s, r) => s + r.costoEstimado, 0)

  console.log(`\nInsertados ${result.count} registros`)
  console.log(`Costo total simulado: $${totalCost.toFixed(3)}`)
  console.log(`\nDesglose por tipo:`)
  for (const spec of SPECS) {
    const subset = records.filter((r) => r.tipo === spec.tipo)
    const sub = subset.reduce((s, r) => s + r.costoEstimado, 0)
    console.log(`  ${spec.tipo.padEnd(22)} ${subset.length.toString().padStart(2)} llamadas  $${sub.toFixed(3)}`)
  }
  console.log(`\nAbre /admin/uso-ia para ver el chart y las tablas.`)
  console.log(`Para limpiar: npx tsx scripts/seed-agente-usage.ts --clean`)
}

async function main() {
  if (process.argv.includes('--clean')) {
    await clean()
  } else {
    await seed()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
