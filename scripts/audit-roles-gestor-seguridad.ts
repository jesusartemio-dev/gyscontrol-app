import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('DB:', process.env.DATABASE_URL?.slice(0, 40))

  const recs = await (prisma as any).roleSectionAccess.findMany({
    where: { role: { in: ['gestor', 'seguridad', 'proyectos', 'coordinador'] } },
    orderBy: [{ role: 'asc' }, { sectionKey: 'asc' }],
  })

  const byRole: Record<string, { on: string[]; off: string[] }> = {}
  for (const r of recs) {
    byRole[r.role] ??= { on: [], off: [] }
    ;(r.hasAccess ? byRole[r.role].on : byRole[r.role].off).push(r.sectionKey)
  }
  console.log('\n=== role_section_access (BD) ===')
  for (const [role, v] of Object.entries(byRole)) {
    console.log(`\n[${role}]`)
    console.log('  SI:', v.on.join(', ') || '(ninguna)')
    console.log('  NO:', v.off.join(', ') || '(ninguna)')
  }

  console.log('\n=== Usuarios por rol ===')
  const users = await prisma.user.findMany({
    where: { role: { in: ['gestor', 'seguridad'] } as any },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
  for (const u of users) console.log(`  ${u.role.padEnd(10)} | ${u.name} | ${u.email}`)

  console.log('\n=== Busqueda Yony / Claous / Marrujo / Apaza ===')
  const target = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Yony', mode: 'insensitive' } },
        { name: { contains: 'Apaza', mode: 'insensitive' } },
        { name: { contains: 'Claous', mode: 'insensitive' } },
        { name: { contains: 'Marrujo', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true, role: true },
  })
  for (const u of target) console.log(`  ${u.role.padEnd(10)} | ${u.name} | ${u.email} | ${u.id}`)

  // Ver si esos usuarios son gestor de algun proyecto (bloquearia el cambio de rol)
  console.log('\n=== Proyectos donde son gestor/supervisor/lider/comercial ===')
  for (const u of target) {
    const p = await prisma.proyecto.findMany({
      where: {
        OR: [
          { gestorId: u.id },
          { supervisorId: u.id },
          { liderId: u.id },
          { comercialId: u.id },
        ],
      },
      select: { codigo: true, nombre: true, gestorId: true, supervisorId: true, liderId: true, estado: true },
    })
    console.log(`  ${u.name}: ${p.length} proyecto(s)`)
    for (const x of p) {
      const roles = [
        x.gestorId === u.id ? 'gestor' : null,
        x.supervisorId === u.id ? 'supervisor' : null,
        x.liderId === u.id ? 'lider' : null,
      ].filter(Boolean).join('+')
      console.log(`     - ${x.codigo} (${x.estado}) como ${roles}`)
    }
  }

  // Actividad de seguridad de esos usuarios
  console.log('\n=== Actividad de seguridad (registros / evidencias / reportes) ===')
  for (const u of target) {
    const [regs, evid, reps] = await Promise.all([
      (prisma as any).registroSeguridad.count({ where: { ingenieroId: u.id } }),
      (prisma as any).evidenciaSeguridad.count({ where: { creadoPorId: u.id } }),
      (prisma as any).reporteSemanalSeguridad.count({ where: { ingenieroId: u.id } }),
    ])
    console.log(`  ${u.name}: registros=${regs} evidencias=${evid} reportesSemanales=${reps}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
