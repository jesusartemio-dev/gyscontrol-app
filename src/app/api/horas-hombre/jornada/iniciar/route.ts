/**
 * API para iniciar una nueva jornada de campo
 * POST /api/horas-hombre/jornada/iniciar
 *
 * Crea un registro con estado 'iniciado' que puede ser editado
 * hasta que se cierre y pase a 'pendiente' de aprobación
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface PersonalPlanificado {
  userId: string
  nombre: string
  rolJornada?: 'trabajador' | 'supervisor' | 'seguridad'
}

interface IniciarJornadaPayload {
  proyectoId: string
  proyectoEdtId?: string
  fechaTrabajo: string // YYYY-MM-DD
  objetivosDia: string
  personalPlanificado: PersonalPlanificado[]
  ubicacion?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    const supervisorId = session.user.id
    const body: IniciarJornadaPayload = await request.json()

    const { proyectoId, proyectoEdtId, fechaTrabajo, objetivosDia, personalPlanificado, ubicacion } = body

    // Validaciones básicas
    if (!proyectoId) {
      return NextResponse.json(
        { error: 'El proyecto es requerido' },
        { status: 400 }
      )
    }

    if (!fechaTrabajo) {
      return NextResponse.json(
        { error: 'La fecha de trabajo es requerida' },
        { status: 400 }
      )
    }

    if (!objetivosDia || objetivosDia.trim().length === 0) {
      return NextResponse.json(
        { error: 'Los objetivos del día son requeridos' },
        { status: 400 }
      )
    }

    if (!personalPlanificado || personalPlanificado.length === 0) {
      return NextResponse.json(
        { error: 'Debe incluir al menos una persona planificada para la jornada' },
        { status: 400 }
      )
    }

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true, codigo: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Verificar EDT si se proporciona
    if (proyectoEdtId) {
      const edt = await prisma.proyectoEdt.findUnique({
        where: { id: proyectoEdtId },
        select: { id: true, proyectoId: true }
      })
      if (!edt || edt.proyectoId !== proyectoId) {
        return NextResponse.json(
          { error: 'EDT no válido para este proyecto' },
          { status: 400 }
        )
      }
    }

    // Verificar que todos los usuarios planificados existen
    const userIds = personalPlanificado.map(p => p.userId)
    const usuarios = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true }
    })

    if (usuarios.length !== userIds.length) {
      return NextResponse.json(
        { error: 'Uno o más usuarios planificados no existen' },
        { status: 400 }
      )
    }

    // Convertir fecha
    const [year, month, day] = fechaTrabajo.split('-').map(Number)
    const fechaLocal = new Date(year, month - 1, day, 12, 0, 0, 0)

    // Crear la jornada con estado 'iniciado'
    const jornadaCreada = await prisma.registroHorasCampo.create({
      data: {
        proyectoId,
        proyectoEdtId: proyectoEdtId || null,
        supervisorId,
        fechaTrabajo: fechaLocal,
        objetivosDia: objetivosDia.trim(),
        personalPlanificado: personalPlanificado,
        ubicacion: ubicacion || null,
        estado: 'iniciado'
      }
    })

    // Obtener la jornada con relaciones
    const jornada = await prisma.registroHorasCampo.findUnique({
      where: { id: jornadaCreada.id },
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        proyectoEdt: { select: { id: true, nombre: true, edt: { select: { id: true, nombre: true } } } },
        supervisor: { select: { id: true, name: true, email: true } }
      }
    })

    console.log(`✅ JORNADA CAMPO: Iniciada jornada ${jornadaCreada.id} para proyecto ${proyecto.codigo} con ${personalPlanificado.length} personas planificadas`)

    return NextResponse.json({
      success: true,
      message: `Jornada iniciada para ${proyecto.codigo} con ${personalPlanificado.length} persona(s) planificada(s)`,
      data: {
        id: jornada?.id,
        proyecto: jornada?.proyecto,
        edt: jornada?.proyectoEdt,
        fechaTrabajo: jornada?.fechaTrabajo,
        objetivosDia: jornada?.objetivosDia,
        personalPlanificado: jornada?.personalPlanificado,
        ubicacion: jornada?.ubicacion,
        estado: jornada?.estado
      }
    })

  } catch (error) {
    console.error('❌ JORNADA CAMPO Error al iniciar:', error)
    return NextResponse.json(
      {
        error: 'Error iniciando jornada de campo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
