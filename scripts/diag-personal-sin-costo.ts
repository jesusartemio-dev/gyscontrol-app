import { prisma } from '@/lib/prisma'

// ¿Quiénes son las personas sin costo por hora y por qué no lo tienen? Read-only.

async function main() {
  const desde = new Date(Date.UTC(2026, 2, 1))
  const registros = await prisma.registroHoras.findMany({
    where: { fechaTrabajo: { gte: desde } },
    select: { usuarioId: true, horasTrabajadas: true, costoHora: true },
  })

  const porUsuario = new Map<string, { horas: number; costoMax: number }>()
  for (const r of registros) {
    if (!r.usuarioId) continue
    const a = porUsuario.get(r.usuarioId) ?? { horas: 0, costoMax: 0 }
    a.horas += Number(r.horasTrabajadas)
    a.costoMax = Math.max(a.costoMax, Number(r.costoHora ?? 0))
    porUsuario.set(r.usuarioId, a)
  }

  const usuarios = await prisma.user.findMany({
    where: { id: { in: [...porUsuario.keys()] } },
    select: {
      id: true, name: true, email: true, role: true,
      empleado: {
        select: {
          activo: true, sueldoPlanilla: true, sueldoHonorarios: true,
          regimenLaboral: true, modalidadTrabajo: true, fechaIngreso: true, fechaCese: true,
          cargo: { select: { nombre: true } },
          departamento: { select: { nombre: true } },
        },
      },
    },
  })

  const filas = usuarios.map((u) => {
    const a = porUsuario.get(u.id)!
    const e = u.empleado
    return {
      persona: (u.name ?? u.email ?? '?').slice(0, 22),
      rol: u.role,
      horas: Math.round(a.horas),
      'S//h': a.costoMax.toFixed(2),
      '¿tiene Empleado?': e ? 'sí' : 'NO',
      activo: e ? (e.activo ? 'sí' : 'no') : '—',
      cargo: e?.cargo?.nombre?.slice(0, 20) ?? '—',
      planilla: e?.sueldoPlanilla ?? '',
      honorarios: e?.sueldoHonorarios ?? '',
      régimen: e?.regimenLaboral ?? '—',
    }
  }).sort((a, b) => Number(a['S//h']) - Number(b['S//h']))

  console.log('=== PERSONAS CON HORAS, ORDENADAS POR COSTO/HORA ===\n')
  console.table(filas)

  const sinCosto = filas.filter((f) => Number(f['S//h']) < 1)
  console.log(`\nSin costo por hora creíble: ${sinCosto.length}`)
  console.log(`  de ellas SIN registro de Empleado : ${sinCosto.filter((f) => f['¿tiene Empleado?'] === 'NO').length}`)
  console.log(`  de ellas CON Empleado pero sin sueldo: ${sinCosto.filter((f) => f['¿tiene Empleado?'] === 'sí' && !f.planilla && !f.honorarios).length}`)
  console.log(`  de ellas CON Empleado y con sueldo   : ${sinCosto.filter((f) => f['¿tiene Empleado?'] === 'sí' && (f.planilla || f.honorarios)).length}`)

  console.log('\n=== ¿DE DÓNDE SALE costoHora? Búsqueda del cálculo ===')
  const todos = await prisma.empleado.count()
  const conAlgunSueldo = await prisma.empleado.count({
    where: { OR: [{ sueldoPlanilla: { not: null } }, { sueldoHonorarios: { not: null } }] },
  })
  const activos = await prisma.empleado.count({ where: { activo: true } })
  const activosSinSueldo = await prisma.empleado.count({
    where: { activo: true, sueldoPlanilla: null, sueldoHonorarios: null },
  })
  console.log(`empleados: ${todos} · activos: ${activos} · con algún sueldo: ${conAlgunSueldo}`)
  console.log(`ACTIVOS SIN NINGÚN SUELDO CARGADO: ${activosSinSueldo}`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
