import { prisma } from '@/lib/prisma'
import { hh } from '@/lib/services/horasHombre'

// ¿El flag esExtra y el marcador [EXTRA] de la descripción coinciden?
// ¿Cuánto peso tienen las extras en el avance que hoy sí las cuenta? Read-only.

async function main() {
  const cronos = await prisma.proyectoCronograma.findMany({
    where: { tipo: 'ejecucion' },
    select: { id: true, proyecto: { select: { codigo: true } } },
  })

  let total = 0, soloFlag = 0, soloDesc = 0, ambos = 0
  const porProyecto: Record<string, { extras: number; hhExtra: number; hhTotal: number; hReales: number }> = {}

  for (const c of cronos) {
    const tareas = await prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: c.id },
      select: {
        esExtra: true, descripcion: true, horasEstimadas: true, personasEstimadas: true,
        horasReales: true, proyectoEdt: { select: { proyectoFaseId: true } },
      },
    })
    const cod = c.proyecto.codigo
    const acc = porProyecto[cod] ?? { extras: 0, hhExtra: 0, hhTotal: 0, hReales: 0 }
    for (const t of tareas) {
      total++
      const marcada = t.descripcion?.startsWith('[EXTRA]') ?? false
      if (t.esExtra && marcada) ambos++
      else if (t.esExtra) soloFlag++
      else if (marcada) soloDesc++

      const cuenta = !!t.proyectoEdt?.proyectoFaseId
      if (cuenta) acc.hhTotal += hh(t)
      if (t.esExtra || marcada) {
        acc.extras++
        acc.hReales += Number(t.horasReales ?? 0)
        if (cuenta) acc.hhExtra += hh(t)
      }
    }
    porProyecto[cod] = acc
  }

  console.log('=== FLAG esExtra vs MARCADOR [EXTRA] EN LA DESCRIPCIÓN ===\n')
  console.log(`tareas de ejecución : ${total}`)
  console.log(`marcadas de las dos formas : ${ambos}`)
  console.log(`solo con el flag esExtra   : ${soloFlag}`)
  console.log(`solo con [EXTRA] en la descripción : ${soloDesc}   <-- el flag quedó en false`)
  console.log(`total consideradas extra   : ${ambos + soloFlag + soloDesc}`)

  console.log('\n=== PESO DE LAS EXTRAS EN EL AVANCE (solo las que cuelgan de una fase) ===\n')
  console.table(
    Object.entries(porProyecto)
      .filter(([, v]) => v.extras > 0)
      .sort((a, b) => (b[1].hhTotal > 0 ? b[1].hhExtra / b[1].hhTotal : 0) - (a[1].hhTotal > 0 ? a[1].hhExtra / a[1].hhTotal : 0))
      .map(([cod, v]) => ({
        proyecto: cod,
        extras: v.extras,
        'hh extras': Math.round(v.hhExtra),
        'hh total': Math.round(v.hhTotal),
        'peso en la curva': v.hhTotal > 0 ? `${((v.hhExtra / v.hhTotal) * 100).toFixed(1)}%` : '0% (sin fase)',
        'horas reales': Math.round(v.hReales),
      })),
  )
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
