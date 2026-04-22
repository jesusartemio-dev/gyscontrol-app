// ===================================================
// 📁 Archivo: backfill-audit-lista-crear.ts
// 📌 Ubicación: scripts/
// 🔧 Descripción: Inserta evento CREAR en AuditLog para todas las ListaEquipo
//                 que no lo tengan, usando lista.createdAt y lista.responsableId.
// 🧠 Uso:
//   npx tsx scripts/backfill-audit-lista-crear.ts            (dev)
//   npx dotenv -e .env.production -o -- npx tsx scripts/backfill-audit-lista-crear.ts   (prod)
//   Flag --dry-run para solo contar sin escribir.
// ===================================================

import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const dbUrl = process.env.DATABASE_URL?.slice(0, 60) ?? '(sin DATABASE_URL)'

  console.log('🔎 DB destino:', dbUrl)
  console.log(dryRun ? '🧪 Modo DRY-RUN (no se escribirá nada)' : '✏️  Modo ESCRITURA')
  console.log('')

  // 1) Traer todos los IDs de ListaEquipo que YA tienen CREAR
  const existentes = await prisma.auditLog.findMany({
    where: { entidadTipo: 'LISTA_EQUIPO', accion: 'CREAR' },
    select: { entidadId: true },
  })
  const existentesSet = new Set(existentes.map((e) => e.entidadId))
  console.log(`📋 ListaEquipo con CREAR ya registrado: ${existentesSet.size}`)

  // 2) Traer todas las listas con datos mínimos
  const listas = await prisma.listaEquipo.findMany({
    select: {
      id: true,
      nombre: true,
      codigo: true,
      createdAt: true,
      responsableId: true,
      proyecto: { select: { nombre: true, codigo: true } },
    },
  })
  console.log(`📋 ListaEquipo totales: ${listas.length}`)

  // 3) Filtrar las que no tienen evento CREAR
  const faltantes = listas.filter((l) => !existentesSet.has(l.id))
  console.log(`📋 ListaEquipo SIN evento CREAR: ${faltantes.length}`)
  console.log('')

  if (faltantes.length === 0) {
    console.log('✅ Nada que hacer — todas las listas ya tienen evento CREAR.')
    return
  }

  // 4) Validar que los responsables existan (la FK a User lo requiere)
  const responsableIds = [...new Set(faltantes.map((l) => l.responsableId))]
  const usuariosExistentes = await prisma.user.findMany({
    where: { id: { in: responsableIds } },
    select: { id: true },
  })
  const usuariosSet = new Set(usuariosExistentes.map((u) => u.id))

  const validas = faltantes.filter((l) => usuariosSet.has(l.responsableId))
  const invalidas = faltantes.filter((l) => !usuariosSet.has(l.responsableId))

  if (invalidas.length > 0) {
    console.log(`⚠️  ${invalidas.length} listas tienen responsableId inexistente — se OMITEN:`)
    invalidas.slice(0, 10).forEach((l) => {
      console.log(`   - ${l.codigo} (responsableId=${l.responsableId})`)
    })
    if (invalidas.length > 10) console.log(`   ... y ${invalidas.length - 10} más`)
    console.log('')
  }

  console.log(`📝 Se insertarán ${validas.length} registros CREAR en AuditLog`)
  console.log('')

  if (dryRun) {
    console.log('🧪 DRY-RUN: no se insertó nada. Corre sin --dry-run para aplicar.')
    return
  }

  // 5) Insertar en batches (createMany no devuelve IDs pero es mucho más rápido)
  const BATCH_SIZE = 500
  let insertados = 0

  for (let i = 0; i < validas.length; i += BATCH_SIZE) {
    const batch = validas.slice(i, i + BATCH_SIZE)
    const data = batch.map((l) => ({
      id: randomUUID(),
      entidadTipo: 'LISTA_EQUIPO',
      entidadId: l.id,
      accion: 'CREAR',
      usuarioId: l.responsableId,
      descripcion: l.nombre,
      metadata: JSON.stringify({
        codigo: l.codigo,
        proyecto: l.proyecto?.nombre ?? null,
        proyectoCodigo: l.proyecto?.codigo ?? null,
        origen: 'backfill',
      }),
      createdAt: l.createdAt, // 👈 preservar la fecha real de creación de la lista
    }))

    const res = await prisma.auditLog.createMany({ data, skipDuplicates: true })
    insertados += res.count
    console.log(`   ✔ batch ${i / BATCH_SIZE + 1}: ${res.count}/${batch.length} insertados (acumulado: ${insertados})`)
  }

  console.log('')
  console.log(`✅ Terminado — ${insertados} eventos CREAR insertados en AuditLog.`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
