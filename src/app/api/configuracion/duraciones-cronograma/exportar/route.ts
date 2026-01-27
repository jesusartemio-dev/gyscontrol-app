/**
 * API: Exportar Duraciones de Cronograma a Excel
 *
 * GET /api/configuracion/duraciones-cronograma/exportar
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos de administrador
    const userRole = session.user.role
    if (!['admin', 'gerente'].includes(userRole)) {
      return NextResponse.json({ error: 'No tiene permisos para exportar configuraciones' }, { status: 403 })
    }

    // Obtener todas las plantillas activas
    const plantillas = await prisma.plantillaDuracionCronograma.findMany({
      where: { activo: true },
      orderBy: { nivel: 'asc' }
    })

    // Crear workbook de Excel
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Duraciones Cronograma')

    // Configurar columnas
    worksheet.columns = [
      { header: 'Nivel', key: 'nivel', width: 15 },
      { header: 'Duración (días)', key: 'duracionDias', width: 15 },
      { header: 'Horas por Día', key: 'horasPorDia', width: 15 },
      { header: 'Buffer (%)', key: 'bufferPorcentaje', width: 12 },
      { header: 'Estado', key: 'estado', width: 10 },
      { header: 'Fecha Creación', key: 'createdAt', width: 20 },
      { header: 'Última Actualización', key: 'updatedAt', width: 20 }
    ]

    // Estilo del header
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    }

    // Agregar datos
    plantillas.forEach((plantilla: any) => {
      worksheet.addRow({
        nivel: plantilla.nivel,
        duracionDias: plantilla.duracionDias,
        horasPorDia: plantilla.horasPorDia,
        bufferPorcentaje: plantilla.bufferPorcentaje,
        estado: plantilla.activo ? 'Activa' : 'Inactiva',
        createdAt: new Date(plantilla.createdAt).toLocaleDateString('es-ES'),
        updatedAt: new Date(plantilla.updatedAt).toLocaleDateString('es-ES')
      })
    })

    // Configurar respuesta
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=duraciones-cronograma-${new Date().toISOString().split('T')[0]}.xlsx`
      }
    })

  } catch (error) {
    console.error('Error al exportar duraciones:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}