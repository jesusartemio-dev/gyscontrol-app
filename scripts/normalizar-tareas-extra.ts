/**
 * Normaliza ProyectoTarea que tienen descripcion con prefijo '[EXTRA]' pero
 * esExtra = false. Esto ocurre con tareas creadas desde /mi-trabajo/mi-jornada
 * (Vía 2) antes del fix que agregó esExtra: true al create.
 *
 * Modo por defecto: dry-run (solo cuenta y muestra).
 * Para aplicar: pasar --apply.
 *
 * Uso (contra producción):
 *   npx dotenv -e .env.production -o -- npx tsx scripts/normalizar-tareas-extra.ts
 *   npx dotenv -e .env.production -o -- npx tsx scripts/normalizar-tareas-extra.ts --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const apply = process.argv.includes('--apply')
  const dbUrl = process.env.DATABASE_URL ?? ''
  const dbHint = dbUrl.slice(0, 30)

  console.log(`🎯 DB: ${dbHint}...`)
  console.log(`🔧 Modo: ${apply ? 'APPLY (escribirá cambios)' : 'DRY-RUN (solo lectura)'}`)
  console.log('')

  const candidatas = await prisma.proyectoTarea.findMany({
    where: {
      esExtra: false,
      descripcion: { startsWith: '[EXTRA]' }
    },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      createdAt: true,
      proyectoEdt: {
        select: {
          proyecto: { select: { codigo: true, nombre: true } }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  console.log(`📊 Tareas a normalizar (esExtra=false + descripcion LIKE '[EXTRA]%'): ${candidatas.length}`)
  console.log('')

  if (candidatas.length === 0) {
    console.log('✅ No hay nada que normalizar.')
    return
  }

  const preview = candidatas.slice(0, 15)
  console.log(`🔎 Muestra (primeras ${preview.length}):`)
  for (const t of preview) {
    const proy = t.proyectoEdt?.proyecto
    const proyStr = proy ? `${proy.codigo}` : 'sin-proy'
    const fecha = t.createdAt.toISOString().slice(0, 10)
    console.log(`  - [${fecha}] ${proyStr} · ${t.nombre}  (id: ${t.id})`)
  }
  if (candidatas.length > preview.length) {
    console.log(`  ... y ${candidatas.length - preview.length} más`)
  }
  console.log('')

  if (!apply) {
    console.log('ℹ️  Dry-run: no se escribió nada. Pasar --apply para aplicar.')
    return
  }

  console.log('🚀 Aplicando UPDATE...')
  const result = await prisma.proyectoTarea.updateMany({
    where: {
      esExtra: false,
      descripcion: { startsWith: '[EXTRA]' }
    },
    data: {
      esExtra: true,
      updatedAt: new Date()
    }
  })

  console.log(`✅ Actualizadas ${result.count} tareas.`)

  // Verificación post-update
  const remanente = await prisma.proyectoTarea.count({
    where: {
      esExtra: false,
      descripcion: { startsWith: '[EXTRA]' }
    }
  })
  console.log(`🔍 Remanente (debería ser 0): ${remanente}`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
