import { prisma } from '@/lib/prisma'

// ¿Hay datos para un reporte de horas directas vs indirectas por persona? Read-only.

const mesDe = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

async function main() {
  const desde = new Date(Date.UTC(2026, 2, 1)) // marzo 2026

  console.log('=== ¿Está poblado costoHora en RegistroHoras? ===')
  const total = await prisma.registroHoras.count({ where: { fechaTrabajo: { gte: desde } } })
  const conCosto = await prisma.registroHoras.count({
    where: { fechaTrabajo: { gte: desde }, costoHora: { not: null } },
  })
  console.log(`registros desde mar-2026: ${total} | con costoHora: ${conCosto} (${total ? Math.round((conCosto / total) * 100) : 0}%)`)

  console.log('\n=== ¿Qué orígenes hay? ===')
  const porOrigen = await prisma.registroHoras.groupBy({
    by: ['origen'], where: { fechaTrabajo: { gte: desde } },
    _count: { _all: true }, _sum: { horasTrabajadas: true },
  })
  console.table(porOrigen.map((o) => ({
    origen: o.origen ?? '(null)', registros: o._count._all, horas: Math.round(o._sum.horasTrabajadas ?? 0),
  })))

  // Horas por persona, separando proyecto de cliente vs interno
  const registros = await prisma.registroHoras.findMany({
    where: { fechaTrabajo: { gte: desde } },
    select: {
      usuarioId: true, fechaTrabajo: true, horasTrabajadas: true, costoHora: true,
      user: { select: { name: true } },
      proyecto: { select: { codigo: true, esInterno: true, centroCosto: { select: { nombre: true } } } },
    },
  })

  // También las horas de campo aún sin convertir a RegistroHoras
  const miembros = await prisma.registroHorasCampoMiembro.findMany({
    where: {
      registroHorasId: null,
      registroCampoTarea: { registroCampo: { estado: { not: 'iniciado' }, fechaTrabajo: { gte: desde } } },
    },
    select: {
      horas: true, usuarioId: true,
      usuario: { select: { name: true } },
      registroCampoTarea: {
        select: {
          registroCampo: {
            select: { fechaTrabajo: true, proyecto: { select: { codigo: true, esInterno: true } } },
          },
        },
      },
    },
  })
  console.log(`\nRegistroHoras: ${registros.length} | miembros de campo sin convertir: ${miembros.length}`)

  type P = { nombre: string; directo: number; indirecto: number; meses: Set<string>; proyectos: Set<string> }
  const gente = new Map<string, P>()
  const anota = (uid: string | null, nombre: string | null, horas: number, interno: boolean, fecha: Date, proy: string | null) => {
    if (!uid) return
    const p = gente.get(uid) ?? { nombre: nombre ?? '(sin nombre)', directo: 0, indirecto: 0, meses: new Set<string>(), proyectos: new Set<string>() }
    if (interno) p.indirecto += horas
    else p.directo += horas
    p.meses.add(mesDe(fecha))
    if (proy) p.proyectos.add(proy)
    gente.set(uid, p)
  }
  for (const r of registros) {
    anota(r.usuarioId, r.user?.name ?? null, Number(r.horasTrabajadas) || 0,
      r.proyecto?.esInterno ?? false, r.fechaTrabajo, r.proyecto?.codigo ?? null)
  }
  for (const m of miembros) {
    const j = m.registroCampoTarea.registroCampo
    anota(m.usuarioId, m.usuario?.name ?? null, m.horas || 0, j.proyecto?.esInterno ?? false, j.fechaTrabajo, j.proyecto?.codigo ?? null)
  }

  const filas = [...gente.values()]
    .map((p) => {
      const t = p.directo + p.indirecto
      return {
        persona: p.nombre.slice(0, 26),
        total: Math.round(t),
        directo: Math.round(p.directo),
        indirecto: Math.round(p.indirecto),
        '% directo': t > 0 ? `${Math.round((p.directo / t) * 100)}%` : '—',
        meses: p.meses.size,
        proyectos: p.proyectos.size,
      }
    })
    .sort((a, b) => b.total - a.total)

  console.log('\n=== HORAS POR PERSONA: DIRECTO (cliente) vs INDIRECTO (interno) ===')
  console.table(filas)

  const tD = filas.reduce((s, f) => s + f.directo, 0)
  const tI = filas.reduce((s, f) => s + f.indirecto, 0)
  console.log(`\nTOTAL: ${tD + tI} h · directo ${tD} (${Math.round((tD / (tD + tI)) * 100)}%) · indirecto ${tI} (${Math.round((tI / (tD + tI)) * 100)}%)`)
  console.log(`personas con horas: ${filas.length}`)

  console.log('\n=== ¿Hay costo por hora en Empleado? ===')
  const emp = await prisma.empleado.count()
  const conPlanilla = await prisma.empleado.count({ where: { sueldoPlanilla: { not: null } } })
  const conHonorarios = await prisma.empleado.count({ where: { sueldoHonorarios: { not: null } } })
  const activos = await prisma.empleado.count({ where: { activo: true } })
  console.log(`empleados: ${emp} (activos ${activos}) | con sueldoPlanilla: ${conPlanilla} | con sueldoHonorarios: ${conHonorarios}`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
