// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/edts/route.ts
// 🔧 Descripción: API para gestión de EDTs de proyecto
// 🎯 Funcionalidades: CRUD de EDTs (Estructura de Desglose de Trabajo)
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { recalcularPadresPostOperacion } from '@/lib/utils/cronogramaRollup'
import { logger } from '@/lib/logger'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'

// ✅ Schema de validación para crear EDT
const createEdtSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  edtId: z.string().min(1, 'La categoría de servicio es requerida'),
  proyectoFaseId: z.string().optional(),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
  horasPlan: z.number().min(0).default(0),
  responsableId: z.string().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  descripcion: z.string().optional(),
})

// ✅ Schema de validación para actualizar EDT
const updateEdtSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  edtId: z.string().min(1, 'La categoría de servicio es requerida').optional(),
  proyectoFaseId: z.string().optional(),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
  fechaInicioReal: z.string().optional(),
  fechaFinReal: z.string().optional(),
  horasPlan: z.number().min(0).optional(),
  porcentajeAvance: z.number().int().min(0).max(100).optional(),
  estado: z.enum(['planificado', 'en_progreso', 'detenido', 'completado', 'cancelado']).optional(),
  responsableId: z.string().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  descripcion: z.string().optional(),
})

// ✅ GET /api/proyectos/[id]/cronograma/edts - Obtener EDTs del proyecto
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
    const faseId = searchParams.get('faseId')
    const cronogramaId = searchParams.get('cronogramaId')

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

    // ✅ Construir filtros
    const where: any = { proyectoId: id }
    if (faseId) where.proyectoFaseId = faseId
    if (cronogramaId) where.proyectoCronogramaId = cronogramaId

    // ✅ Obtener todos los EDTs del proyecto
    const edts = await prisma.proyectoEdt.findMany({
      where,
      include: {
        proyecto: {
          select: { id: true, nombre: true, codigo: true, estado: true }
        },
        edt: {
          select: { id: true, nombre: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        proyectoFase: {
          select: { id: true, nombre: true }
        },
        proyectoCronograma: {
          select: { id: true, tipo: true, nombre: true }
        },
        _count: {
          select: { proyectoTarea: true }
        }
      },
      orderBy: [
        { proyectoFase: { orden: 'asc' } },
        { prioridad: 'desc' },
        { fechaInicioPlan: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: edts
    })

  } catch (error) {
    logger.error('Error al obtener EDTs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/proyectos/[id]/cronograma/edts - Crear nuevo EDT
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

    // ✅ Validar datos de entrada
    const validatedData = createEdtSchema.parse(body)

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

    // ✅ Validar que el EDT existe (cambio de categoriaServicio a edt según refactoring)
    const edtValidation = await prisma.edt.findUnique({
      where: { id: validatedData.edtId }
    })

    if (!edtValidation) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Determinar el cronograma (por defecto el comercial si existe)
    let cronogramaId = null
    if (validatedData.proyectoFaseId) {
      // Si se especifica una fase, obtener el cronograma de esa fase
      const fase = await prisma.proyectoFase.findUnique({
        where: { id: validatedData.proyectoFaseId },
        select: { proyectoCronogramaId: true }
      })
      cronogramaId = fase?.proyectoCronogramaId
    } else {
      // Buscar cronograma comercial por defecto
      const cronogramaComercial = await prisma.proyectoCronograma.findFirst({
        where: {
          proyectoId: id,
          tipo: 'comercial'
        }
      })
      cronogramaId = cronogramaComercial?.id
    }

    if (!cronogramaId) {
      return NextResponse.json(
        { error: 'No se encontró un cronograma válido para el proyecto' },
        { status: 404 }
      )
    }

    // ✅ Validar permisos: solo admin/gerente/gestor/coordinador y NO en cronograma comercial
    const permiso = await validarPermisoCronograma(cronogramaId)
    if (!permiso.ok) return permiso.response

    // ✅ Crear el EDT
    const edt = await prisma.proyectoEdt.create({
      data: {
        id: crypto.randomUUID(),
        proyectoId: id,
        proyectoCronogramaId: cronogramaId,
        proyectoFaseId: validatedData.proyectoFaseId,
        nombre: validatedData.nombre,
        edtId: validatedData.edtId,
        fechaInicioPlan: validatedData.fechaInicioPlan ? new Date(validatedData.fechaInicioPlan) : null,
        fechaFinPlan: validatedData.fechaFinPlan ? new Date(validatedData.fechaFinPlan) : null,
        horasPlan: validatedData.horasPlan,
        responsableId: validatedData.responsableId,
        prioridad: validatedData.prioridad,
        descripcion: validatedData.descripcion,
        estado: 'planificado',
        porcentajeAvance: 0,
        updatedAt: new Date()
      },
      include: {
        proyecto: {
          select: { id: true, nombre: true, codigo: true, estado: true }
        },
        edt: {
          select: { id: true, nombre: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        proyectoFase: {
          select: { id: true, nombre: true }
        },
        proyectoCronograma: {
          select: { id: true, tipo: true, nombre: true }
        }
      }
    })

    // ✅ GYS-GEN-12: Recalcular fechas y horas de padres después de crear EDT
    await recalcularPadresPostOperacion(id, 'edt', edt.id)

    return NextResponse.json({
      success: true,
      data: edt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Error al crear EDT:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}