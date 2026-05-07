import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Buscar recursos existentes para vincular
  const recursos = await prisma.recurso.findMany({
    where: {
      tipo: 'individual',
      activo: true,
    },
    select: { id: true, nombre: true },
  })

  const r = (nombre: string) =>
    recursos.find(x => x.nombre.toLowerCase() === nombre.toLowerCase())?.id ?? null

  console.log(`🔍 Recursos individuales encontrados: ${recursos.length}`)
  recursos.forEach(x => console.log(`   - ${x.nombre}`))

  // ── PLANTILLA 1: Proyecto NEXA estándar ──────────────────────────────────────

  const plantillaNEXA = await prisma.plantillaOrganigrama.upsert({
    where: { id: 'plantilla-nexa-estandar' },
    update: {},
    create: {
      id: 'plantilla-nexa-estandar',
      nombre: 'Proyecto NEXA estándar',
      descripcion:
        'Estructura para proyectos de automatización e instrumentación en NEXA Refinería Cajamarquilla',
      activo: true,
    },
  })

  // Re-crear nodos limpios
  await prisma.plantillaOrgNodo.deleteMany({ where: { plantillaId: plantillaNEXA.id } })

  // Nivel 1 — Gestor de Proyecto (raíz)
  const gestor = await prisma.plantillaOrgNodo.create({
    data: {
      id: 'nodo-gestor',
      plantillaId: plantillaNEXA.id,
      parentId: null,
      orden: 0,
      cargoLabel: 'Gestor de Proyecto',
      recursoId: r('Gestor'),
      esObligatorio: true,
    },
  })

  // Nivel 2 — reportan al Gestor
  const residente = await prisma.plantillaOrgNodo.create({
    data: {
      id: 'nodo-residente',
      plantillaId: plantillaNEXA.id,
      parentId: gestor.id,
      orden: 0,
      cargoLabel: 'Residente / Ing. Programador',
      recursoId: r('Programador Senior'),
      esObligatorio: false,
    },
  })

  await prisma.plantillaOrgNodo.create({
    data: {
      id: 'nodo-cadista',
      plantillaId: plantillaNEXA.id,
      parentId: gestor.id,
      orden: 1,
      cargoLabel: 'Cadista',
      recursoId: r('Cadista'),
      esObligatorio: false,
    },
  })

  await prisma.plantillaOrgNodo.create({
    data: {
      id: 'nodo-hseq',
      plantillaId: plantillaNEXA.id,
      parentId: gestor.id,
      orden: 2,
      cargoLabel: 'Supervisor de Seguridad (HSEQ)',
      recursoId: r('SSMA'),
      esObligatorio: true,
    },
  })

  const supervisor = await prisma.plantillaOrgNodo.create({
    data: {
      id: 'nodo-supervisor',
      plantillaId: plantillaNEXA.id,
      parentId: gestor.id,
      orden: 3,
      cargoLabel: 'Supervisor de Proyecto',
      recursoId: r('Supervisor'),
      esObligatorio: true,
    },
  })

  // Nivel 3 — Coordinador (reporta al Supervisor)
  const coordConstruccion = await prisma.plantillaOrgNodo.create({
    data: {
      id: 'nodo-coord-construccion',
      plantillaId: plantillaNEXA.id,
      parentId: supervisor.id,
      orden: 0,
      cargoLabel: 'Coordinador de Construcción',
      recursoId: r('Supervisor'),
      esObligatorio: false,
    },
  })

  // Nivel 4 — Técnicos (reportan al Coordinador)
  await prisma.plantillaOrgNodo.createMany({
    data: [
      {
        id: 'nodo-tecnico-1',
        plantillaId: plantillaNEXA.id,
        parentId: coordConstruccion.id,
        orden: 0,
        cargoLabel: 'Técnico Eléctrico-Instrumentista',
        recursoId: r('Tecnico'),
        esObligatorio: false,
      },
      {
        id: 'nodo-tecnico-2',
        plantillaId: plantillaNEXA.id,
        parentId: coordConstruccion.id,
        orden: 1,
        cargoLabel: 'Técnico Eléctrico-Instrumentista',
        recursoId: r('Tecnico'),
        esObligatorio: false,
      },
      {
        id: 'nodo-tecnico-3',
        plantillaId: plantillaNEXA.id,
        parentId: coordConstruccion.id,
        orden: 2,
        cargoLabel: 'Técnico Eléctrico-Instrumentista',
        recursoId: r('Tecnico'),
        esObligatorio: false,
      },
      {
        id: 'nodo-tecnico-aux',
        plantillaId: plantillaNEXA.id,
        parentId: coordConstruccion.id,
        orden: 3,
        cargoLabel: 'Técnico Auxiliar Mecánico',
        recursoId: r('Tecnico'),
        esObligatorio: false,
      },
    ],
  })

  // Supervisor Andamiero (reporta al Supervisor)
  await prisma.plantillaOrgNodo.create({
    data: {
      id: 'nodo-andamiero',
      plantillaId: plantillaNEXA.id,
      parentId: supervisor.id,
      orden: 1,
      cargoLabel: 'Supervisor Andamiero',
      recursoId: r('Andamiero'),
      esObligatorio: false,
    },
  })

  // ── PLANTILLA 2: Proyecto pequeño ────────────────────────────────────────────

  const plantillaSmall = await prisma.plantillaOrganigrama.upsert({
    where: { id: 'plantilla-proyecto-pequeno' },
    update: {},
    create: {
      id: 'plantilla-proyecto-pequeno',
      nombre: 'Proyecto pequeño',
      descripcion:
        'Estructura mínima para proyectos de corto plazo con equipo reducido',
      activo: true,
    },
  })

  await prisma.plantillaOrgNodo.deleteMany({ where: { plantillaId: plantillaSmall.id } })

  const gestorSmall = await prisma.plantillaOrgNodo.create({
    data: {
      id: 'nodo-small-gestor',
      plantillaId: plantillaSmall.id,
      parentId: null,
      orden: 0,
      cargoLabel: 'Gestor de Proyecto',
      recursoId: r('Gestor'),
      esObligatorio: true,
    },
  })

  const supervisorSmall = await prisma.plantillaOrgNodo.create({
    data: {
      id: 'nodo-small-supervisor',
      plantillaId: plantillaSmall.id,
      parentId: gestorSmall.id,
      orden: 0,
      cargoLabel: 'Supervisor de Campo',
      recursoId: r('Supervisor'),
      esObligatorio: true,
    },
  })

  await prisma.plantillaOrgNodo.createMany({
    data: [
      {
        id: 'nodo-small-ssma',
        plantillaId: plantillaSmall.id,
        parentId: gestorSmall.id,
        orden: 1,
        cargoLabel: 'Supervisor Seguridad (SSMA)',
        recursoId: r('SSMA'),
        esObligatorio: true,
      },
      {
        id: 'nodo-small-tec1',
        plantillaId: plantillaSmall.id,
        parentId: supervisorSmall.id,
        orden: 0,
        cargoLabel: 'Técnico Electrónico',
        recursoId: r('Tecnico'),
        esObligatorio: true,
      },
      {
        id: 'nodo-small-tec2',
        plantillaId: plantillaSmall.id,
        parentId: supervisorSmall.id,
        orden: 1,
        cargoLabel: 'Técnico Electrónico',
        recursoId: r('Tecnico'),
        esObligatorio: false,
      },
    ],
  })

  console.log('')
  console.log('✅ Plantillas de organigrama creadas:')
  console.log(`   - ${plantillaNEXA.nombre} (9 nodos)`)
  console.log(`   - ${plantillaSmall.nombre} (5 nodos)`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
