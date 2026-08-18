// Script de backfill: clasifica Proveedor.tipoProveedor ('nacional' | 'extranjero').
//
// Contexto: feature de reportes Importación vs. Local (Administración/Carlos).
// Regla de bajo riesgo, autoclasificación con confianza alta: todo proveedor con
// un RUC peruano válido (11 dígitos) es 'nacional' — se aplica automáticamente.
// Los proveedores SIN RUC quedan sin clasificar (tipoProveedor = null); este
// script solo IMPRIME una sugerencia heurística para cada uno (nombre con
// pinta de empresa extranjera + OCs en USD -> 'extranjero', si no -> probable
// dato faltante, sugerido 'nacional'), para que el usuario la confirme con
// Carlos/Edym antes de aplicarla a mano.
//
// Con --aplicar-dudosos, además aplica la sugerencia heurística a los proveedores
// sin RUC (requiere confirmación humana previa — no correr este flag a ciegas).
//
// Uso:
//   npx tsx scripts/backfill-tipo-proveedor.ts                 # local (.env)
//   npx dotenv -e .env.production -o -- npx tsx scripts/backfill-tipo-proveedor.ts
//   npx dotenv -e .env.production -o -- npx tsx scripts/backfill-tipo-proveedor.ts --aplicar-dudosos

import { PrismaClient } from '@prisma/client'

const APLICAR_DUDOSOS = process.argv.includes('--aplicar-dudosos')

const prisma = new PrismaClient()

const RUC_PERU_VALIDO = /^\d{11}$/

const PATRON_NOMBRE_EXTRANJERO = /\b(LTD|INC|CORP|CO\.?\s*LIMITED|PRIVATE LIMITED|GMBH|S\.?A\.? DE C\.?V\.?|S\.?R\.?L\.?|S\.?P\.?A\.?|B\.?V\.?|PTE\.?\s*LTD|LLC|CO\.,?\s*LTD)\b/i

async function main() {
  const proveedores = await prisma.proveedor.findMany({
    where: { tipoProveedor: null },
    select: { id: true, nombre: true, ruc: true },
    orderBy: { nombre: 'asc' },
  })

  console.log(`📋 ${proveedores.length} proveedores sin tipoProveedor`)

  const conRucValido = proveedores.filter(p => p.ruc && RUC_PERU_VALIDO.test(p.ruc))
  const sinRucValido = proveedores.filter(p => !p.ruc || !RUC_PERU_VALIDO.test(p.ruc))

  console.log(`   ✅ ${conRucValido.length} con RUC peruano válido -> se autoclasifican 'nacional'`)
  console.log(`   ❓ ${sinRucValido.length} sin RUC válido -> requieren confirmación manual (no se tocan)`)

  if (conRucValido.length > 0) {
    const result = await prisma.proveedor.updateMany({
      where: { id: { in: conRucValido.map(p => p.id) } },
      data: { tipoProveedor: 'nacional', updatedAt: new Date() },
    })
    console.log(`\n✅ Backfill aplicado: ${result.count} proveedores marcados 'nacional' (RUC válido).`)
  }

  if (sinRucValido.length === 0) {
    console.log('\n✅ No hay casos dudosos.')
    return
  }

  // Para la sugerencia heurística de los dudosos, cruzar con si tienen OCs en USD.
  const idsSinRuc = sinRucValido.map(p => p.id)
  const ocsPorProveedor = await prisma.ordenCompra.groupBy({
    by: ['proveedorId', 'moneda'],
    where: { proveedorId: { in: idsSinRuc } },
    _count: { _all: true },
  })
  const monedasPorProveedor = new Map<string, Set<string>>()
  for (const row of ocsPorProveedor) {
    if (!monedasPorProveedor.has(row.proveedorId)) monedasPorProveedor.set(row.proveedorId, new Set())
    monedasPorProveedor.get(row.proveedorId)!.add(row.moneda)
  }

  console.log(
    APLICAR_DUDOSOS
      ? `\n❓ Aplicando sugerencia heurística a los ${sinRucValido.length} casos dudosos:\n`
      : `\n❓ Lista de ${sinRucValido.length} casos dudosos (SIN aplicar — pendiente confirmación de Carlos/Edym):\n`
  )
  console.log('nombre | ruc | monedas de sus OCs | sugerencia heurística')
  console.log('-'.repeat(90))

  const paraAplicar: { id: string; tipoProveedor: string }[] = []

  for (const p of sinRucValido) {
    const monedas = Array.from(monedasPorProveedor.get(p.id) ?? [])
    const nombrePareceExtranjero = PATRON_NOMBRE_EXTRANJERO.test(p.nombre)
    const soloUsd = monedas.length > 0 && monedas.every(m => m === 'USD')
    // Solo sugerir 'extranjero' con evidencia doble (nombre + moneda de sus OCs).
    // Sin OCs no hay forma de confirmar moneda, así que se trata como dato de RUC
    // faltante y se sugiere 'nacional' pendiente de confirmación.
    const sugerencia = nombrePareceExtranjero && soloUsd ? 'extranjero' : 'nacional'
    const etiqueta = sugerencia === 'extranjero' ? 'extranjero' : 'nacional (probable dato de RUC faltante)'

    console.log(`${p.nombre} | ${p.ruc ?? '(sin RUC)'} | ${monedas.join(', ') || '(sin OCs)'} | ${etiqueta}`)
    paraAplicar.push({ id: p.id, tipoProveedor: sugerencia })
  }

  if (!APLICAR_DUDOSOS) {
    console.log('\n⚠️  Ninguno de estos 9 fue modificado. Confirmar con Carlos/Edym antes de fijar tipoProveedor.')
    return
  }

  for (const p of paraAplicar) {
    await prisma.proveedor.update({
      where: { id: p.id },
      data: { tipoProveedor: p.tipoProveedor, updatedAt: new Date() },
    })
  }
  console.log(`\n✅ ${paraAplicar.length} proveedores dudosos clasificados con la heurística aprobada.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
