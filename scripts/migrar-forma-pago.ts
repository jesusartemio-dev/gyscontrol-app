/**
 * Migra datos legacy del campo condicionPago a los 3 campos nuevos
 * (condicionPago + formaPago + diasCredito) en 4 modelos:
 *   - OrdenCompra
 *   - CotizacionProveedor
 *   - CuentaPorPagar
 *   - CuentaPorCobrar
 *
 * El campo condicionPago se simplifica a 'contado' | 'credito' | 'adelanto'.
 * Si tenía un valor compuesto como "Factura 30 días", se descompone:
 *   condicionPago='credito', formaPago='factura', diasCredito=30
 *
 * Modo DRY-RUN por defecto. Para aplicar: --apply
 *
 * Uso:
 *   dotenv -e .env -o -- npx tsx scripts/migrar-forma-pago.ts            # dry-run local
 *   dotenv -e .env -o -- npx tsx scripts/migrar-forma-pago.ts --apply    # aplica local
 *   dotenv -e .env.production -o -- npx tsx scripts/migrar-forma-pago.ts            # dry-run prod
 *   dotenv -e .env.production -o -- npx tsx scripts/migrar-forma-pago.ts --apply    # aplica prod
 */

import { PrismaClient } from '@prisma/client'
import { parsePagoLegacy } from '../src/lib/utils/formaPago'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

interface RegistroCambio {
  modelo: string
  id: string
  ref: string
  antes: { condicion: string | null; dias: number | null }
  despues: { condicion: string; forma: string | null; dias: number | null }
}

async function main() {
  console.log(APPLY ? '🔄 MODO APLICAR' : '🔍 MODO DRY-RUN (sin cambios)')
  console.log('─'.repeat(70))

  const cambios: RegistroCambio[] = []

  // ── OrdenCompra ──
  const ocs = await prisma.ordenCompra.findMany({
    where: { formaPago: null },
    select: { id: true, numero: true, condicionPago: true, diasCredito: true },
  })
  for (const oc of ocs) {
    const parsed = parsePagoLegacy(oc.condicionPago, oc.diasCredito)
    cambios.push({
      modelo: 'OrdenCompra',
      id: oc.id,
      ref: oc.numero,
      antes: { condicion: oc.condicionPago, dias: oc.diasCredito },
      despues: parsed,
    })
  }

  // ── CotizacionProveedor ──
  const cps = await prisma.cotizacionProveedor.findMany({
    where: { formaPago: null, condicionPago: { not: null } },
    select: { id: true, codigo: true, condicionPago: true, diasCredito: true },
  })
  for (const cp of cps) {
    const parsed = parsePagoLegacy(cp.condicionPago, cp.diasCredito)
    cambios.push({
      modelo: 'CotizacionProveedor',
      id: cp.id,
      ref: cp.codigo,
      antes: { condicion: cp.condicionPago, dias: cp.diasCredito },
      despues: parsed,
    })
  }

  // ── CuentaPorPagar ──
  const cxps = await prisma.cuentaPorPagar.findMany({
    where: { formaPago: null },
    select: { id: true, numeroFactura: true, condicionPago: true, diasCredito: true },
  })
  for (const cxp of cxps) {
    const parsed = parsePagoLegacy(cxp.condicionPago, cxp.diasCredito)
    cambios.push({
      modelo: 'CuentaPorPagar',
      id: cxp.id,
      ref: cxp.numeroFactura ?? cxp.id.slice(-6),
      antes: { condicion: cxp.condicionPago, dias: cxp.diasCredito },
      despues: parsed,
    })
  }

  // ── CuentaPorCobrar ──
  const cxcs = await prisma.cuentaPorCobrar.findMany({
    where: { formaPago: null, condicionPago: { not: null } },
    select: { id: true, numeroFactura: true, condicionPago: true, diasCredito: true },
  })
  for (const cxc of cxcs) {
    const parsed = parsePagoLegacy(cxc.condicionPago, cxc.diasCredito)
    cambios.push({
      modelo: 'CuentaPorCobrar',
      id: cxc.id,
      ref: cxc.numeroFactura ?? cxc.id.slice(-6),
      antes: { condicion: cxc.condicionPago, dias: cxc.diasCredito },
      despues: parsed,
    })
  }

  if (cambios.length === 0) {
    console.log('✅ No hay registros para migrar (todos ya tienen formaPago).')
    return
  }

  console.log(`Encontrados ${cambios.length} registros para migrar:\n`)
  // Resumen por modelo
  const resumen: Record<string, number> = {}
  for (const c of cambios) {
    resumen[c.modelo] = (resumen[c.modelo] || 0) + 1
  }
  for (const [modelo, n] of Object.entries(resumen)) {
    console.log(`  ${modelo}: ${n} registros`)
  }

  // Detalle por tipo de transformación
  const tipos: Record<string, number> = {}
  for (const c of cambios) {
    const k = `${c.antes.condicion ?? '∅'} → ${c.despues.condicion}/${c.despues.forma ?? '∅'}/${c.despues.dias ?? '∅'}`
    tipos[k] = (tipos[k] || 0) + 1
  }
  console.log('\nTransformaciones detectadas:')
  for (const [k, n] of Object.entries(tipos).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}× ${k}`)
  }

  if (!APPLY) {
    console.log('\n💡 Para aplicar: pasá --apply')
    return
  }

  console.log(`\n🔄 Aplicando ${cambios.length} cambios...`)
  let aplicados = 0
  for (const c of cambios) {
    const data: any = {
      condicionPago: c.despues.condicion,
      formaPago: c.despues.forma,
      diasCredito: c.despues.dias,
    }
    if (c.modelo === 'OrdenCompra') {
      await prisma.ordenCompra.update({ where: { id: c.id }, data })
    } else if (c.modelo === 'CotizacionProveedor') {
      await prisma.cotizacionProveedor.update({ where: { id: c.id }, data })
    } else if (c.modelo === 'CuentaPorPagar') {
      await prisma.cuentaPorPagar.update({ where: { id: c.id }, data })
    } else if (c.modelo === 'CuentaPorCobrar') {
      await prisma.cuentaPorCobrar.update({ where: { id: c.id }, data })
    }
    aplicados++
  }
  console.log(`✅ Aplicados: ${aplicados}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
