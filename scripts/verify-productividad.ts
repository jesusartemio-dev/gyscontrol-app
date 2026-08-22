import { prisma } from '@/lib/prisma'

// Reproduce GET /api/gestion/productividad-personal. Read-only.

const mesDe = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

async function main() {
  // arg numérico >= 2020 = año calendario; si no, número de meses de ventana móvil
  const arg = Number(process.argv[2]) || 6
  const hoy = new Date()
  const esAnio = arg >= 2020
  const meses: string[] = []
  let desde: Date, hasta: Date
  if (esAnio) {
    const ultimo = arg === hoy.getUTCFullYear() ? hoy.getUTCMonth() : 11
    desde = new Date(Date.UTC(arg, 0, 1))
    hasta = new Date(Date.UTC(arg, ultimo + 1, 1))
    for (let m = 0; m <= ultimo; m++) meses.push(mesDe(new Date(Date.UTC(arg, m, 1))))
  } else {
    desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - (arg - 1), 1))
    hasta = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 1))
    for (let i = arg - 1; i >= 0; i--) {
      meses.push(mesDe(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1))))
    }
  }
  console.log(esAnio ? `AÑO ${arg}` : `ventana móvil de ${arg} meses`)

  const registros = await prisma.registroHoras.findMany({
    where: { fechaTrabajo: { gte: desde, lt: hasta } },
    select: {
      usuarioId: true, fechaTrabajo: true, horasTrabajadas: true, costoHora: true,
      user: { select: { id: true, name: true } },
      proyecto: { select: { codigo: true, esInterno: true } },
    },
  })
  const miembros = await prisma.registroHorasCampoMiembro.findMany({
    where: {
      registroHorasId: null,
      registroCampoTarea: { registroCampo: { estado: { not: 'iniciado' }, fechaTrabajo: { gte: desde } } },
    },
    select: {
      horas: true, usuario: { select: { id: true, name: true } },
      registroCampoTarea: {
        select: { registroCampo: { select: { fechaTrabajo: true, proyecto: { select: { codigo: true, esInterno: true } } } } },
      },
    },
  })

  const g = new Map<string, {
    nombre: string; directo: number; indirecto: number
    cDirecto: number; cIndirecto: number; sinCosto: number
    porMes: Map<string, { d: number; i: number }>
  }>()
  const anota = (u: { id: string; name: string | null } | null, f: Date, hrs: number, ch: number | null, interno: boolean) => {
    if (!u?.id || hrs <= 0) return
    const p = g.get(u.id) ?? {
      nombre: u.name ?? '(sin nombre)', directo: 0, indirecto: 0,
      cDirecto: 0, cIndirecto: 0, sinCosto: 0, porMes: new Map<string, { d: number; i: number }>(),
    }
    const costo = ch != null ? hrs * ch : 0
    if (interno) { p.indirecto += hrs; p.cIndirecto += costo } else { p.directo += hrs; p.cDirecto += costo }
    if (ch == null) p.sinCosto += hrs
    const m = mesDe(f)
    const mm = p.porMes.get(m) ?? { d: 0, i: 0 }
    if (interno) mm.i += hrs; else mm.d += hrs
    p.porMes.set(m, mm)
    g.set(u.id, p)
  }
  for (const r of registros) {
    anota(r.user, r.fechaTrabajo, Number(r.horasTrabajadas) || 0,
      r.costoHora == null ? null : Number(r.costoHora), r.proyecto?.esInterno ?? false)
  }
  for (const m of miembros) {
    const j = m.registroCampoTarea.registroCampo
    anota(m.usuario, j.fechaTrabajo, m.horas || 0, null, j.proyecto?.esInterno ?? false)
  }

  const filas = [...g.values()].map((p) => {
    const t = p.directo + p.indirecto
    const fila: Record<string, unknown> = {
      persona: p.nombre.slice(0, 24),
      total: Math.round(t),
      '% dir': t > 0 ? `${Math.round((p.directo / t) * 100)}%` : '—',
      '% ind': t > 0 ? `${Math.round((p.indirecto / t) * 100)}%` : '—',
      'S/ directo': Math.round(p.cDirecto),
      'S/ indirecto': Math.round(p.cIndirecto),
    }
    for (const m of meses) {
      const v = p.porMes.get(m)
      const tt = v ? v.d + v.i : 0
      fila[m.slice(2)] = tt > 0 ? `${Math.round((v!.d / tt) * 100)}%` : ''
    }
    return fila
  }).sort((a, b) => (b.total as number) - (a.total as number))

  console.log(`meses: ${meses.join(', ')}\n`)
  console.table(filas)

  const tD = [...g.values()].reduce((s, p) => s + p.directo, 0)
  const tI = [...g.values()].reduce((s, p) => s + p.indirecto, 0)
  const cD = [...g.values()].reduce((s, p) => s + p.cDirecto, 0)
  const cI = [...g.values()].reduce((s, p) => s + p.cIndirecto, 0)
  const sc = [...g.values()].reduce((s, p) => s + p.sinCosto, 0)
  console.log(`\nTOTAL ${Math.round(tD + tI)} h · directo ${Math.round((tD / (tD + tI)) * 100)}%`)
  console.log(`Costo directo S/ ${Math.round(cD).toLocaleString('es-PE')} · indirecto S/ ${Math.round(cI).toLocaleString('es-PE')}`)
  console.log(`Horas sin costoHora (jornadas sin aprobar): ${Math.round(sc)}`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
