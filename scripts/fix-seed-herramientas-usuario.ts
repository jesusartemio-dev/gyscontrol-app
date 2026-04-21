/**
 * Script: fix-seed-herramientas-usuario.ts
 *
 * Reasigna el `usuarioId` de los movimientos de alta creados por
 * `seed-herramientas-punch-list.ts` a otro usuario (por email).
 *
 * Filtra estrictamente por:
 *   - tipo = 'alta_herramienta'
 *   - observaciones = 'Alta inicial — Punch List Eléctrico Instrumental'
 * para no tocar ningún otro movimiento.
 *
 * Uso:
 *   npx tsx scripts/fix-seed-herramientas-usuario.ts jesus.m@gyscontrol.com
 *   npx dotenv -e .env.production -o -- npx tsx scripts/fix-seed-herramientas-usuario.ts jesus.m@gyscontrol.com
 */

import { prisma } from '@/lib/prisma'

const OBS_FILTRO = 'Alta inicial — Punch List Eléctrico Instrumental'

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Uso: npx tsx scripts/fix-seed-herramientas-usuario.ts <email>')
    process.exit(1)
  }

  const nuevoUsuario = await prisma.user.findFirst({ where: { email } })
  if (!nuevoUsuario) {
    console.error(`❌ Usuario no encontrado: ${email}`)
    process.exit(1)
  }

  console.log(`👤 Nuevo usuario: ${nuevoUsuario.email} (${nuevoUsuario.id})`)

  const afectados = await prisma.movimientoAlmacen.findMany({
    where: {
      tipo: 'alta_herramienta',
      observaciones: OBS_FILTRO,
    },
    select: { id: true, usuarioId: true, catalogoHerramientaId: true, cantidad: true },
  })

  console.log(`\n🔎 Encontrados ${afectados.length} movimiento(s) que coinciden con el filtro.`)

  if (afectados.length === 0) {
    console.log('Nada que actualizar. Salgo.')
    return
  }

  // Mostrar resumen por usuario actual
  const porUsuario = new Map<string, number>()
  for (const m of afectados) porUsuario.set(m.usuarioId, (porUsuario.get(m.usuarioId) ?? 0) + 1)
  for (const [uid, n] of porUsuario) {
    const u = await prisma.user.findUnique({ where: { id: uid }, select: { email: true } })
    console.log(`   • ${u?.email ?? uid}: ${n} movimientos`)
  }

  if (porUsuario.size === 1 && porUsuario.has(nuevoUsuario.id)) {
    console.log('✅ Todos los movimientos ya pertenecen al usuario indicado. Nada por hacer.')
    return
  }

  const result = await prisma.movimientoAlmacen.updateMany({
    where: {
      tipo: 'alta_herramienta',
      observaciones: OBS_FILTRO,
    },
    data: { usuarioId: nuevoUsuario.id },
  })

  console.log(`\n✅ Actualizados ${result.count} movimiento(s) → usuario ${nuevoUsuario.email}`)
}

main()
  .catch(e => {
    console.error('Error fatal:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
