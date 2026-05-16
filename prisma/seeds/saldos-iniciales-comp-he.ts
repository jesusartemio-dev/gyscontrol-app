/**
 * Carga saldos iniciales de COMP_HE (en HORAS) desde el Excel del coordinador.
 *
 * Uso:
 *   tsx prisma/seeds/saldos-iniciales-comp-he.ts --dry-run   → solo muestra matches
 *   tsx prisma/seeds/saldos-iniciales-comp-he.ts             → escribe en DB
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Horas acumuladas según Excel del coordinador de construcción (positivo = crédito, negativo = deuda)
const SALDOS_INICIALES = [
  { codigo: 'TitoA',     horas:   8 },
  { codigo: 'JhonatanM', horas: -29 },
  { codigo: 'AngelP',    horas:  -1 },
  { codigo: 'NelsonLl',  horas: -84 },
  { codigo: 'AntonyV',   horas: -60 },
  { codigo: 'RolyS',     horas: -61.5 },
  { codigo: 'BenjaminA', horas:   4 },
]

type EmpleadoConUser = {
  userId: string
  user: { id: string; name: string | null }
}

/**
 * Parsea un código corto como "TitoA" → { primerNombre: 'TITO', apellidoInicio: 'A' }
 * Formato: CamelCase con nombre completo + inicial(es) del apellido en mayúscula.
 */
function parsearCodigo(codigo: string): { primerNombre: string; apellidoInicio: string } | null {
  const match = codigo.match(/^([A-Z][a-z]+)([A-Z][a-z]*)$/)
  if (!match) return null
  return { primerNombre: match[1].toUpperCase(), apellidoInicio: match[2].toUpperCase() }
}

function buscarEmpleado(
  empleados: EmpleadoConUser[],
  codigo: string,
): { empleado: EmpleadoConUser; ambiguo: false } | { empleado: null; ambiguo: boolean; candidatos?: string[] } {
  const parsed = parsearCodigo(codigo)
  if (!parsed) return { empleado: null, ambiguo: false }

  const candidatos = empleados.filter((e) => {
    const partes = (e.user.name ?? '').toUpperCase().split(/\s+/).filter(Boolean)
    return (
      partes[0] === parsed.primerNombre &&
      partes.slice(1).some((p) => p.startsWith(parsed.apellidoInicio))
    )
  })

  if (candidatos.length === 1) return { empleado: candidatos[0], ambiguo: false }
  if (candidatos.length > 1)
    return { empleado: null, ambiguo: true, candidatos: candidatos.map((c) => c.user.name ?? c.userId) }
  return { empleado: null, ambiguo: false }
}

async function main() {
  if (DRY_RUN) {
    console.log('🔍 DRY-RUN — Validando matches de empleados (sin escribir en DB)\n')
  } else {
    console.log('🌱 Cargando saldos iniciales COMP_HE...\n')
  }

  const tipoCompHE = await prisma.tipoAusencia.findUnique({ where: { codigo: 'COMP_HE' } })
  if (!tipoCompHE) throw new Error('COMP_HE no encontrado. Ejecutar tipos-ausencia.ts primero.')
  if (!tipoCompHE.activo && !DRY_RUN) throw new Error('COMP_HE está inactivo. Ejecutar activar-comp-he.ts primero.')

  const empleados = await prisma.empleado.findMany({
    where: { activo: true },
    include: { user: { select: { id: true, name: true } } },
  })

  // Buscar JESUS MAMANI como responsable de RRHH; fallback al primer admin disponible
  const adminUser =
    (await prisma.user.findFirst({
      where: { email: 'jesus.m@gyscontrol.com' },
      select: { id: true, name: true, email: true, role: true },
    })) ??
    (await prisma.user.findFirst({
      where: { role: { in: ['administracion', 'admin'] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, role: true },
    }))

  if (!adminUser) {
    throw new Error('No hay usuario admin disponible para atribuir los movimientos iniciales.')
  }

  console.log(`📝 Movimientos atribuidos a: ${adminUser.name} (${adminUser.email})\n`)

  const anioActual = new Date().getFullYear()
  let creados = 0
  let saltados = 0
  let errores = 0

  console.log('Código         → Empleado encontrado                 Horas')
  console.log('─'.repeat(65))

  for (const entrada of SALDOS_INICIALES) {
    const resultado = buscarEmpleado(empleados, entrada.codigo)

    if (!resultado.empleado) {
      if (resultado.ambiguo) {
        console.log(`⚠️  ${entrada.codigo.padEnd(14)} → AMBIGUO: ${resultado.candidatos?.join(', ')}`)
      } else {
        console.log(`❌  ${entrada.codigo.padEnd(14)} → NO ENCONTRADO`)
      }
      errores++
      continue
    }

    const nombreCompleto = resultado.empleado.user.name ?? resultado.empleado.userId
    const signo = entrada.horas >= 0 ? '+' : ''
    console.log(`✅  ${entrada.codigo.padEnd(14)} → ${nombreCompleto.padEnd(35)} ${signo}${entrada.horas}h`)

    if (DRY_RUN) continue

    // Verificar si ya existe saldo para este empleado+tipo+año
    const saldoExistente = await prisma.saldoAusencia.findUnique({
      where: {
        userId_tipoAusenciaId_anio: {
          userId: resultado.empleado.userId,
          tipoAusenciaId: tipoCompHE.id,
          anio: anioActual,
        },
      },
    })

    if (saldoExistente) {
      console.log(`   ↳ Ya existe saldo — saltando`)
      saltados++
      continue
    }

    await prisma.$transaction(async (tx) => {
      const nuevoSaldo = await tx.saldoAusencia.create({
        data: {
          userId: resultado.empleado!.userId,
          tipoAusenciaId: tipoCompHE.id,
          anio: anioActual,
          diasAsignados: entrada.horas,
          diasGozados: 0,
          diasPendientes: 0,
          diasDisponibles: entrada.horas,
          updatedAt: new Date(),
        },
      })

      await tx.movimientoSaldoAusencia.create({
        data: {
          saldoId: nuevoSaldo.id,
          tipo: 'asignacion_anual',
          dias: entrada.horas,
          motivo: `Carga inicial desde Excel del coordinador de construcción - año ${anioActual}`,
          creadoPorId: adminUser.id,
        },
      })
    })

    creados++
  }

  console.log()
  if (DRY_RUN) {
    const ok = SALDOS_INICIALES.length - errores
    console.log(`🔍 Dry-run completo: ${ok}/${SALDOS_INICIALES.length} matches válidos, ${errores} con problema`)
    if (errores === 0) {
      console.log('   → Todos los matches son correctos. Ejecutar sin --dry-run para aplicar.')
    }
  } else {
    console.log(`✅ SaldoAusencia COMP_HE: ${creados} creados, ${saltados} ya existían, ${errores} errores`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
