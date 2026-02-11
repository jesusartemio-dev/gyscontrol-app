// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/proyectos/[id]/cronograma/generar-desde-cotizacion
// 🔧 Descripción: Generación automática de cronograma desde cotización
// ✅ POST: Crear cronograma comercial con EDTs y actividades desde servicios
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const generateSchema = z.object({
  tipo: z.enum(['comercial', 'planificacion', 'ejecucion']),
  nombre: z.string().min(1, 'El nombre es requerido'),
  esBaseline: z.boolean().optional().default(false),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = generateSchema.parse(body)

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
        cotizacion: {
          include: {
            cotizacionServicio: {
              include: {
                cotizacionServicioItem: true
              }
            }
          }
        }
      }
    })

    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    if (!proyecto.cotizacion) {
      return NextResponse.json({ error: 'Proyecto no tiene cotización asociada' }, { status: 400 })
    }

    // Verificar permisos
    const userRole = session.user.role
    const isOwner = proyecto.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para crear cronograma' }, { status: 403 })
    }

    // Verificar que no existe un cronograma del mismo tipo
    const existingCronograma = await prisma.proyectoCronograma.findFirst({
      where: {
        proyectoId,
        tipo: validatedData.tipo
      }
    })

    if (existingCronograma) {
      return NextResponse.json(
        { error: `Ya existe un cronograma de tipo ${validatedData.tipo}` },
        { status: 400 }
      )
    }

    // Obtener servicios de la cotización
    const servicios = proyecto.cotizacion.cotizacionServicio

    if (!servicios || servicios.length === 0) {
      return NextResponse.json({
        error: 'No hay servicios en la cotización para generar el cronograma'
      }, { status: 400 })
    }

    // Crear el cronograma
    const cronograma = await prisma.proyectoCronograma.create({
      data: {
        id: crypto.randomUUID(),
        proyectoId,
        tipo: validatedData.tipo,
        nombre: validatedData.nombre,
        esBaseline: validatedData.esBaseline,
        version: 1,
        updatedAt: new Date()
      }
    })

    console.log('✅ [GENERAR CRONOGRAMA] Cronograma creado:', cronograma.id)

    // Generar EDTs y actividades desde servicios
    const result = await generarCronogramaDesdeServicios({
      proyectoId,
      cronogramaId: cronograma.id,
      servicios
    })

    return NextResponse.json({
      success: true,
      data: {
        cronograma,
        ...result,
        message: `Cronograma generado exitosamente con ${result.totalElements} elementos`
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    logger.error('❌ Error generando cronograma:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Función principal para generar cronograma
async function generarCronogramaDesdeServicios({
  proyectoId,
  cronogramaId,
  servicios
}: {
  proyectoId: string
  cronogramaId: string
  servicios: any[]
}) {
  const result = {
    fasesGeneradas: 0,
    edtsGenerados: 0,
    actividadesGeneradas: 0,
    tareasGeneradas: 0,
    totalElements: 0
  }

  console.log('🚀 INICIANDO GENERACIÓN CRONOGRAMA PROYECTO - GYS-PROJ-GEN-01')

  // 1. Crear fases por defecto (Ingeniería, Construcción, Pruebas)
  const fasesDefault = [
    { nombre: 'Ingeniería Básica', descripcion: 'Fase de diseño e ingeniería', orden: 1 },
    { nombre: 'Construcción', descripcion: 'Fase de construcción y montaje', orden: 2 },
    { nombre: 'Pruebas y Puesta en Marcha', descripcion: 'Fase de pruebas y commissioning', orden: 3 }
  ]

  const fasesCreadas = []
  for (const faseData of fasesDefault) {
    const fase = await prisma.proyectoFase.create({
      data: {
        id: crypto.randomUUID(),
        proyectoId,
        proyectoCronogramaId: cronogramaId,
        nombre: faseData.nombre,
        descripcion: faseData.descripcion,
        orden: faseData.orden,
        estado: 'planificado',
        fechaInicioPlan: new Date().toISOString(),
        fechaFinPlan: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
        updatedAt: new Date()
      }
    })
    fasesCreadas.push(fase)
    result.fasesGeneradas++
    console.log(`📅 Fase creada: ${fase.nombre}`)
  }

  // 2. Crear EDTs agrupando servicios por categoría
  // 2.1 Extraer IDs de categoría únicos
  const categoriaIdsUnicos = new Set<string>()
  servicios.forEach(servicio => {
    const categoria = servicio.categoria
    if (categoria) {
      categoriaIdsUnicos.add(categoria)
    }
  })

  // 2.2 Obtener nombres de EDT desde el catálogo
  const edtsCatalogo = await prisma.edt.findMany({
    where: {
      id: { in: Array.from(categoriaIdsUnicos) }
    },
    select: {
      id: true,
      nombre: true,
      descripcion: true
    }
  })

  // Crear mapa de ID -> nombre del catálogo
  const edtNombresMap = new Map<string, string>()
  for (const edt of edtsCatalogo) {
    edtNombresMap.set(edt.id, edt.nombre)
  }

  console.log(`📊 [GENERAR] EDTs encontrados en catálogo: ${edtsCatalogo.length}`)
  edtsCatalogo.forEach(e => console.log(`   - ${e.id}: ${e.nombre}`))

  // 2.3 Agrupar servicios por categoría
  const serviciosPorCategoria = new Map<string, any[]>()
  servicios.forEach(servicio => {
    const categoria = servicio.categoria || 'sin-categoria'
    if (!serviciosPorCategoria.has(categoria)) {
      serviciosPorCategoria.set(categoria, [])
    }
    serviciosPorCategoria.get(categoria)!.push(servicio)
  })

  // Asignar EDTs a fases (balanceo simple)
  const fasesDisponibles = fasesCreadas
  let faseIndex = 0

  for (const [categoriaId, serviciosCategoria] of serviciosPorCategoria.entries()) {
    // ✅ Obtener nombre del catálogo EDT, NO usar el ID como nombre
    const edtNombre = edtNombresMap.get(categoriaId) || `EDT ${categoriaId}`

    // Calcular horas totales
    const horasTotales = serviciosCategoria.reduce((sum: number, servicio: any) =>
      sum + (servicio.cotizacionServicioItem || []).reduce((itemSum: number, item: any) => itemSum + (item.horaTotal || 0), 0), 0
    )

    // Asignar a fase (rotativo)
    const faseAsignada = fasesDisponibles[faseIndex % fasesDisponibles.length]
    faseIndex++

    // Crear EDT con nombre del catálogo
    const edt = await prisma.proyectoEdt.create({
      data: {
        id: crypto.randomUUID(),
        proyectoId,
        proyectoCronogramaId: cronogramaId,
        proyectoFaseId: faseAsignada.id,
        nombre: edtNombre, // ✅ Usar nombre del catálogo
        edtId: categoriaId, // ✅ Guardar el ID real del EDT
        fechaInicioPlan: new Date().toISOString(),
        fechaFinPlan: new Date(Date.now() + Math.max(7, Math.ceil(horasTotales / 8)) * 24 * 60 * 60 * 1000).toISOString(),
        horasPlan: horasTotales,
        estado: 'planificado',
        descripcion: `EDT generado automáticamente`,
        updatedAt: new Date()
      }
    })

    result.edtsGenerados++
    console.log(`🏗️ EDT creado: ${edt.nombre} (${horasTotales}h) - Fase: ${faseAsignada.nombre}`)

    // 3. Crear actividades desde servicios
    for (const servicio of serviciosCategoria) {
      const items = servicio.cotizacionServicioItem || []
      const horasServicio = items.reduce((sum: number, item: any) => sum + (item.horaTotal || 0), 0)

      const actividad = await prisma.proyectoActividad.create({
        data: {
          id: crypto.randomUUID(),
          proyectoEdtId: edt.id,
          proyectoCronogramaId: cronogramaId,
          nombre: servicio.nombre,
          descripcion: `Actividad generada desde servicio ${servicio.nombre}`,
          fechaInicioPlan: new Date().toISOString(),
          fechaFinPlan: new Date(Date.now() + Math.max(1, Math.ceil(horasServicio / 8)) * 24 * 60 * 60 * 1000).toISOString(),
          horasPlan: horasServicio,
          estado: 'pendiente',
          prioridad: 'media',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      result.actividadesGeneradas++
      console.log(`⚙️ Actividad creada: ${actividad.nombre} (${horasServicio}h)`)

      // 4. Crear tareas desde items del servicio
      for (const item of items) {
        const tarea = await prisma.proyectoTarea.create({
          data: {
            id: crypto.randomUUID(),
            proyectoEdtId: edt.id,
            proyectoActividadId: actividad.id,
            proyectoCronogramaId: cronogramaId,
            nombre: item.nombre,
            descripcion: item.descripcion || `Tarea generada desde item ${item.nombre}`,
            fechaInicio: new Date().toISOString(),
            fechaFin: new Date(Date.now() + Math.max(1, Math.ceil(item.horaTotal / 8)) * 24 * 60 * 60 * 1000).toISOString(),
            horasEstimadas: item.horaTotal,
            estado: 'pendiente',
            prioridad: 'media',
            updatedAt: new Date()
          }
        })

        result.tareasGeneradas++
        console.log(`✅ Tarea creada: ${tarea.nombre} (${item.horaTotal}h)`)
      }
    }
  }

  result.totalElements = result.fasesGeneradas + result.edtsGenerados + result.actividadesGeneradas + result.tareasGeneradas

  console.log('✅ GENERACIÓN COMPLETADA:', result)

  return result
}