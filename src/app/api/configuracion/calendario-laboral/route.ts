// ===================================================
// 📅 API para Gestión de Calendarios Laborales
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const calendarioSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  pais: z.string().optional(),
  empresa: z.string().optional(),
  activo: z.boolean().default(true),
  horasPorDia: z.number().min(1).max(24).default(8),
  diasLaborables: z.array(z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'])).default(['lunes', 'martes', 'miercoles', 'jueves', 'viernes']),
  horaInicioManana: z.string().default('08:00'),
  horaFinManana: z.string().default('12:00'),
  horaInicioTarde: z.string().default('13:00'),
  horaFinTarde: z.string().default('17:00')
})

// ✅ GET /api/configuracion/calendario-laboral - Listar calendarios
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener calendarios con sus relaciones usando Prisma
    const calendarios = await prisma.calendarioLaboral.findMany({
      include: {
        dia_calendario: true,
        excepcion_calendario: true,
        configuracion_calendario: true
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: calendarios
    })

  } catch (error) {
    console.error('Error obteniendo calendarios:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ POST /api/configuracion/calendario-laboral - Crear calendario
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = calendarioSchema.parse(body)

    // Verificar permisos (solo admin puede crear calendarios)
    const userRole = session.user.role
    if (!['admin', 'gerente', 'comercial', 'presupuestos', 'proyectos', 'coordinador', 'logistico', 'gestor'].includes(userRole)) {
      return NextResponse.json({ error: `No tiene permisos para crear calendarios. Rol actual: ${userRole}` }, { status: 403 })
    }

    // Crear calendario con días por defecto usando Prisma
    const calendario = await prisma.calendarioLaboral.create({
      data: {
        id: crypto.randomUUID(),
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion || null,
        pais: validatedData.pais || null,
        empresa: validatedData.empresa || null,
        activo: validatedData.activo,
        horasPorDia: validatedData.horasPorDia,
        diasLaborables: validatedData.diasLaborables,
        horaInicioManana: validatedData.horaInicioManana,
        horaFinManana: validatedData.horaFinManana,
        horaInicioTarde: validatedData.horaInicioTarde,
        horaFinTarde: validatedData.horaFinTarde,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        dia_calendario: true
      }
    })

    return NextResponse.json({
      success: true,
      data: calendario,
      message: 'Calendario creado exitosamente'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error creando calendario:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}