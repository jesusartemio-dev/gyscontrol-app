import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeStr } from '@/lib/utils'

interface RecursoImportado {
  nombre: string
  tipo: 'individual' | 'cuadrilla'
  origen: 'propio' | 'externo'
  costoHora: number
  costoHoraProyecto?: number | null
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
      actualizados: 0,
      errores: [] as string[]
    }

    // La importación solo actualiza recursos existentes: no crea recursos nuevos.
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

        // Buscar recurso existente por nombre (insensible a acentos/mayúsculas)
        const nombreNorm = normalizeStr(rec.nombre.trim())
        const recursoExistente = recursosExistentes.find(r =>
          normalizeStr(r.nombre) === nombreNorm
        )

        if (!recursoExistente) {
          resultados.errores.push(`Recurso "${rec.nombre}" no existe en el catálogo — no se crean recursos nuevos por importación`)
          continue
        }

        const dataRecurso = {
          tipo: rec.tipo || 'individual',
          origen: rec.origen || 'propio',
          costoHora: rec.costoHora,
          costoHoraProyecto: rec.costoHoraProyecto ?? null,
          descripcion: rec.descripcion?.trim() || null,
          updatedAt: new Date()
        }

        await prisma.recurso.update({
          where: { id: recursoExistente.id },
          data: dataRecurso
        })
        resultados.actualizados++
      } catch (error) {
        console.error(`Error al procesar recurso ${rec.nombre}:`, error)
        resultados.errores.push(`Error al procesar recurso: ${rec.nombre}`)
      }
    }

    return NextResponse.json({
      message: resultados.actualizados > 0
        ? `Importación completada: ${resultados.actualizados} actualizado(s)`
        : 'Importación completada: sin cambios',
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
