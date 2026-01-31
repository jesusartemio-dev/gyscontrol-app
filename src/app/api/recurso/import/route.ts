import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

interface RecursoImportado {
  nombre: string
  tipo: 'individual' | 'cuadrilla'
  costoHora: number
  descripcion?: string
}

export async function POST(request: Request) {
  try {
    const { recursos } = await request.json() as { recursos: RecursoImportado[] }

    if (!Array.isArray(recursos) || recursos.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron recursos para importar' },
        { status: 400 }
      )
    }

    // Obtener todos los recursos existentes para comparar por nombre
    const recursosExistentes = await prisma.recurso.findMany({
      select: { id: true, nombre: true }
    })

    const resultados = {
      creados: 0,
      actualizados: 0,
      errores: [] as string[]
    }

    for (const rec of recursos) {
      try {
        // Validar nombre requerido
        if (!rec.nombre || rec.nombre.trim() === '') {
          resultados.errores.push('Recurso sin nombre')
          continue
        }

        // Validar costoHora
        if (!rec.costoHora || rec.costoHora <= 0) {
          resultados.errores.push(`Recurso "${rec.nombre}" sin costo por hora válido`)
          continue
        }

        // Buscar recurso existente por nombre (case insensitive)
        const recursoExistente = recursosExistentes.find(r =>
          r.nombre.toLowerCase() === rec.nombre.toLowerCase().trim()
        )

        const dataRecurso = {
          nombre: rec.nombre.trim(),
          tipo: rec.tipo || 'individual',
          costoHora: rec.costoHora,
          descripcion: rec.descripcion?.trim() || null,
          updatedAt: new Date()
        }

        if (recursoExistente) {
          // Actualizar recurso existente
          await prisma.recurso.update({
            where: { id: recursoExistente.id },
            data: dataRecurso
          })
          resultados.actualizados++
        } else {
          // Crear nuevo recurso
          await prisma.recurso.create({
            data: {
              id: randomUUID(),
              ...dataRecurso
            }
          })
          resultados.creados++
        }
      } catch (error) {
        console.error(`Error al procesar recurso ${rec.nombre}:`, error)
        resultados.errores.push(`Error al procesar recurso: ${rec.nombre}`)
      }
    }

    const mensaje = [
      resultados.creados > 0 ? `${resultados.creados} creados` : null,
      resultados.actualizados > 0 ? `${resultados.actualizados} actualizados` : null
    ].filter(Boolean).join(', ')

    return NextResponse.json({
      message: `Importación completada: ${mensaje || 'sin cambios'}`,
      creados: resultados.creados,
      actualizados: resultados.actualizados,
      total: recursos.length,
      errores: resultados.errores.length > 0 ? resultados.errores : undefined
    })
  } catch (error) {
    console.error('❌ Error en POST /recurso/import:', error)
    return NextResponse.json(
      { error: 'Error al procesar la importación' },
      { status: 500 }
    )
  }
}
