// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/route.ts
// 🔧 Descripción: API para gestión de cronogramas de proyecto
// 🎯 Funcionalidades: CRUD de tipos de cronograma
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ✅ Schema de validación para crear cronograma
const createCronogramaSchema = z.object({
  tipo: z.enum(['comercial', 'planificacion', 'ejecucion']),
  nombre: z.string().min(1, 'El nombre es requerido'),
  copiadoDesdeCotizacionId: z.string().optional(),
  copiarDesdeId: z.string().optional(), // ID de cronograma origen para copiar
  esBaseline: z.boolean().optional().default(false), // ✅ Agregar campo esBaseline
})

// ✅ GET /api/proyectos/[id]/cronograma - Obtener cronogramas del proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Obtener todos los cronogramas del proyecto
    const cronogramas = await prisma.proyectoCronograma.findMany({
      where: { proyectoId: id },
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json({
      success: true,
      data: cronogramas
    })

  } catch (error) {
    console.error('Error al obtener cronogramas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/proyectos/[id]/cronograma - Crear nuevo tipo de cronograma
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const body = await request.json()

    // ✅ Validar datos de entrada
    const validatedData = createCronogramaSchema.parse(body)

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Validar límites por tipo de cronograma
    if (validatedData.tipo === 'planificacion') {
      const existingPlanificacion = await prisma.proyectoCronograma.count({
        where: {
          proyectoId: id,
          tipo: 'planificacion'
        }
      })
      if (existingPlanificacion > 0) {
        return NextResponse.json(
          { error: 'Ya existe un cronograma de planificación para este proyecto' },
          { status: 400 }
        )
      }
    }

    if (validatedData.tipo === 'ejecucion') {
      // Verificar que existe un baseline antes de crear ejecución
      const baselineExists = await prisma.proyectoCronograma.findFirst({
        where: {
          proyectoId: id,
          esBaseline: true
        }
      })
      if (!baselineExists) {
        return NextResponse.json(
          { error: 'Debe existir un cronograma de planificación marcado como baseline antes de crear uno de ejecución' },
          { status: 400 }
        )
      }

      const existingEjecucion = await prisma.proyectoCronograma.count({
        where: {
          proyectoId: id,
          tipo: 'ejecucion'
        }
      })
      if (existingEjecucion > 0) {
        return NextResponse.json(
          { error: 'Ya existe un cronograma de ejecución para este proyecto' },
          { status: 400 }
        )
      }
    }

    // ✅ Si es una copia de otro cronograma, copiar toda la estructura
    if (validatedData.copiarDesdeId) {

      // Verificar que el cronograma origen existe
      const cronogramaOrigen = await prisma.proyectoCronograma.findUnique({
        where: { id: validatedData.copiarDesdeId },
        include: {
          fases: {
            include: {
              edts: {
                include: {
                  proyecto_actividad: {
                    include: {
                      proyecto_tarea: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!cronogramaOrigen) {
        return NextResponse.json(
          { error: 'Cronograma origen no encontrado' },
          { status: 404 }
        )
      }

      console.log('Copiando cronograma desde:', cronogramaOrigen.nombre, 'con', cronogramaOrigen.fases.length, 'fases')

      // Log detallado de la estructura
      console.log('Estructura del cronograma origen:', {
        fases: cronogramaOrigen.fases.length,
        edts: cronogramaOrigen.fases.reduce((acc, f) => acc + f.edts.length, 0),
        actividades: cronogramaOrigen.fases.reduce((acc, f) => acc + f.edts.reduce((acc2, e) => acc2 + e.proyecto_actividad.length, 0), 0),
        tareas: cronogramaOrigen.fases.reduce((acc, f) => acc + f.edts.reduce((acc2, e) => acc2 + e.proyecto_actividad.reduce((acc3, a) => acc3 + a.proyecto_tarea.length, 0), 0), 0)
      })

      // Crear el nuevo cronograma
      const nuevoCronograma = await prisma.proyectoCronograma.create({
        data: {
          proyectoId: id,
          tipo: validatedData.tipo,
          nombre: validatedData.nombre,
          copiadoDesdeCotizacionId: validatedData.copiadoDesdeCotizacionId,
          esBaseline: false,
          version: 1
        }
      })

      // Copiar toda la estructura jerárquica
      let fasesCopiadas = 0
      let edtsCopiados = 0
      let actividadesCopiadas = 0
      let tareasCopiadas = 0

      try {
        for (const faseOrigen of cronogramaOrigen.fases) {
          console.log('Creando fase:', faseOrigen.nombre)

          const nuevaFase = await prisma.proyectoFase.create({
            data: {
              proyectoId: id,
              proyectoCronogramaId: nuevoCronograma.id,
              nombre: faseOrigen.nombre,
              descripcion: faseOrigen.descripcion,
              orden: faseOrigen.orden,
              fechaInicioPlan: faseOrigen.fechaInicioPlan,
              fechaFinPlan: faseOrigen.fechaFinPlan,
              estado: faseOrigen.estado
            }
          })
          fasesCopiadas++
          console.log('Fase creada:', nuevaFase.id)

          for (const edtOrigen of faseOrigen.edts) {
            console.log('Creando EDT:', edtOrigen.nombre)

            const nuevoEdt = await prisma.proyectoEdt.create({
              data: {
                proyectoId: id,
                proyectoFaseId: nuevaFase.id,
                proyectoCronogramaId: nuevoCronograma.id,
                nombre: edtOrigen.nombre,
                descripcion: edtOrigen.descripcion,
                categoriaServicioId: edtOrigen.categoriaServicioId,
                fechaInicioPlan: edtOrigen.fechaInicioPlan,
                fechaFinPlan: edtOrigen.fechaFinPlan,
                horasPlan: edtOrigen.horasPlan,
                prioridad: edtOrigen.prioridad,
                orden: edtOrigen.orden,
                estado: edtOrigen.estado
              }
            })
            edtsCopiados++
            console.log('EDT creado:', nuevoEdt.id)

            for (const actividadOrigen of edtOrigen.proyecto_actividad) {
              console.log('Creando actividad:', actividadOrigen.nombre)

              const nuevaActividad = await prisma.$queryRaw`
                INSERT INTO "proyecto_actividad" (
                  "id",
                  "proyectoEdtId",
                  "proyectoCronogramaId",
                  "nombre",
                  "descripcion",
                  "fechaInicioPlan",
                  "fechaFinPlan",
                  "horasPlan",
                  "prioridad",
                  "orden",
                  "estado",
                  "createdAt",
                  "updatedAt"
                ) VALUES (
                  gen_random_uuid(),
                  ${nuevoEdt.id},
                  ${nuevoCronograma.id},
                  ${actividadOrigen.nombre},
                  ${actividadOrigen.descripcion},
                  ${actividadOrigen.fechaInicioPlan},
                  ${actividadOrigen.fechaFinPlan},
                  ${actividadOrigen.horasPlan},
                  ${actividadOrigen.prioridad}::"PrioridadEdt",
                  ${actividadOrigen.orden},
                  ${actividadOrigen.estado}::"EstadoActividad",
                  NOW(),
                  NOW()
                )
                RETURNING "id"
              ` as any

              const actividadId = nuevaActividad[0].id
              actividadesCopiadas++
              console.log('Actividad creada:', nuevaActividad.id)

              for (const tareaOrigen of actividadOrigen.proyecto_tarea) {
                console.log('Creando tarea:', tareaOrigen.nombre)

                await prisma.$queryRaw`
                  INSERT INTO "proyecto_tarea" (
                    "id",
                    "proyectoActividadId",
                    "proyectoCronogramaId",
                    "proyectoEdtId",
                    "nombre",
                    "descripcion",
                    "fechaInicio",
                    "fechaFin",
                    "horasEstimadas",
                    "prioridad",
                    "orden",
                    "estado",
                    "createdAt",
                    "updatedAt"
                  ) VALUES (
                    gen_random_uuid(),
                    ${actividadId},
                    ${nuevoCronograma.id},
                    ${nuevoEdt.id},
                    ${tareaOrigen.nombre},
                    ${tareaOrigen.descripcion},
                    ${tareaOrigen.fechaInicio},
                    ${tareaOrigen.fechaFin},
                    ${tareaOrigen.horasEstimadas},
                    ${tareaOrigen.prioridad}::"PrioridadTarea",
                    ${tareaOrigen.orden},
                    ${tareaOrigen.estado}::"EstadoTarea",
                    NOW(),
                    NOW()
                  )
                `
                tareasCopiadas++
              }
            }
          }
        }
      } catch (copyError) {
        console.error('Error durante la copia:', copyError)
        throw new Error(`Error copiando estructura: ${copyError instanceof Error ? copyError.message : 'Error desconocido'}`)
      }

      console.log('Copia completada:', {
        fases: fasesCopiadas,
        edts: edtsCopiados,
        actividades: actividadesCopiadas,
        tareas: tareasCopiadas
      })

      return NextResponse.json({
        success: true,
        data: nuevoCronograma,
        message: `Cronograma copiado exitosamente (${fasesCopiadas} fases, ${edtsCopiados} EDTs, ${actividadesCopiadas} actividades, ${tareasCopiadas} tareas)`
      }, { status: 201 })
    }

    // ✅ Determinar si debe ser baseline
    let esBaseline = false
    if (validatedData.tipo === 'planificacion') {
      // Si es el primer cronograma de planificación, marcarlo como baseline automáticamente
      const existingPlanificacion = await prisma.proyectoCronograma.count({
        where: {
          proyectoId: id,
          tipo: 'planificacion'
        }
      })
      esBaseline = existingPlanificacion === 0 // Solo el primero es baseline
    }

    // ✅ Crear el cronograma
    const cronograma = await prisma.proyectoCronograma.create({
      data: {
        proyectoId: id,
        tipo: validatedData.tipo,
        nombre: validatedData.nombre,
        copiadoDesdeCotizacionId: validatedData.copiadoDesdeCotizacionId,
        esBaseline: esBaseline,
        version: 1
      }
    })

    return NextResponse.json({
      success: true,
      data: cronograma
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al crear cronograma:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// ✅ DELETE /api/proyectos/[id]/cronograma/[cronogramaId] - Eliminar cronograma
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const cronogramaId = searchParams.get('cronogramaId')

    if (!cronogramaId) {
      return NextResponse.json(
        { error: 'ID del cronograma es requerido' },
        { status: 400 }
      )
    }

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Validar que el cronograma existe y pertenece al proyecto
    const cronograma = await prisma.proyectoCronograma.findFirst({
      where: {
        id: cronogramaId,
        proyectoId: id
      }
    })

    if (!cronograma) {
      return NextResponse.json(
        { error: 'Cronograma no encontrado o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    // ✅ No permitir eliminar el cronograma baseline
    if (cronograma.esBaseline) {
      return NextResponse.json(
        { error: 'No se puede eliminar el cronograma baseline. Es el cronograma de planificación activo.' },
        { status: 400 }
      )
    }

    // ✅ No permitir eliminar cronogramas comerciales (son de solo lectura)
    if (cronograma.tipo === 'comercial') {
      return NextResponse.json(
        { error: 'No se puede eliminar el cronograma comercial. Los cronogramas comerciales son de solo lectura.' },
        { status: 400 }
      )
    }

    // ✅ No permitir eliminar cronogramas de ejecución si no hay otro baseline
    if (cronograma.tipo === 'ejecucion') {
      const baselineExists = await prisma.proyectoCronograma.findFirst({
        where: {
          proyectoId: id,
          esBaseline: true,
          tipo: 'planificacion'
        }
      })
      if (!baselineExists) {
        return NextResponse.json(
          { error: 'No se puede eliminar el cronograma de ejecución sin un cronograma de planificación baseline.' },
          { status: 400 }
        )
      }
    }

    // ✅ Verificar que no sea el único cronograma del proyecto
    const totalCronogramas = await prisma.proyectoCronograma.count({
      where: { proyectoId: id }
    })

    if (totalCronogramas <= 1) {
      return NextResponse.json(
        { error: 'No se puede eliminar el último cronograma del proyecto' },
        { status: 400 }
      )
    }

    // ✅ Eliminar el cronograma (las relaciones se eliminan en cascada)
    await prisma.proyectoCronograma.delete({
      where: { id: cronogramaId }
    })

    return NextResponse.json({
      success: true,
      message: 'Cronograma eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error al eliminar cronograma:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}