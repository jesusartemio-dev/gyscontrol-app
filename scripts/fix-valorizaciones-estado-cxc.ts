/**
 * Corrige valorizaciones que quedaron en hes_pendiente porque su CxC
 * fue creada directamente (sin pasar por el flujo de Facturación).
 *
 * Casos:
 *   CJM43-VAL-001 → pagada  (CxC E001-1706 ya está pagada)
 *   CJM43-VAL-002 → facturada (CxC E001-1710 está vencida, aún no pagada)
 *
 * Uso: npx dotenv -e .env.production -o -- tsx scripts/fix-valorizaciones-estado-cxc.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FIXES: { codigoCxC: string; codigoVal: string; nuevoEstado: string }[] = [
  { codigoCxC: 'E001-1706', codigoVal: 'CJM43-VAL-001', nuevoEstado: 'pagada' },
  { codigoCxC: 'E001-1710', codigoVal: 'CJM43-VAL-002', nuevoEstado: 'facturada' },
]

async function main() {
  for (const fix of FIXES) {
    const cxc = await prisma.cuentaPorCobrar.findFirst({
      where: { numeroDocumento: fix.codigoCxC },
      select: { id: true, estado: true, monto: true, moneda: true },
    })

    const val = await prisma.valorizacion.findFirst({
      where: { codigo: fix.codigoVal },
      select: { id: true, codigo: true, estado: true, proyectoId: true },
    })

    if (!val) {
      console.log(`❌ Valorización no encontrada: ${fix.codigoVal}`)
      continue
    }

    if (val.estado === fix.nuevoEstado) {
      console.log(`⏭️  ${fix.codigoVal} ya está en estado '${fix.nuevoEstado}'. Sin cambios.`)
      continue
    }

    await prisma.valorizacion.update({
      where: { id: val.id },
      data: { estado: fix.nuevoEstado as any, updatedAt: new Date() },
    })

    console.log(`✅ ${fix.codigoVal}: ${val.estado} → ${fix.nuevoEstado}`)
    if (cxc) {
      console.log(`   CxC vinculada: ${fix.codigoCxC} (${cxc.moneda} ${cxc.monto.toFixed(2)}, estado: ${cxc.estado})`)
    }
  }

  console.log('\n✨ Corrección completada.')
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
