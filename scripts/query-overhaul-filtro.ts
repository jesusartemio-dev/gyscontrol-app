import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const PROYECTO_ID = '7bde0152-a631-490c-b6ac-f0fc44c5751e' // OVERHAUL – FILTRO US E051

async function main() {
  // ── 1. Proyecto básico ────────────────────────────────────────────────────
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: PROYECTO_ID },
    select: { id: true, codigo: true, nombre: true, estado: true, cotizacionId: true, ordenCompraCliente: true },
  })
  console.log('\n==== 1. PROYECTO ====')
  console.log(JSON.stringify(proyecto, null, 2))

  // ── 2. Personal del proyecto ──────────────────────────────────────────────
  const personal = await prisma.personalProyecto.findMany({
    where: { proyectoId: PROYECTO_ID },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, role: true,
          empleado: {
            select: {
              documentoIdentidad: true, telefono: true,
              cargo: { select: { nombre: true } },
              departamento: { select: { nombre: true } },
              activo: true, fechaIngreso: true,
            },
          },
        },
      },
    },
  })

  console.log(`\n==== 2. PERSONAL PROYECTO (${personal.length} registros) ====`)
  for (const p of personal) {
    console.log(`\n  ID PersonalProyecto: ${p.id}`)
    console.log(`  Rol en proyecto: ${p.rol}`)
    console.log(`  Activo: ${p.activo}`)
    console.log(`  FechaAsignacion: ${p.fechaAsignacion.toISOString().slice(0,10)}`)
    console.log(`  FechaFin: ${p.fechaFin?.toISOString().slice(0,10) ?? 'null'}`)
    console.log(`  Notas: ${p.notas ?? 'null'}`)
    console.log(`  -- Usuario --`)
    console.log(`  Nombre: ${p.user.name ?? 'null'}`)
    console.log(`  Email: ${p.user.email}`)
    console.log(`  Role sistema: ${p.user.role}`)
    const emp = p.user.empleado
    if (emp) {
      console.log(`  DNI/Documento: ${emp.documentoIdentidad ?? 'null'}`)
      console.log(`  Teléfono: ${emp.telefono ?? 'null'}`)
      console.log(`  Cargo: ${emp.cargo?.nombre ?? 'null'}`)
      console.log(`  Departamento: ${emp.departamento?.nombre ?? 'null'}`)
      console.log(`  Activo empleado: ${emp.activo}`)
      console.log(`  Fecha ingreso: ${emp.fechaIngreso?.toISOString().slice(0,10) ?? 'null'}`)
    } else {
      console.log(`  (sin registro Empleado vinculado)`)
    }
  }

  // ── 3. Cronograma ─────────────────────────────────────────────────────────
  const cronograma = await prisma.proyectoCronograma.findFirst({
    where: { proyectoId: PROYECTO_ID, tipo: 'ejecucion' },
    orderBy: { version: 'desc' },
  })

  if (!cronograma) { console.log('\n(Sin cronograma de ejecución)') }
  else {
    console.log(`\n==== 3. CRONOGRAMA "${cronograma.nombre}" v${cronograma.version} ====`)
    const fases = await prisma.proyectoFase.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      orderBy: { orden: 'asc' },
    })
    for (const fase of fases) {
      console.log(`\n  FASE [${fase.orden}]: ${fase.nombre}`)
      const edts = await prisma.proyectoEdt.findMany({
        where: { proyectoCronogramaId: cronograma.id, proyectoFaseId: fase.id },
        orderBy: { orden: 'asc' },
        include: { proyectoActividad: { orderBy: { orden: 'asc' }, select: { nombre: true, horasPlan: true } } },
      })
      for (const edt of edts) {
        console.log(`    EDT: ${edt.nombre}`)
        for (const act of edt.proyectoActividad) {
          console.log(`      → ${act.nombre}  [${act.horasPlan ?? '-'}h]`)
        }
      }
    }

    // Personal/recurso en tareas
    const tareas = await prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      include: {
        user: { select: { name: true } },
        recurso: { select: { nombre: true } },
      },
    })
    const recursoHoras = new Map<string, number>()
    const personaMap = new Map<string, string>()
    for (const t of tareas) {
      const nombre = t.user?.name ?? 'SIN ASIGNAR'
      const recurso = t.recurso?.nombre ?? 'SIN RECURSO'
      personaMap.set(nombre, recurso)
      recursoHoras.set(recurso, (recursoHoras.get(recurso) ?? 0) + Number(t.horasEstimadas ?? 0))
    }
    console.log('\n  PERSONAL ÚNICO EN TAREAS:')
    for (const [nombre, recurso] of [...personaMap.entries()].sort((a,b)=>a[1].localeCompare(b[1])))
      console.log(`    ${nombre.padEnd(28)} → ${recurso}`)
    console.log('\n  HORAS POR RECURSO:')
    for (const [r, h] of [...recursoHoras.entries()].sort((a,b)=>b[1]-a[1]))
      console.log(`    ${r.padEnd(25)} ${h.toFixed(1).padStart(8)} h`)
    console.log(`    ${'TOTAL'.padEnd(25)} ${[...recursoHoras.values()].reduce((a,b)=>a+b,0).toFixed(1).padStart(8)} h`)
  }

  // ── 4. Cotización ─────────────────────────────────────────────────────────
  if (proyecto?.cotizacionId) {
    const cot = await prisma.cotizacion.findUnique({
      where: { id: proyecto.cotizacionId },
      include: {
        cotizacionTdrAnalisis: true,
        cotizacionEquipo: { include: { cotizacionEquipoItem: { take: 20 } } },
        cotizacionServicio: { include: { cotizacionServicioItem: { include: { catalogoServicio: { select: { nombre: true } } }, take: 20 } } },
      },
    })
    console.log(`\n==== 4. COTIZACIÓN ====`)
    console.log(`  Nombre: ${cot?.nombre ?? 'null'}`)
    const tdr = cot?.cotizacionTdrAnalisis?.[0]
    if (tdr) {
      console.log(`  TDR — alcance: ${tdr.alcanceDetectado ?? 'null'}`)
      console.log(`  TDR — ubicación: ${tdr.ubicacionDetectada ?? 'null'}`)
      const equiposTdr = tdr.equiposIdentificados
        ? (tdr.equiposIdentificados as any[]).slice(0,15).map((e:any)=>`${e.nombre??e.equipo??''} ${e.especificacion??''}`.trim())
        : []
      console.log(`  TDR Equipos (${equiposTdr.length}):`)
      equiposTdr.forEach(e => console.log(`    - ${e}`))
      const svcsTdr = tdr.serviciosIdentificados
        ? (tdr.serviciosIdentificados as any[]).slice(0,15).map((s:any)=>`${s.nombre??s.servicio??''}`.trim())
        : []
      console.log(`  TDR Servicios (${svcsTdr.length}):`)
      svcsTdr.forEach(s => console.log(`    - ${s}`))
    }
    // Equipos cotización
    const eqItems = (cot?.cotizacionEquipo??[]).flatMap(ce=>ce.cotizacionEquipoItem).slice(0,20)
    if (eqItems.length) {
      console.log(`  Equipos cotización (${eqItems.length}):`)
      eqItems.forEach(e=>console.log(`    - ${e.descripcion??''} ${e.marca??''}`.trim()))
    }
  } else {
    console.log('\n==== 4. COTIZACIÓN: Sin cotización vinculada ====')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
