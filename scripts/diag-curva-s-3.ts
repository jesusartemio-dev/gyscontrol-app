import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const cronos = await prisma.proyectoCronograma.findMany({
    where: { tipo: 'ejecucion' },
    select: { id: true, proyecto: { select: { codigo: true, estado: true } } },
  })
  const filas = []
  for (const c of cronos) {
    const tareas = await prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: c.id },
      select: { horasEstimadas: true, porcentajeCompletado: true, proyectoEdt: { select: { proyectoFaseId: true } } },
    })
    const sinFase = tareas.filter(t => !t.proyectoEdt?.proyectoFaseId).length
    const horasCero = tareas.filter(t => Number(t.horasEstimadas ?? 0) === 0).length
    const invisibles = tareas.filter(t => Number(t.horasEstimadas ?? 0) === 0 && t.porcentajeCompletado > 0).length
    if (tareas.length === 0) continue
    filas.push({
      proy: c.proyecto.codigo, estado: c.proyecto.estado, tareas: tareas.length,
      sinFase, horas0: horasCero, 'avance invisible (h=0 y %>0)': invisibles,
    })
  }
  console.log('=== TAREAS QUE NO ENTRAN EN EL AVANCE PONDERADO (cronograma de ejecución) ===')
  console.table(filas)

  const conPeso = await prisma.proyectoFase.findMany({
    where: { pesoManual: { not: null } },
    select: { nombre: true, pesoManual: true, proyectoCronograma: { select: { tipo: true, proyecto: { select: { codigo: true } } } } },
  })
  console.log('\n=== FASES CON pesoManual ===')
  console.table(conPeso.map(f => ({
    proy: f.proyectoCronograma.proyecto.codigo, crono: f.proyectoCronograma.tipo,
    fase: f.nombre, pesoManual: f.pesoManual,
  })))
}

main().finally(() => prisma.$disconnect())
