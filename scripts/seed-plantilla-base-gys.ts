/**
 * Crea la plantilla base GYS en la DB con los 4 nodos corporativos.
 * Reemplaza los NODOS_FIJOS_GYS hardcodeados que existían en código.
 *
 * Uso: npx dotenv -e .env.production -- npx tsx scripts/seed-plantilla-base-gys.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const NODOS_GYS = [
  { cargoLabel: 'GERENCIA GENERAL',      email: 'carlos.s@gyscontrol.com', orden: 0, parentLabel: null },
  { cargoLabel: 'COMERCIAL',             email: 'miguel.c@gyscontrol.com', orden: 0, parentLabel: 'GERENCIA GENERAL' },
  { cargoLabel: 'GERENCIA DE PROYECTOS', email: 'jesus.m@gyscontrol.com',  orden: 1, parentLabel: 'GERENCIA GENERAL' },
  { cargoLabel: 'HSEQ',                  email: 'yony.a@gyscontrol.com',   orden: 2, parentLabel: 'GERENCIA GENERAL' },
]

async function main() {
  // Verificar si ya existe una plantilla base
  const existe = await prisma.plantillaOrganigrama.findFirst({ where: { esBase: true } })
  if (existe) {
    console.log(`Ya existe una plantilla base: "${existe.nombre}" (id: ${existe.id})`)
    console.log('Si quieres recrearla, elimínala manualmente primero.')
    return
  }

  // Resolver userIds por email
  const emails = NODOS_GYS.map(n => n.email)
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, name: true },
  })
  const emailToUserId = Object.fromEntries(users.map(u => [u.email, u.id]))

  console.log('Usuarios encontrados:')
  for (const u of users) console.log(`  ${u.email} → ${u.name} (${u.id})`)

  const noEncontrados = emails.filter(e => !emailToUserId[e])
  if (noEncontrados.length > 0) {
    console.warn('⚠ Emails sin usuario en DB:', noEncontrados)
    console.warn('  Los nodos correspondientes quedarán sin usuario asignado (vacante).')
  }

  // Crear plantilla base
  const plantilla = await prisma.plantillaOrganigrama.create({
    data: {
      nombre: 'GYS Base',
      descripcion: 'Estructura corporativa GYS — se aplica automáticamente a todos los organigramas',
      esBase: true,
      activo: true,
    },
  })
  console.log(`\nPlantilla base creada: "${plantilla.nombre}" (id: ${plantilla.id})`)

  // Crear nodos en orden (raíz primero)
  const idMap: Record<string, string> = {}
  for (const def of NODOS_GYS) {
    const parentId = def.parentLabel ? (idMap[def.parentLabel] ?? null) : null
    const nodo = await prisma.plantillaOrgNodo.create({
      data: {
        plantillaId: plantilla.id,
        cargoLabel: def.cargoLabel,
        parentId,
        orden: def.orden,
        userId: emailToUserId[def.email] ?? null,
        esObligatorio: true,
      },
    })
    idMap[def.cargoLabel] = nodo.id
    console.log(`  + ${def.cargoLabel} (userId: ${emailToUserId[def.email] ?? 'vacante'})`)
  }

  console.log('\n✓ Plantilla base GYS creada correctamente.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
