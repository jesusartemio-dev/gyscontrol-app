// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/actividades/route.ts
// 🔧 Descripción: API para gestión de actividades de proyecto con soporte para zonas virtuales
// 🎯 Funcionalidades: CRUD de actividades con lógica automática de zonas virtuales
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-10-05
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { recalcularPadresPostOperacion } from '@/lib/utils/cronogramaRollup'
import { logger } from '@/lib/logger'

// ✅ Schema de validación para crear actividad (5 niveles)
const createActividadSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  proyectoEdtId: z.string().min(1, 'El EDT es requerido'), // Obligatorio en 5 niveles
  proyectoCronogramaId: z.string().optional(), // Opcional, se determina automáticamente
  fechaInicioPlan: z.string().optional(), // Opcional si se usa posicionamiento automático
  fechaFinPlan: z.string().optional(), // Opcional si se usa posicionamiento automático
  horasPlan: z.number().min(0).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  responsableId: z.string().optional(),
  posicionamiento: z.enum(['inicio_padre', 'despues_ultima']).optional(),
})

// ✅ Schema de validación para actualizar actividad
const updateActividadSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  descripcion: z.string().optional(),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
  fechaInicioReal: z.string().optional(),
  fechaFinReal: z.string().optional(),
  horasPlan: z.number().min(0).optional(),
  porcentajeAvance: z.number().int().min(0).max(100).optional(),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'pausada', 'cancelada']).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  responsableId: z.string().optional(),
})

// ✅ GET /api/proyectos/[id]/cronograma/actividades - Obtener actividades del proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const edtId = searchParams.get('edtId')
    const cronogramaId = searchParams.get('cronogramaId')
    const modoVista = searchParams.get('modoVista') || 'automatico' // 'automatico' | 'jerarquia_completa'

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

    // ✅ Construir filtros (5 niveles - sin zonas)
    const where: any = {}
    if (edtId) where.proyectoEdtId = edtId
    if (cronogramaId) where.proyectoCronogramaId = cronogramaId

    // ✅ Filtrar por proyecto a través de EDT (ya no hay zonas)
    if (edtId) {
      // Verificar que el EDT pertenece al proyecto
      const edt = await prisma.proyectoEdt.findFirst({
        where: {
          id: edtId,
          proyectoId: id
        }
      })
      if (!edt) {
        return NextResponse.json(
          { error: 'EDT no encontrado o no pertenece al proyecto' },
          { status: 404 }
        )
      }
    } else {
      // Si no hay EDT específico, filtrar por proyecto a través de EDTs
      where.proyectoEdt = {
        proyectoId: id
      }
    }

    // ✅ Obtener actividades (5 niveles - sin zonas)
    const actividades = await prisma.proyectoActividad.findMany({
      where,
      include: {
        proyectoEdt: {
          select: {
            id: true,
            nombre: true,
            edt: { select: { id: true, nombre: true } }
          }
        },
        proyectoCronograma: {
          select: { id: true, tipo: true, nombre: true }
        },
        proyectoTarea: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            porcentajeCompletado: true
          }
        },
        _count: {
          select: { proyectoTarea: true }
        }
      },
      orderBy: [
        { proyectoEdt: { nombre: 'asc' } },
        { fechaInicioPlan: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: actividades,
      modoVista,
      total: actividades.length
    })

  } catch (error) {
    logger.error('Error al obtener actividades:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/proyectos/[id]/cronograma/actividades - Crear actividad
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    console.log('🔍 [API ACTIVIDADES] Request body:', body)
    const validatedData = createActividadSchema.parse(body)
    console.log('✅ [API ACTIVIDADES] Validated data:', validatedData)

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

    // ✅ LÓGICA DE 5 NIVELES: Las actividades van directamente bajo EDT
    let edtId = validatedData.proyectoEdtId

    // Validar que se especifica EDT (obligatorio en 5 niveles)
    if (!edtId) {
      return NextResponse.json(
        { error: 'Debe especificar un EDT para la actividad' },
        { status: 400 }
      )
    }

    // Verificar que el EDT existe y pertenece al proyecto
    const edt = await prisma.proyectoEdt.findFirst({
      where: {
        id: edtId,
        proyectoId: id
      }
    })

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    // ✅ Determinar el cronograma automáticamente si no se especifica
    let cronogramaId = validatedData.proyectoCronogramaId
    console.log('🔍 [API ACTIVIDADES] Cronograma ID inicial:', cronogramaId)
    if (!cronogramaId || cronogramaId === 'current') {
      console.log('🔍 [API ACTIVIDADES] Buscando cronograma baseline automáticamente...')
      // Obtener el cronograma baseline del proyecto (solo planificación puede ser baseline)
      let cronograma = await prisma.proyectoCronograma.findFirst({
        where: {
          proyectoId: id,
          esBaseline: true,
          tipo: 'planificacion' // Solo planificación puede ser baseline
        }
      })

      // Si no hay baseline de planificación, buscar cualquier cronograma de planificación
      if (!cronograma) {
        const cronogramaPlanificacion = await prisma.proyectoCronograma.findFirst({
          where: {
            proyectoId: id,
            tipo: 'planificacion'
          },
          orderBy: { createdAt: 'desc' } // El más reciente
        })
        if (cronogramaPlanificacion) {
          cronograma = cronogramaPlanificacion
          console.log('🔍 [API ACTIVIDADES] Usando cronograma de planificación más reciente:', cronograma.id)
        }
      }
      console.log('🔍 [API ACTIVIDADES] Cronograma baseline encontrado:', cronograma)

      if (!cronograma) {
        console.log('❌ [API ACTIVIDADES] No se encontró cronograma baseline de planificación')
        return NextResponse.json(
          { error: 'No se encontró un cronograma de planificación marcado como baseline. Cree y marque como baseline un cronograma de planificación primero.' },
          { status: 404 }
        )
      }

      cronogramaId = cronograma.id
      console.log('✅ [API ACTIVIDADES] Cronograma baseline ID determinado:', cronogramaId)
    }

    // ✅ Determinar fechas automáticamente según posicionamiento
    let fechaInicioPlan: Date | null = null
    let fechaFinPlan: Date | null = null

    if (validatedData.fechaInicioPlan && validatedData.fechaFinPlan) {
      // Si se especificaron fechas manualmente, usarlas
      fechaInicioPlan = new Date(validatedData.fechaInicioPlan)
      fechaFinPlan = new Date(validatedData.fechaFinPlan)
      console.log('🔍 [API ACTIVIDADES] Usando fechas manuales:', {
        fechaInicioPlan: fechaInicioPlan.toISOString(),
        fechaFinPlan: fechaFinPlan.toISOString()
      })
    } else {
      // Calcular fechas automáticamente según posicionamiento
      const posicionamiento = validatedData.posicionamiento || 'despues_ultima'

      if (posicionamiento === 'inicio_padre') {
        // Al inicio del EDT padre - usar fechas del EDT
        const edt = await prisma.proyectoEdt.findUnique({
          where: { id: edtId },
          select: { fechaInicioPlan: true, fechaFinPlan: true }
        })

        if (edt?.fechaInicioPlan && edt?.fechaFinPlan) {
          fechaInicioPlan = new Date(edt.fechaInicioPlan)
          fechaFinPlan = new Date(edt.fechaFinPlan)
          console.log('🔍 [API ACTIVIDADES] Fechas calculadas al inicio del EDT:', {
            fechaInicioPlan: fechaInicioPlan.toISOString(),
            fechaFinPlan: fechaFinPlan.toISOString()
          })
        }
      } else if (posicionamiento === 'despues_ultima') {
        // Después del último hermano - buscar la última actividad del EDT
        const ultimaActividad = await prisma.proyectoActividad.findFirst({
          where: { proyectoEdtId: edtId },
          orderBy: { fechaFinPlan: 'desc' },
          select: { fechaFinPlan: true }
        })

        if (ultimaActividad?.fechaFinPlan) {
          // Calcular fecha de inicio como el día siguiente a la última actividad
          fechaInicioPlan = new Date(ultimaActividad.fechaFinPlan)
          fechaInicioPlan.setDate(fechaInicioPlan.getDate() + 1)

          // Fecha fin por defecto: 7 días después
          fechaFinPlan = new Date(fechaInicioPlan)
          fechaFinPlan.setDate(fechaFinPlan.getDate() + 7)

          console.log('🔍 [API ACTIVIDADES] Fechas calculadas después del último hermano:', {
            fechaInicioPlan: fechaInicioPlan.toISOString(),
            fechaFinPlan: fechaFinPlan.toISOString()
          })
        } else {
          // No hay actividades previas, usar fechas del EDT
          const edt = await prisma.proyectoEdt.findUnique({
            where: { id: edtId },
            select: { fechaInicioPlan: true, fechaFinPlan: true }
          })

          if (edt?.fechaInicioPlan && edt?.fechaFinPlan) {
            fechaInicioPlan = new Date(edt.fechaInicioPlan)
            fechaFinPlan = new Date(edt.fechaFinPlan)
            console.log('🔍 [API ACTIVIDADES] Primera actividad del EDT:', {
              fechaInicioPlan: fechaInicioPlan.toISOString(),
              fechaFinPlan: fechaFinPlan.toISOString()
            })
          }
        }
      }
    }

    // ✅ Crear la actividad (5 niveles - directamente bajo EDT)
    console.log('🔍 [API ACTIVIDADES] Creando actividad con datos finales:', {
      proyectoEdtId: edtId,
      proyectoCronogramaId: cronogramaId,
      nombre: validatedData.nombre,
      fechaInicioPlan: fechaInicioPlan?.toISOString(),
      fechaFinPlan: fechaFinPlan?.toISOString(),
      posicionamiento: validatedData.posicionamiento
    })

    const actividad = await prisma.proyectoActividad.create({
      data: {
        id: crypto.randomUUID(),
        proyectoEdtId: edtId,
        proyectoCronogramaId: cronogramaId,
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion,
        fechaInicioPlan: fechaInicioPlan ?? new Date(),
        fechaFinPlan: fechaFinPlan ?? new Date(),
        horasPlan: validatedData.horasPlan,
        prioridad: validatedData.prioridad,
        responsableId: validatedData.responsableId,
        estado: 'pendiente',
        porcentajeAvance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        proyectoEdt: {
          select: {
            id: true,
            nombre: true,
            edt: { select: { id: true, nombre: true } }
          }
        },
        proyectoCronograma: {
          select: { id: true, tipo: true, nombre: true }
        }
      }
    })

    console.log('✅ [API ACTIVIDADES] Actividad creada exitosamente:', actividad.id)

    // ✅ GYS-GEN-12: Recalcular fechas y horas de padres después de crear actividad
    await recalcularPadresPostOperacion(id, 'actividad', actividad.id)

    return NextResponse.json({
      success: true,
      data: actividad
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ [API ACTIVIDADES] Error de validación:', error.errors)
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('❌ [API ACTIVIDADES] Error al crear actividad:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}