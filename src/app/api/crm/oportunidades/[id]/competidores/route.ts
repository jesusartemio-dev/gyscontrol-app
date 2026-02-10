// ===================================================
// 📁 Archivo: competidores/route.ts
// 📌 Ubicación: /api/crm/oportunidades/[id]/competidores
// 🔧 Descripción: API para gestión de competidores de oportunidad
// ✅ GET: Listar competidores de oportunidad
// ✅ POST: Agregar competidor a oportunidad
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-19
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// ✅ Obtener competidores de una oportunidad
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: oportunidadId } = await params

    // ✅ Verificar que la oportunidad existe
    const oportunidad = await prisma.crmOportunidad.findUnique({
      where: { id: oportunidadId },
      select: { id: true, nombre: true, cotizacionId: true }
    })

    if (!oportunidad) {
      return NextResponse.json(
        { error: 'Oportunidad no encontrada' },
        { status: 404 }
      )
    }

    // If no cotizacion linked, return empty
    if (!oportunidad.cotizacionId) {
      return NextResponse.json({
        data: [],
        estadisticas: { total: 0, conPropuesta: 0, ganamos: 0, perdimos: 0, pendiente: 0 }
      })
    }

    // 📊 Obtener competidores
    const competidores = await prisma.crmCompetidorLicitacion.findMany({
      where: { cotizacionId: oportunidad.cotizacionId },
      orderBy: { createdAt: 'desc' }
    })

    // 📈 Estadísticas de competidores
    const estadisticasFormateadas = {
      total: competidores.length,
      conPropuesta: competidores.filter(c => c.propuestaEconomica).length,
      ganamos: competidores.filter(c => c.resultado === 'ganamos').length,
      perdimos: competidores.filter(c => c.resultado === 'perdimos').length,
      pendiente: competidores.filter(c => !c.resultado || c.resultado === 'pendiente').length
    }

    return NextResponse.json({
      data: competidores,
      estadisticas: estadisticasFormateadas
    })

  } catch (error) {
    console.error('❌ Error al obtener competidores:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ Agregar competidor a oportunidad
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: oportunidadId } = await params
    const data = await request.json()

    const {
      nombreEmpresa,
      contacto,
      telefono,
      email,
      propuestaEconomica,
      propuestaTecnica,
      fortalezas,
      debilidades,
      precioVsNuestro,
      resultado,
      razonPerdida
    } = data

    // ✅ Validaciones
    if (!nombreEmpresa) {
      return NextResponse.json(
        { error: 'Nombre de empresa es obligatorio' },
        { status: 400 }
      )
    }

    // ✅ Verificar que la oportunidad existe
    const oportunidad = await prisma.crmOportunidad.findUnique({
      where: { id: oportunidadId },
      select: { id: true, nombre: true, cotizacionId: true }
    })

    if (!oportunidad) {
      return NextResponse.json(
        { error: 'Oportunidad no encontrada' },
        { status: 404 }
      )
    }

    if (!oportunidad.cotizacionId) {
      return NextResponse.json(
        { error: 'La oportunidad no tiene cotización asociada para registrar competidores' },
        { status: 400 }
      )
    }

    // ✅ Crear competidor
    const nuevoCompetidor = await prisma.crmCompetidorLicitacion.create({
      data: {
        id: crypto.randomUUID(),
        cotizacionId: oportunidad.cotizacionId,
        nombreEmpresa,
        contacto,
        telefono,
        email,
        propuestaEconomica: propuestaEconomica ? parseFloat(propuestaEconomica) : null,
        propuestaTecnica,
        fortalezas,
        debilidades,
        precioVsNuestro,
        resultado,
        razonPerdida,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(nuevoCompetidor, { status: 201 })

  } catch (error) {
    console.error('❌ Error al crear competidor:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}