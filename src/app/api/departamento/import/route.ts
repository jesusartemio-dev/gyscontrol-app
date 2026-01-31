import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface DepartamentoImportado {
  nombre: string
  descripcion?: string
  activo: boolean
}

export async function POST(request: Request) {
  try {
    const { departamentos } = await request.json() as { departamentos: DepartamentoImportado[] }

    if (!Array.isArray(departamentos) || departamentos.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron departamentos para importar' },
        { status: 400 }
      )
    }

    const resultados = {
      creados: 0,
      errores: [] as string[]
    }

    for (const depto of departamentos) {
      try {
        // Validar nombre requerido
        if (!depto.nombre || depto.nombre.trim() === '') {
          resultados.errores.push('Departamento sin nombre')
          continue
        }

        // Verificar si ya existe
        const existe = await prisma.departamento.findFirst({
          where: {
            nombre: {
              equals: depto.nombre,
              mode: 'insensitive'
            }
          }
        })

        if (existe) {
          resultados.errores.push(`Departamento "${depto.nombre}" ya existe`)
          continue
        }

        // Crear el departamento
        await prisma.departamento.create({
          data: {
            nombre: depto.nombre.trim(),
            descripcion: depto.descripcion?.trim() || null,
            activo: depto.activo ?? true
          }
        })

        resultados.creados++
      } catch (error) {
        console.error(`Error al crear departamento ${depto.nombre}:`, error)
        resultados.errores.push(`Error al crear "${depto.nombre}"`)
      }
    }

    return NextResponse.json({
      message: `Importación completada: ${resultados.creados} departamentos creados`,
      creados: resultados.creados,
      total: departamentos.length,
      errores: resultados.errores.length > 0 ? resultados.errores : undefined
    })
  } catch (error) {
    console.error('❌ Error en POST /departamento/import:', error)
    return NextResponse.json(
      { error: 'Error al procesar la importación' },
      { status: 500 }
    )
  }
}
