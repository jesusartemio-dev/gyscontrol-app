import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface CargoImportado {
  nombre: string
  descripcion?: string
  sueldoBase?: number
  activo: boolean
}

export async function POST(request: Request) {
  try {
    const { cargos } = await request.json() as { cargos: CargoImportado[] }

    if (!Array.isArray(cargos) || cargos.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron cargos para importar' },
        { status: 400 }
      )
    }

    const resultados = {
      creados: 0,
      errores: [] as string[]
    }

    for (const cargo of cargos) {
      try {
        // Validar nombre requerido
        if (!cargo.nombre || cargo.nombre.trim() === '') {
          resultados.errores.push('Cargo sin nombre')
          continue
        }

        // Verificar si ya existe
        const existe = await prisma.cargo.findFirst({
          where: {
            nombre: {
              equals: cargo.nombre,
              mode: 'insensitive'
            }
          }
        })

        if (existe) {
          resultados.errores.push(`Cargo "${cargo.nombre}" ya existe`)
          continue
        }

        // Crear el cargo
        await prisma.cargo.create({
          data: {
            nombre: cargo.nombre.trim(),
            descripcion: cargo.descripcion?.trim() || null,
            sueldoBase: cargo.sueldoBase || null,
            activo: cargo.activo ?? true
          }
        })

        resultados.creados++
      } catch (error) {
        console.error(`Error al crear cargo ${cargo.nombre}:`, error)
        resultados.errores.push(`Error al crear "${cargo.nombre}"`)
      }
    }

    return NextResponse.json({
      message: `Importación completada: ${resultados.creados} cargos creados`,
      creados: resultados.creados,
      total: cargos.length,
      errores: resultados.errores.length > 0 ? resultados.errores : undefined
    })
  } catch (error) {
    console.error('❌ Error en POST /cargo/import:', error)
    return NextResponse.json(
      { error: 'Error al procesar la importación' },
      { status: 500 }
    )
  }
}
