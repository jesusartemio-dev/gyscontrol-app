/**
 * API: Importar Duraciones de Cronograma desde Excel
 *
 * POST /api/configuracion/duraciones-cronograma/importar
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { leerDuracionesCronogramaDesdeExcel, validarDuracionesCronograma } from '@/lib/utils/duracionesCronogramaExcel'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos de administrador
    const userRole = session.user.role
    if (!['admin', 'gerente'].includes(userRole)) {
      return NextResponse.json({ error: 'No tiene permisos para importar configuraciones' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se encontró el archivo' }, { status: 400 })
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Tipo de archivo inválido. Solo se permiten archivos Excel (.xlsx, .xls)'
      }, { status: 400 })
    }

    // Validar tamaño del archivo (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'El archivo es demasiado grande. Máximo 5MB permitido'
      }, { status: 400 })
    }

    // Leer datos del Excel
    const datos = await leerDuracionesCronogramaDesdeExcel(file)

    // Obtener niveles existentes para validación
    const duracionesExistentes = await prisma.$queryRaw`
      SELECT DISTINCT "nivel" FROM "plantilla_duracion_cronograma"
    `
    const nivelesExistentes = duracionesExistentes.map((d: any) => d.nivel)

    // Validar datos
    const { nuevas, errores, actualizaciones } = validarDuracionesCronograma(datos, nivelesExistentes)

    // Si hay errores de validación, devolverlos
    if (errores.length > 0) {
      return NextResponse.json({
        error: 'Errores de validación en el archivo',
        errores
      }, { status: 400 })
    }

    // Importar duraciones una por una
    let successCount = 0
    let errorCount = 0
    const erroresAPI: string[] = []

    for (const duracion of nuevas) {
      try {
        // Verificar si ya existe una duración para este nivel
        const existingDuracion = await prisma.$queryRaw`
          SELECT * FROM "plantilla_duracion_cronograma" 
          WHERE "nivel" = ${duracion.nivel}
          LIMIT 1
        `

        const method = existingDuracion && existingDuracion.length > 0 ? 'PUT' : 'POST'
        const url = existingDuracion && existingDuracion.length > 0
          ? `/api/configuracion/duraciones-cronograma/${existingDuracion[0].id}`
          : '/api/configuracion/duraciones-cronograma'

        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}${url}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify(duracion)
        })

        const result = await response.json()

        if (response.ok && result.success) {
          successCount++
        } else {
          errorCount++
          const action = existingDuracion && existingDuracion.length > 0 ? 'actualizando' : 'creando'
          erroresAPI.push(`Error ${action} nivel "${duracion.nivel}": ${result.error || 'Error desconocido'}`)
        }
      } catch (error) {
        errorCount++
        erroresAPI.push(`Error de conexión procesando nivel "${duracion.nivel}"`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Importación completada: ${successCount} duraciones procesadas${errorCount > 0 ? `, ${errorCount} errores` : ''}`,
      imported: successCount,
      errors: errorCount,
      errores: erroresAPI.length > 0 ? erroresAPI : undefined,
      actualizaciones: actualizaciones.length > 0 ? actualizaciones : undefined
    })

  } catch (error) {
    console.error('Error al importar duraciones:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}