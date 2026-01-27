/**
 * API: Importación Automática de Cronograma
 *
 * POST /api/proyectos/[id]/cronograma/importar
 *
 * Esta API ejecuta la importación automática de un cronograma de 5 niveles
 * desde una cotización existente, creando EDTs, actividades y tareas.
 *
 * Proceso:
 * 1. Validar permisos y existencia de proyecto/cotización
 * 2. Crear cronograma base (tipo planificación)
 * 3. Crear fases por defecto
 * 4. Agrupar servicios según método seleccionado
 * 5. Crear EDTs con fechas calculadas
 * 6. Crear actividades y tareas
 * 7. Establecer dependencias básicas
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema de validación para la importación
const importSchema = z.object({
  cotizacionId: z.string().min(1, 'ID de cotización requerido'),
  metodo: z.enum(['categorias', 'servicios'], {
    errorMap: () => ({ message: 'Método debe ser "categorias" o "servicios"' })
  }),
  fechasAutomaticas: z.boolean().default(true),
  nombreCronograma: z.string().min(1, 'Nombre del cronograma requerido')
})

// Interfaces
interface ImportResult {
  cronogramaId: string
  fasesCreadas: number
  edtsCreados: number
  actividadesCreadas: number
  tareasCreadas: number
  tiempoEjecucion: number
}

interface ServicioInfo {
  id: string
  nombre: string
  categoria: string
  categoriaId?: string
  items: any[]
  horasTotales: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = importSchema.parse(body)

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
        cliente: true,
        comercial: true,
        gestor: true
      }
    })

    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Verificar permisos
    const userRole = session.user.role
    const isComercial = proyecto.comercialId === session.user.id
    const isGestor = proyecto.gestorId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || isComercial || isGestor

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para importar cronogramas' }, { status: 403 })
    }

    // Verificar que la cotización existe y pertenece al proyecto
    const cotizacion = await prisma.cotizacion.findFirst({
      where: {
        id: validatedData.cotizacionId,
        proyecto: {
          some: { id: proyectoId }
        }
      },
      include: {
        cotizacionServicio: {
          include: {
            cotizacionServicioItem: true
          }
        }
      }
    }) as any

    if (!cotizacion) {
      return NextResponse.json({
        error: 'Cotización no encontrada o no pertenece al proyecto'
      }, { status: 400 })
    }

    // Ejecutar importación en transacción
    const result = await prisma.$transaction(async (tx) => {
      return await ejecutarImportacion(tx, {
        proyectoId,
        cotizacion,
        config: validatedData
      })
    })

    const executionTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        tiempoEjecucion: executionTime
      },
      message: `Cronograma importado exitosamente en ${executionTime}ms`
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error en importación de cronograma:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Función principal de importación
async function ejecutarImportacion(
  tx: any,
  params: {
    proyectoId: string
    cotizacion: any
    config: z.infer<typeof importSchema>
  }
): Promise<ImportResult> {
  const { proyectoId, cotizacion, config } = params

  // 1. Crear cronograma base
  const cronograma = await tx.proyectoCronograma.create({
    data: {
      proyectoId,
      tipo: 'planificacion',
      nombre: config.nombreCronograma,
      copiadoDesdeCotizacionId: cotizacion.id,
      esBaseline: false
    }
  })

  // 2. Crear fases por defecto
   const fasesDefault = [
     { nombre: 'Planificación', orden: 1, duracionDias: 45 },
     { nombre: 'Ejecución', orden: 2, duracionDias: 120 },
     { nombre: 'Cierre', orden: 3, duracionDias: 30 }
   ]

  const fasesCreadas = []
  for (const faseData of fasesDefault) {
    const fase = await tx.proyectoFase.create({
      data: {
        proyectoId,
        proyectoCronogramaId: cronograma.id,
        nombre: faseData.nombre,
        orden: faseData.orden,
        descripcion: `Fase ${faseData.nombre} del proyecto`,
        estado: 'planificado',
        porcentajeAvance: 0
      }
    })
    fasesCreadas.push(fase)
  }

  // 3. Preparar servicios agrupados
  const serviciosInfo = prepararServicios(cotizacion.servicios, config.metodo)

  // 4. Crear EDTs
  const edtsCreados = []
  let ordenEdt = 1

  for (const servicioInfo of serviciosInfo) {
    const faseAsignada = asignarFasePorCategoria(servicioInfo.categoria, fasesCreadas)

    const edt = await tx.proyectoEdt.create({
      data: {
        proyectoId,
        proyectoCronogramaId: cronograma.id,
        proyectoFaseId: faseAsignada.id,
        nombre: servicioInfo.nombre,
        edtId: servicioInfo.categoriaId,
        estado: 'planificado',
        porcentajeAvance: 0,
        descripcion: `EDT generado automáticamente desde ${servicioInfo.nombre}`
      }
    })

    edtsCreados.push({ edt, servicioInfo, fase: faseAsignada })
    ordenEdt++
  }

  // 5. Crear actividades y tareas
  const { actividadesCreadas, tareasCreadas } = await crearActividadesYTareas(
    tx,
    edtsCreados,
    cronograma.id,
    config.fechasAutomaticas
  )

  return {
    cronogramaId: cronograma.id,
    fasesCreadas: fasesCreadas.length,
    edtsCreados: edtsCreados.length,
    actividadesCreadas,
    tareasCreadas,
    tiempoEjecucion: 0 // Se calcula fuera
  }
}

// Funciones auxiliares
function prepararServicios(servicios: any[], metodo: 'categorias' | 'servicios'): ServicioInfo[] {
  if (metodo === 'servicios') {
    return servicios.map(servicio => ({
      id: servicio.id,
      nombre: servicio.nombre,
      categoria: servicio.categoria || 'Sin Categoría',
      categoriaId: undefined, // No tenemos ID de categoría cuando usamos el campo directo
      items: servicio.items,
      horasTotales: servicio.items.reduce((sum: number, item: any) => sum + (item.horaTotal || 0), 0)
    }))
  } else {
    // Agrupar por categorías
    const categoriasMap = new Map<string, any[]>()

    servicios.forEach(servicio => {
      const categoria = servicio.categoria || 'Sin Categoría'
      if (!categoriasMap.has(categoria)) {
        categoriasMap.set(categoria, [])
      }
      categoriasMap.get(categoria)!.push(servicio)
    })

    return Array.from(categoriasMap.entries()).map(([categoria, serviciosCategoria]) => ({
      id: `categoria-${categoria}`,
      nombre: `EDT ${categoria}`,
      categoria,
      categoriaId: undefined, // No tenemos ID de categoría cuando usamos el campo directo
      items: serviciosCategoria.flatMap(s => s.items),
      horasTotales: serviciosCategoria.reduce((sum, s) =>
        sum + s.items.reduce((sum2: number, item: any) => sum2 + (item.horaTotal || 0), 0), 0
      )
    }))
  }
}

function asignarFasePorCategoria(categoria: string, fases: any[]) {
  // Lógica simple de asignación por categoría
  const categoriaLower = categoria.toLowerCase()

  if (categoriaLower.includes('planif') || categoriaLower.includes('levantamiento')) {
    return fases.find(f => f.nombre === 'Planificación') || fases[0]
  } else if (categoriaLower.includes('cierre') || categoriaLower.includes('prueba')) {
    return fases.find(f => f.nombre === 'Cierre') || fases[2]
  } else {
    return fases.find(f => f.nombre === 'Ejecución') || fases[1]
  }
}



async function crearActividadesYTareas(
  tx: any,
  edtsCreados: any[],
  cronogramaId: string,
  fechasAutomaticas: boolean
): Promise<{ actividadesCreadas: number; tareasCreadas: number }> {
  let actividadesCreadas = 0
  let tareasCreadas = 0

  for (const { edt, servicioInfo, fase } of edtsCreados) {
    // Crear actividad principal
    const actividad = await tx.proyectoActividad.create({
      data: {
        proyectoEdtId: edt.id,
        proyectoCronogramaId: cronogramaId,
        nombre: `Actividad Principal - ${servicioInfo.nombre}`,
        descripcion: `Actividad generada automáticamente para ${servicioInfo.nombre}`,
        estado: 'pendiente',
        porcentajeAvance: 0,
        prioridad: 'media',
        horasPlan: servicioInfo.horasTotales,
        horasReales: 0
      }
    })

    actividadesCreadas++

    // Crear tareas desde los ítems del servicio
    for (const item of servicioInfo.items) {
      const horasTarea = item.horaTotal || 1

      await tx.proyectoTarea.create({
        data: {
          proyectoEdtId: edt.id,
          proyectoCronogramaId: cronogramaId,
          proyectoActividadId: actividad.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          horasEstimadas: horasTarea,
          horasReales: 0,
          estado: 'pendiente',
          porcentajeCompletado: 0,
          prioridad: 'media'
        }
      })

      tareasCreadas++
    }
  }

  return { actividadesCreadas, tareasCreadas }
}