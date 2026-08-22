import { prisma } from '@/lib/prisma'
import { diagnosticarPreparacion } from '@/lib/services/preparacionCronograma'

// ¿Qué tipos de proyecto hay y cuáles son en realidad centros de costo? Read-only.

async function main() {
  const proyectos = await prisma.proyecto.findMany({
    select: {
      id: true, codigo: true, nombre: true, estado: true, esInterno: true,
      clienteId: true,
      centroCosto: { select: { nombre: true, tipo: true, activo: true } },
      cliente: { select: { nombre: true } },
    },
    orderBy: [{ esInterno: 'desc' }, { codigo: 'asc' }],
  })

  const filas = []
  for (const p of proyectos) {
    const prep = await diagnosticarPreparacion(p.id)
    filas.push({
      proyecto: p.codigo,
      tipo: p.esInterno ? 'INTERNO' : 'cliente',
      centroCosto: p.centroCosto ? `${p.centroCosto.nombre} (${p.centroCosto.tipo})` : '—',
      cliente: p.cliente?.nombre?.slice(0, 22) ?? '—',
      estado: p.estado,
      preparacion: prep.estado,
      'sale "sin armar"': prep.listo ? '' : 'sí',
    })
  }
  console.log('=== TIPOS DE PROYECTO ===\n')
  console.table(filas)

  const internos = filas.filter((f) => f.tipo === 'INTERNO')
  const sinArmar = filas.filter((f) => f['sale "sin armar"'] === 'sí')
  const sinArmarNoInternos = sinArmar.filter((f) => f.tipo !== 'INTERNO')

  console.log(`\nproyectos: ${filas.length}  |  internos: ${internos.length}  |  de cliente: ${filas.length - internos.length}`)
  console.log(`salen como "sin armar": ${sinArmar.length}`)
  console.log(`  de ellos internos    : ${sinArmar.length - sinArmarNoInternos.length}`)
  console.log(`  de ellos de CLIENTE  : ${sinArmarNoInternos.length}${sinArmarNoInternos.length ? ' → ' + sinArmarNoInternos.map((f) => f.proyecto).join(', ') : ''}`)

  const internosArmados = internos.filter((f) => f['sale "sin armar"'] !== 'sí')
  console.log(`internos que SÍ tienen cronograma armado: ${internosArmados.length}${internosArmados.length ? ' → ' + internosArmados.map((f) => f.proyecto).join(', ') : ''}`)

  console.log('\n=== CENTROS DE COSTO ===')
  const ccs = await prisma.centroCosto.findMany({
    select: { nombre: true, tipo: true, activo: true, _count: { select: { proyectosInternos: true } } },
    orderBy: { nombre: 'asc' },
  })
  console.table(ccs.map((c) => ({
    centroCosto: c.nombre, tipo: c.tipo, activo: c.activo ? 'sí' : 'no',
    'proyectos internos': c._count.proyectosInternos,
  })))
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
